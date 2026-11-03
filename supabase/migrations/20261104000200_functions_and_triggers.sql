create function public.current_workspace_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace_id from public.profiles where id = auth.uid()
$$;

revoke execute on function public.current_workspace_id() from public, anon;
grant execute on function public.current_workspace_id() to authenticated;

-- Joining an existing workspace is only possible through app_metadata, which clients
-- cannot set at sign-up. user_metadata is client-controlled and is used for the name only.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_name text;
  target_workspace uuid;
begin
  member_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    80
  );

  target_workspace := nullif(new.raw_app_meta_data ->> 'workspace_id', '')::uuid;

  if target_workspace is null then
    insert into public.workspaces (name)
    values (left(member_name || '''s workspace', 80))
    returning id into target_workspace;
  end if;

  insert into public.profiles (id, workspace_id, display_name, email)
  values (new.id, target_workspace, member_name, coalesce(new.email, ''));

  insert into public.saved_views (workspace_id, user_id, name, query)
  values
    (target_workspace, new.id, 'My open requests', 'status=open&assignee=me'),
    (target_workspace, new.id, 'High priority', 'status=open&priority=high'),
    (target_workspace, new.id, 'Waiting for client', 'status=blocked&reason=waiting_for_client'),
    (target_workspace, new.id, 'Overdue', 'due=overdue');

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keeps derived columns consistent no matter which client writes the row. A request
-- always inherits its project's client, and leaving Blocked clears the reason.
create function public.prepare_request()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  project_client uuid;
begin
  if new.project_id is not null then
    select client_id into project_client from public.projects where id = new.project_id;
    if project_client is not null then
      new.client_id := project_client;
    end if;
  end if;

  if new.status <> 'blocked' then
    new.blocked_reason := null;
    new.blocked_note := null;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();
    if new.status is distinct from old.status then
      new.status_changed_at := now();
    end if;
  end if;

  return new;
end;
$$;

create trigger requests_prepare
  before insert or update on public.requests
  for each row execute function public.prepare_request();

-- The two helpers below run as the table owner and must not be callable through the API.
create function public.record_activity(
  p_workspace_id uuid,
  p_request_id uuid,
  p_request_title text,
  p_actor_id uuid,
  p_type public.activity_type,
  p_metadata jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.activity_events (
    workspace_id, request_id, request_title, actor_id, type, metadata
  )
  values (p_workspace_id, p_request_id, p_request_title, p_actor_id, p_type, p_metadata)
$$;

create function public.notify_user(
  p_workspace_id uuid,
  p_user_id uuid,
  p_type public.notification_type,
  p_request_id uuid,
  p_actor_id uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (workspace_id, user_id, type, request_id, actor_id)
  values (p_workspace_id, p_user_id, p_type, p_request_id, p_actor_id)
$$;

revoke execute on function public.record_activity(uuid, uuid, text, uuid, public.activity_type, jsonb)
  from public, anon, authenticated;
revoke execute on function public.notify_user(
  uuid, uuid, public.notification_type, uuid, uuid
) from public, anon, authenticated;

-- Changes made without a signed-in user (the seed script, maintenance work) are not
-- recorded: there is no actor to attribute them to.
create function public.log_request_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  previous_assignee text;
  next_assignee text;
begin
  if actor is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'request_created',
      jsonb_build_object('status', new.status, 'priority', new.priority)
    );
    if new.assignee_id is not null and new.assignee_id <> actor then
      perform public.notify_user(new.workspace_id, new.assignee_id, 'request_assigned', new.id, actor);
    end if;
    return null;
  end if;

  if tg_op = 'DELETE' then
    perform public.record_activity(
      old.workspace_id, null, old.title, actor, 'request_deleted', '{}'::jsonb
    );
    return null;
  end if;

  if new.status is distinct from old.status then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'status_changed',
      jsonb_build_object(
        'from', old.status,
        'to', new.status,
        'blocked_reason', new.blocked_reason,
        'blocked_note', new.blocked_note
      )
    );
    if old.status = 'blocked' and new.assignee_id is not null and new.assignee_id <> actor then
      perform public.notify_user(
        new.workspace_id, new.assignee_id, 'request_unblocked', new.id, actor
      );
    end if;
  elsif new.blocked_reason is distinct from old.blocked_reason then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'blocked_reason_changed',
      jsonb_build_object('from', old.blocked_reason, 'to', new.blocked_reason)
    );
  end if;

  if new.assignee_id is distinct from old.assignee_id then
    select display_name into previous_assignee from public.profiles where id = old.assignee_id;
    select display_name into next_assignee from public.profiles where id = new.assignee_id;
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'assignee_changed',
      jsonb_build_object('from', previous_assignee, 'to', next_assignee)
    );
    if new.assignee_id is not null and new.assignee_id <> actor then
      perform public.notify_user(
        new.workspace_id, new.assignee_id, 'request_assigned', new.id, actor
      );
    end if;
  end if;

  if new.priority is distinct from old.priority then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'priority_changed',
      jsonb_build_object('from', old.priority, 'to', new.priority)
    );
  end if;

  if new.due_date is distinct from old.due_date then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'due_date_changed',
      jsonb_build_object('from', old.due_date, 'to', new.due_date)
    );
  end if;

  if old.archived_at is null and new.archived_at is not null then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'request_archived', '{}'::jsonb
    );
  elsif old.archived_at is not null and new.archived_at is null then
    perform public.record_activity(
      new.workspace_id, new.id, new.title, actor, 'request_unarchived', '{}'::jsonb
    );
  end if;

  return null;
end;
$$;

revoke execute on function public.log_request_changes() from public, anon, authenticated;

create trigger requests_log_changes
  after insert or update or delete on public.requests
  for each row execute function public.log_request_changes();

create function public.log_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_title text;
  request_assignee uuid;
  request_creator uuid;
  recipient uuid;
begin
  if auth.uid() is null or new.author_id is null then
    return null;
  end if;

  select title, assignee_id, created_by
    into request_title, request_assignee, request_creator
    from public.requests
    where id = new.request_id;

  perform public.record_activity(
    new.workspace_id, new.request_id, request_title, new.author_id, 'comment_added',
    jsonb_build_object('comment_id', new.id)
  );

  for recipient in
    select distinct person
    from unnest(array[request_assignee, request_creator]) as person
    where person is not null and person <> new.author_id
  loop
    perform public.notify_user(
      new.workspace_id, recipient, 'comment_added', new.request_id, new.author_id
    );
  end loop;

  return null;
end;
$$;

revoke execute on function public.log_comment() from public, anon, authenticated;

create trigger comments_log
  after insert on public.comments
  for each row execute function public.log_comment();

-- Runs as the caller, so it can only create notifications for the signed-in user.
create function public.refresh_due_notifications()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  created_count integer;
begin
  insert into public.notifications (workspace_id, user_id, type, request_id, dedupe_key)
  select r.workspace_id, r.assignee_id, 'due_soon'::public.notification_type, r.id, r.due_date::text
  from public.requests r
  join public.workspaces w on w.id = r.workspace_id
  where r.assignee_id = auth.uid()
    and r.status <> 'done'
    and r.archived_at is null
    and r.due_date between current_date and current_date + w.due_window_days
  on conflict do nothing;

  get diagnostics created_count = row_count;
  return created_count;
end;
$$;

revoke execute on function public.refresh_due_notifications() from public, anon;
grant execute on function public.refresh_due_notifications() to authenticated;

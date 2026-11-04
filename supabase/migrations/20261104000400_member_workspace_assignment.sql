-- The auth service creates a user first and applies app_metadata afterwards, so the sign-up
-- trigger can never see a workspace id in it. Every new account therefore starts in its own
-- workspace, and joining another one is an explicit, server-only operation.

create function public.create_default_saved_views(p_workspace_id uuid, p_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.saved_views (workspace_id, user_id, name, query)
  values
    (p_workspace_id, p_user_id, 'My open requests', 'status=open&assignee=me'),
    (p_workspace_id, p_user_id, 'High priority', 'status=open&priority=high'),
    (p_workspace_id, p_user_id, 'Waiting for client', 'status=blocked&reason=waiting_for_client'),
    (p_workspace_id, p_user_id, 'Overdue', 'due=overdue')
$$;

revoke execute on function public.create_default_saved_views(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_name text;
  new_workspace uuid;
begin
  member_name := left(
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Member'
    ),
    80
  );

  insert into public.workspaces (name)
  values (left(member_name || '''s workspace', 80))
  returning id into new_workspace;

  insert into public.profiles (id, workspace_id, display_name, email)
  values (new.id, new_workspace, member_name, coalesce(new.email, ''));

  perform public.create_default_saved_views(new_workspace, new.id);

  return new;
end;
$$;

-- Moves a member who has not created any data yet into an existing workspace. The foreign
-- keys refuse the move when the member already owns requests, comments or notifications.
create function public.add_member_to_workspace(p_user_id uuid, p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_workspace uuid;
begin
  select workspace_id into previous_workspace from public.profiles where id = p_user_id;
  if previous_workspace is null then
    raise exception 'User % has no profile', p_user_id;
  end if;
  if not exists (select 1 from public.workspaces where id = p_workspace_id) then
    raise exception 'Workspace % does not exist', p_workspace_id;
  end if;
  if previous_workspace = p_workspace_id then
    return;
  end if;

  delete from public.saved_views where user_id = p_user_id;
  update public.profiles set workspace_id = p_workspace_id where id = p_user_id;
  perform public.create_default_saved_views(p_workspace_id, p_user_id);

  delete from public.workspaces
  where id = previous_workspace
    and not exists (select 1 from public.profiles where workspace_id = previous_workspace);
end;
$$;

revoke execute on function public.add_member_to_workspace(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.add_member_to_workspace(uuid, uuid) to service_role;

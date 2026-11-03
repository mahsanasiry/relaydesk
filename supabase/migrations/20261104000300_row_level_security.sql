alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.requests enable row level security;
alter table public.request_relations enable row level security;
alter table public.comments enable row level security;
alter table public.activity_events enable row level security;
alter table public.notifications enable row level security;
alter table public.saved_views enable row level security;

-- Privileges are narrowed to what each policy below actually allows, so a missing
-- policy is never the only thing standing between a client and a write.
revoke all on all tables in schema public from anon;
revoke insert, delete on public.workspaces from authenticated;
revoke insert, delete on public.profiles from authenticated;
revoke update, delete on public.comments from authenticated;
revoke insert, update, delete on public.activity_events from authenticated;
revoke delete on public.clients from authenticated;
revoke delete on public.projects from authenticated;
revoke delete on public.notifications from authenticated;

revoke update on public.profiles from authenticated;
grant update (display_name) on public.profiles to authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy workspaces_select on public.workspaces
  for select to authenticated
  using (id = (select public.current_workspace_id()));

create policy workspaces_update on public.workspaces
  for update to authenticated
  using (id = (select public.current_workspace_id()))
  with check (id = (select public.current_workspace_id()));

create policy profiles_select on public.profiles
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy clients_select on public.clients
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy clients_insert on public.clients
  for insert to authenticated
  with check (workspace_id = (select public.current_workspace_id()));

create policy clients_update on public.clients
  for update to authenticated
  using (workspace_id = (select public.current_workspace_id()))
  with check (workspace_id = (select public.current_workspace_id()));

create policy projects_select on public.projects
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy projects_insert on public.projects
  for insert to authenticated
  with check (workspace_id = (select public.current_workspace_id()));

create policy projects_update on public.projects
  for update to authenticated
  using (workspace_id = (select public.current_workspace_id()))
  with check (workspace_id = (select public.current_workspace_id()));

create policy requests_select on public.requests
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy requests_insert on public.requests
  for insert to authenticated
  with check (
    workspace_id = (select public.current_workspace_id())
    and created_by = (select auth.uid())
  );

create policy requests_update on public.requests
  for update to authenticated
  using (workspace_id = (select public.current_workspace_id()))
  with check (workspace_id = (select public.current_workspace_id()));

create policy requests_delete on public.requests
  for delete to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy request_relations_select on public.request_relations
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy request_relations_insert on public.request_relations
  for insert to authenticated
  with check (workspace_id = (select public.current_workspace_id()));

create policy request_relations_delete on public.request_relations
  for delete to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy comments_select on public.comments
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    workspace_id = (select public.current_workspace_id())
    and author_id = (select auth.uid())
  );

create policy activity_events_select on public.activity_events
  for select to authenticated
  using (workspace_id = (select public.current_workspace_id()));

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_insert_own on public.notifications
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and workspace_id = (select public.current_workspace_id())
  );

create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_views_select_own on public.saved_views
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy saved_views_insert_own on public.saved_views
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and workspace_id = (select public.current_workspace_id())
  );

create policy saved_views_update_own on public.saved_views
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy saved_views_delete_own on public.saved_views
  for delete to authenticated
  using (user_id = (select auth.uid()));

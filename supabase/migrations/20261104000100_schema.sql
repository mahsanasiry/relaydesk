-- Requires PostgreSQL 15 or newer: several foreign keys use "on delete set null (column)".

create extension if not exists pg_trgm with schema extensions;

create type public.request_status as enum ('new', 'in_progress', 'waiting', 'blocked', 'done');
create type public.request_priority as enum ('low', 'medium', 'high');
create type public.blocked_reason as enum (
  'waiting_for_client',
  'waiting_for_team_decision',
  'technical_problem',
  'dependency_on_other_work'
);
create type public.project_status as enum ('planned', 'active', 'on_hold', 'completed');
create type public.activity_type as enum (
  'request_created',
  'request_deleted',
  'status_changed',
  'blocked_reason_changed',
  'assignee_changed',
  'priority_changed',
  'due_date_changed',
  'request_archived',
  'request_unarchived',
  'comment_added'
);
create type public.notification_type as enum (
  'request_assigned',
  'comment_added',
  'due_soon',
  'request_unblocked'
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  waiting_threshold_days integer not null default 3
    check (waiting_threshold_days between 1 and 60),
  due_window_days integer not null default 2 check (due_window_days between 1 and 30),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  email text not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create index profiles_workspace_id_idx on public.profiles (workspace_id);

-- Most child tables reference (workspace_id, id) pairs so the database itself rejects
-- links that cross workspaces, independent of row level security.
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  contact_name text not null default '' check (char_length(contact_name) <= 120),
  contact_email text not null default '' check (char_length(contact_email) <= 254),
  contact_phone text not null default '' check (char_length(contact_phone) <= 40),
  notes text not null default '' check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create index clients_workspace_id_idx on public.clients (workspace_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  client_id uuid,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 5000),
  status public.project_status not null default 'planned',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, client_id) references public.clients (workspace_id, id),
  constraint projects_dates_ordered check (
    start_date is null or end_date is null or end_date >= start_date
  )
);

create index projects_workspace_id_idx on public.projects (workspace_id);
create index projects_client_id_idx on public.projects (client_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid,
  client_id uuid,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 10000),
  status public.request_status not null default 'new',
  priority public.request_priority not null default 'medium',
  assignee_id uuid,
  created_by uuid default auth.uid(),
  due_date date,
  labels text[] not null default '{}' check (cardinality(labels) <= 10),
  blocked_reason public.blocked_reason,
  blocked_note text check (blocked_note is null or char_length(blocked_note) <= 1000),
  status_changed_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, project_id) references public.projects (workspace_id, id),
  foreign key (workspace_id, client_id) references public.clients (workspace_id, id),
  foreign key (workspace_id, assignee_id) references public.profiles (workspace_id, id)
    on delete set null (assignee_id),
  foreign key (workspace_id, created_by) references public.profiles (workspace_id, id)
    on delete set null (created_by),
  constraint requests_blocked_reason_required check (
    (status = 'blocked') = (blocked_reason is not null)
  ),
  constraint requests_blocked_note_only_when_blocked check (
    status = 'blocked' or blocked_note is null
  )
);

create index requests_workspace_status_idx on public.requests (workspace_id, status);
create index requests_workspace_assignee_idx on public.requests (workspace_id, assignee_id);
create index requests_workspace_project_idx on public.requests (workspace_id, project_id);
create index requests_workspace_client_idx on public.requests (workspace_id, client_id);
create index requests_workspace_due_date_idx on public.requests (workspace_id, due_date);
create index requests_workspace_updated_idx on public.requests (workspace_id, updated_at desc);
create index requests_title_trgm_idx on public.requests using gin (title extensions.gin_trgm_ops);

-- A link is stored once per pair, ordered by id, and read in both directions.
create table public.request_relations (
  workspace_id uuid not null,
  request_id uuid not null,
  related_request_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (request_id, related_request_id),
  foreign key (workspace_id, request_id) references public.requests (workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, related_request_id) references public.requests (workspace_id, id)
    on delete cascade,
  constraint request_relations_ordered check (request_id < related_request_id)
);

create index request_relations_related_idx on public.request_relations (related_request_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  request_id uuid not null,
  author_id uuid default auth.uid(),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, request_id) references public.requests (workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, author_id) references public.profiles (workspace_id, id)
    on delete set null (author_id)
);

create index comments_request_idx on public.comments (request_id, created_at);

-- request_title is a snapshot so events about deleted requests stay readable.
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  request_id uuid,
  request_title text not null,
  actor_id uuid,
  type public.activity_type not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, request_id) references public.requests (workspace_id, id)
    on delete set null (request_id),
  foreign key (workspace_id, actor_id) references public.profiles (workspace_id, id)
    on delete set null (actor_id)
);

create index activity_events_workspace_created_idx
  on public.activity_events (workspace_id, created_at desc);
create index activity_events_request_created_idx
  on public.activity_events (request_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null,
  type public.notification_type not null,
  request_id uuid not null,
  actor_id uuid,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, user_id) references public.profiles (workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, request_id) references public.requests (workspace_id, id)
    on delete cascade,
  foreign key (workspace_id, actor_id) references public.profiles (workspace_id, id)
    on delete set null (actor_id)
);

create unique index notifications_dedupe_idx
  on public.notifications (user_id, request_id, type, dedupe_key)
  where dedupe_key is not null;
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.saved_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  user_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  query text not null default '' check (char_length(query) <= 1000),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, user_id) references public.profiles (workspace_id, id)
    on delete cascade
);

create unique index saved_views_user_name_idx on public.saved_views (user_id, lower(name));

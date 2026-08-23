-- Enterprise team-management modules. Safe to run repeatedly.
alter table public.team_members add column if not exists phone text;
alter table public.team_members add column if not exists emergency_contact text;
alter table public.team_members add column if not exists joined_at date;
alter table public.team_members add column if not exists language text not null default 'en' check (language in ('en','he'));

drop policy if exists "active members view team directory" on public.team_members;
create policy "active members view team directory" on public.team_members for select to authenticated
using (active and public.current_team_role() is not null);

create table if not exists public.team_projects (
  id uuid primary key default gen_random_uuid(), name text not null, description text, status text not null default 'planning' check(status in ('planning','active','blocked','completed','archived')),
  owner_id uuid references public.team_members(id), subteam text, starts_at date, due_at date, created_by uuid not null references public.team_members(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.team_projects(id) on delete cascade, title text not null, description text,
  status text not null default 'todo' check(status in ('todo','in_progress','blocked','done')), priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
  assignee_id uuid references public.team_members(id), due_at timestamptz, completed_at timestamptz, created_by uuid not null references public.team_members(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.workshop_tools (
  id uuid primary key default gen_random_uuid(), name text not null, category text, asset_tag text unique, status text not null default 'available' check(status in ('available','maintenance','retired')),
  requires_training boolean not null default false, notes text, created_by uuid references public.team_members(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tool_checkouts (
  id uuid primary key default gen_random_uuid(), tool_id uuid not null references public.workshop_tools(id), member_id uuid not null references public.team_members(id), checked_out_at timestamptz not null default now(), expected_return_at timestamptz, returned_at timestamptz, returned_to uuid references public.team_members(id), condition_out text, condition_in text
);
create unique index if not exists one_open_checkout_per_tool on public.tool_checkouts(tool_id) where returned_at is null;
create table if not exists public.tool_maintenance (
  id uuid primary key default gen_random_uuid(), tool_id uuid not null references public.workshop_tools(id) on delete cascade, description text not null, status text not null default 'open' check(status in ('open','in_progress','resolved')),
  reported_by uuid not null references public.team_members(id), assigned_to uuid references public.team_members(id), resolved_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id), action text not null, entity_type text not null, entity_id text, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

alter table public.team_projects enable row level security; alter table public.project_tasks enable row level security; alter table public.workshop_tools enable row level security; alter table public.tool_checkouts enable row level security; alter table public.tool_maintenance enable row level security; alter table public.audit_log enable row level security;
drop policy if exists "members view projects" on public.team_projects; create policy "members view projects" on public.team_projects for select to authenticated using(public.current_team_role() is not null and status <> 'archived');
drop policy if exists "members create projects" on public.team_projects; create policy "members create projects" on public.team_projects for insert to authenticated with check(public.current_team_role() is not null and created_by=auth.uid());
drop policy if exists "owners manage projects" on public.team_projects; create policy "owners manage projects" on public.team_projects for update to authenticated using(owner_id=auth.uid() or public.is_admin()) with check(owner_id=auth.uid() or public.is_admin());
drop policy if exists "members view tasks" on public.project_tasks; create policy "members view tasks" on public.project_tasks for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "members create tasks" on public.project_tasks; create policy "members create tasks" on public.project_tasks for insert to authenticated with check(public.current_team_role() is not null and created_by=auth.uid());
drop policy if exists "members update tasks" on public.project_tasks; create policy "members update tasks" on public.project_tasks for update to authenticated using(assignee_id=auth.uid() or created_by=auth.uid() or public.is_admin());
drop policy if exists "members view tools" on public.workshop_tools; create policy "members view tools" on public.workshop_tools for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "admins manage tools" on public.workshop_tools; create policy "admins manage tools" on public.workshop_tools for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "members view checkouts" on public.tool_checkouts; create policy "members view checkouts" on public.tool_checkouts for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "members checkout tools" on public.tool_checkouts; create policy "members checkout tools" on public.tool_checkouts for insert to authenticated with check(member_id=auth.uid() and public.current_team_role() is not null);
drop policy if exists "members return tools" on public.tool_checkouts; create policy "members return tools" on public.tool_checkouts for update to authenticated using(member_id=auth.uid() or public.is_admin());
drop policy if exists "members view maintenance" on public.tool_maintenance; create policy "members view maintenance" on public.tool_maintenance for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "members report maintenance" on public.tool_maintenance; create policy "members report maintenance" on public.tool_maintenance for insert to authenticated with check(reported_by=auth.uid());
drop policy if exists "admins view audit" on public.audit_log; create policy "admins view audit" on public.audit_log for select to authenticated using(public.is_admin());

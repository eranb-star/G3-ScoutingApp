-- G3 Team Hub authentication and authorization foundation.
-- Run once in the Supabase SQL editor. It is safe to run again.

create table if not exists public.team_members (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null default 'member' check (role in ('member', 'mentor', 'admin')),
  subteam text,
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_role_idx on public.team_members(role);
create index if not exists team_members_active_idx on public.team_members(active);
alter table public.team_members enable row level security;

create or replace function public.current_team_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.team_members where id = auth.uid() and active = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_team_role() = 'admin', false);
$$;

create or replace function public.complete_first_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.team_members
  set must_change_password = false, updated_at = now()
  where id = auth.uid() and active = true;
  if not found then raise exception 'Active G3 member profile not found'; end if;
end;
$$;

grant execute on function public.current_team_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.complete_first_login() to authenticated;

drop policy if exists "members read own profile" on public.team_members;
create policy "members read own profile"
on public.team_members for select to authenticated
using (id = auth.uid());

drop policy if exists "admins read all members" on public.team_members;
create policy "admins read all members"
on public.team_members for select to authenticated
using (public.is_admin());

-- All creation, role changes, resets and deactivation happen in the admin Edge
-- Function. The browser never receives the service-role key.

-- Bootstrap the first administrator after creating that user in Authentication:
-- insert into public.team_members (id, email, display_name, role, must_change_password)
-- select id, email, 'G3 Administrator', 'admin', true
-- from auth.users where lower(email) = lower('YOUR_ADMIN_EMAIL');


begin;

create table if not exists public.channel_read_state (
  member_id uuid not null references public.team_members(id) on delete cascade,
  channel_id uuid not null references public.team_channels(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (member_id, channel_id)
);

alter table public.channel_read_state enable row level security;
drop policy if exists "members read own channel state" on public.channel_read_state;
create policy "members read own channel state" on public.channel_read_state for select to authenticated using (member_id=auth.uid());
drop policy if exists "members manage own channel state" on public.channel_read_state;
create policy "members manage own channel state" on public.channel_read_state for all to authenticated using (member_id=auth.uid()) with check (member_id=auth.uid());

create index if not exists channel_read_state_member_idx on public.channel_read_state(member_id,last_read_at);

create table if not exists public.frc_operational_items (
  id uuid primary key default gen_random_uuid(),
  area text not null check(area in ('readiness','purchasing','decisions','training','packing','assignments')),
  title text not null,
  details text,
  status text not null default 'open' check(status in ('open','in_progress','blocked','done')),
  owner_id uuid references public.team_members(id) on delete set null,
  due_at date,
  created_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.frc_operational_items enable row level security;
drop policy if exists "members view frc operations" on public.frc_operational_items;
create policy "members view frc operations" on public.frc_operational_items for select to authenticated using (public.current_team_role() is not null and (not archived or public.is_admin()));
drop policy if exists "members create frc operations" on public.frc_operational_items;
create policy "members create frc operations" on public.frc_operational_items for insert to authenticated with check (created_by=auth.uid() and public.current_team_role() is not null);
drop policy if exists "owners manage frc operations" on public.frc_operational_items;
create policy "owners manage frc operations" on public.frc_operational_items for update to authenticated using (owner_id=auth.uid() or created_by=auth.uid() or public.is_admin()) with check (owner_id=auth.uid() or created_by=auth.uid() or public.is_admin());
drop policy if exists "admins delete frc operations" on public.frc_operational_items;
create policy "admins delete frc operations" on public.frc_operational_items for delete to authenticated using (public.is_admin());
create index if not exists frc_operational_items_area_status_idx on public.frc_operational_items(area,status,due_at);

commit;

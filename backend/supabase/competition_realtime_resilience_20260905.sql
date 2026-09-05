begin;

create table if not exists public.competition_command_state(
  event_id uuid primary key references public.events(id) on delete cascade,
  active_match_id uuid references public.matches(id) on delete set null,
  controller_id uuid references public.team_members(id) on delete set null,
  controller_device_id text,
  lease_expires_at timestamptz,
  revision bigint not null default 0,
  schedule_synced_at timestamptz,
  schedule_fingerprint text,
  updated_at timestamptz not null default now()
);

create table if not exists public.competition_device_readiness(
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade default auth.uid(),
  device_id text not null,
  device_label text not null default 'Competition device',
  platform text not null default 'web',
  cached_at timestamptz not null,
  matches_count integer not null default 0,
  status text not null default 'ready' check(status in ('ready','stale','offline')),
  last_seen_at timestamptz not null default now(),
  unique(event_id,device_id)
);

alter table public.competition_command_state enable row level security;
alter table public.competition_device_readiness enable row level security;

drop policy if exists "members read competition command" on public.competition_command_state;
create policy "members read competition command" on public.competition_command_state for select to authenticated using(public.current_team_role() is not null);

drop policy if exists "members read competition readiness" on public.competition_device_readiness;
create policy "members read competition readiness" on public.competition_device_readiness for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "members register own competition device" on public.competition_device_readiness;
create policy "members register own competition device" on public.competition_device_readiness for insert to authenticated with check(member_id=auth.uid());
drop policy if exists "members update own competition device" on public.competition_device_readiness;
create policy "members update own competition device" on public.competition_device_readiness for update to authenticated using(member_id=auth.uid()) with check(member_id=auth.uid());
drop policy if exists "admins delete competition devices" on public.competition_device_readiness;
create policy "admins delete competition devices" on public.competition_device_readiness for delete to authenticated using(public.is_admin());

create or replace function public.can_control_competition(target_event uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(
    select 1 from public.competition_assignments
    where event_id=target_event and member_id=auth.uid() and role='pit_crew' and status in ('assigned','confirmed')
  );
$$;

create or replace function public.claim_competition_controller(target_event uuid,target_device text,target_match uuid default null)
returns boolean language plpgsql security definer set search_path=public as $$
declare affected integer;
begin
  if not public.can_control_competition(target_event) then raise exception 'Competition controller access required'; end if;
  insert into public.competition_command_state(event_id,active_match_id,controller_id,controller_device_id,lease_expires_at,revision,updated_at)
  values(target_event,target_match,auth.uid(),target_device,now()+interval '2 minutes',1,now())
  on conflict(event_id) do update set
    active_match_id=coalesce(competition_command_state.active_match_id,excluded.active_match_id),
    controller_id=excluded.controller_id,controller_device_id=excluded.controller_device_id,
    lease_expires_at=excluded.lease_expires_at,revision=competition_command_state.revision+1,updated_at=now()
  where competition_command_state.lease_expires_at is null or competition_command_state.lease_expires_at<now()
     or competition_command_state.controller_device_id=target_device;
  get diagnostics affected=row_count;
  return affected>0;
end$$;

create or replace function public.set_active_competition_match(target_event uuid,target_device text,target_match uuid)
returns bigint language plpgsql security definer set search_path=public as $$
declare next_revision bigint;
begin
  if not exists(select 1 from public.matches where id=target_match and event_id=target_event) then raise exception 'Match does not belong to this event'; end if;
  update public.competition_command_state set active_match_id=target_match,lease_expires_at=now()+interval '2 minutes',revision=revision+1,updated_at=now()
  where event_id=target_event and controller_id=auth.uid() and controller_device_id=target_device and lease_expires_at>now()
  returning revision into next_revision;
  if next_revision is null then raise exception 'Controller lease is not active'; end if;
  return next_revision;
end$$;

create or replace function public.release_competition_controller(target_event uuid,target_device text)
returns void language sql security definer set search_path=public as $$
  update public.competition_command_state set controller_id=null,controller_device_id=null,lease_expires_at=null,updated_at=now()
  where event_id=target_event and controller_id=auth.uid() and controller_device_id=target_device;
$$;

grant execute on function public.can_control_competition(uuid) to authenticated;
grant execute on function public.claim_competition_controller(uuid,text,uuid) to authenticated;
grant execute on function public.set_active_competition_match(uuid,text,uuid) to authenticated;
grant execute on function public.release_competition_controller(uuid,text) to authenticated;

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='competition_command_state') then
    alter publication supabase_realtime add table public.competition_command_state;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='competition_device_readiness') then
    alter publication supabase_realtime add table public.competition_device_readiness;
  end if;
end $$;

commit;

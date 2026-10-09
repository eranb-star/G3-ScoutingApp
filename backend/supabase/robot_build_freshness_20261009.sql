-- Source checks are advisory and never replace released work or imported evidence.
begin;
create table if not exists public.robot_build_source_checks(
 bom_id uuid primary key references public.robot_build_boms(id) on delete cascade,
 checked_at timestamptz,attempted_at timestamptz not null default now(),
 pinned_microversion text,current_microversion text,reference_type text,
 error text,checking_until timestamptz,request_id uuid
);
alter table public.robot_build_source_checks enable row level security;
revoke all on public.robot_build_source_checks from public,anon,authenticated;
grant select on public.robot_build_source_checks to authenticated;
grant select,insert,update on public.robot_build_source_checks to service_role;
drop policy if exists build_source_check_read on public.robot_build_source_checks;
create policy build_source_check_read on public.robot_build_source_checks for select to authenticated using(exists(select 1 from public.robot_build_boms b where b.id=bom_id));
create or replace function public.claim_robot_build_source_check(p_actor uuid,p_bom uuid,p_request uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_request is null or not exists(select 1 from public.team_members where id=p_actor and active and role='admin')
 or not exists(select 1 from public.robot_build_boms b join public.cad_snapshots s on s.id=b.snapshot_id join public.cad_sources src on src.id=s.source_id join public.cad_connections c on c.id=src.connection_id where b.id=p_bom and b.owner_id=p_actor and c.member_id=p_actor and c.disconnected_at is null and src.archived_at is null) then raise exception 'Current source owner connection required';end if;
 insert into public.robot_build_source_checks(bom_id,attempted_at)values(p_bom,'epoch')on conflict do nothing;
 update public.robot_build_source_checks set attempted_at=now(),checking_until=now()+interval '45 seconds',request_id=p_request
 where bom_id=p_bom and (checking_until is null or checking_until<now()) and attempted_at<now()-interval '30 seconds';
 return found;
end$$;
revoke all on function public.claim_robot_build_source_check(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_robot_build_source_check(uuid,uuid,uuid) to service_role;
commit;

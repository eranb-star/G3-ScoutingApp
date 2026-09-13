begin;
create table if not exists public.project_engineering_conflict_audit(
 id bigint generated always as identity primary key,
 source_id uuid not null references public.project_engineering_records(id) on delete restrict,
 target_id uuid not null references public.project_engineering_records(id) on delete restrict,
 source_revision integer not null,target_revision integer not null,
 action text not null check(action in ('resolved','reopened')),
 reason text not null,actor_id uuid not null,created_at timestamptz not null default now()
);
alter table public.project_engineering_conflict_audit enable row level security;
drop policy if exists engineering_conflict_audit_read on public.project_engineering_conflict_audit;
create policy engineering_conflict_audit_read on public.project_engineering_conflict_audit for select to authenticated using(
 exists(select 1 from public.project_engineering_records where id=source_id) and exists(select 1 from public.project_engineering_records where id=target_id));
revoke all on public.project_engineering_conflict_audit from public,anon,authenticated;
grant select on public.project_engineering_conflict_audit to authenticated;
create or replace function public.reopen_revised_engineering_conflicts() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.current_revision=old.current_revision then return new;end if;
 insert into public.project_engineering_conflict_audit(source_id,target_id,source_revision,target_revision,action,reason,actor_id)
 select l.source_id,l.target_id,s.current_revision,t.current_revision,'reopened','A participating engineering record was revised',auth.uid()
 from public.project_engineering_links l join public.project_engineering_records s on s.id=l.source_id join public.project_engineering_records t on t.id=l.target_id
 where l.relation='conflicts_with' and l.resolved_at is not null and new.id in (l.source_id,l.target_id);
 update public.project_engineering_links set resolved_at=null,resolved_by=null,resolution=null
 where relation='conflicts_with' and resolved_at is not null and new.id in(source_id,target_id);
 return new;
end $$;
drop trigger if exists reopen_revised_engineering_conflicts on public.project_engineering_records;
create trigger reopen_revised_engineering_conflicts after update of current_revision on public.project_engineering_records for each row execute function public.reopen_revised_engineering_conflicts();
create or replace function public.resolve_engineering_conflict(p_source uuid,p_target uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.project_engineering_records%rowtype; next_revision integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or
 exists(select 1 from unnest(array[p_source,p_target]) x(id) where not exists(
 select 1 from public.project_engineering_records e join public.team_projects p on p.id=e.project_id where e.id=x.id and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam))) then raise exception 'Conflict resolution requires access to both active projects';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'Explain how the conflict was resolved';end if;
 if not exists(select 1 from public.project_engineering_links where source_id=p_source and target_id=p_target and relation='conflicts_with' and resolved_at is null) then raise exception 'No unresolved conflict at this link';end if;
 -- Pin a fresh revision on each side. Resolving a conflict never silently revives a previous approval.
 for r in select * from public.project_engineering_records where id in(p_source,p_target) order by id loop
  next_revision:=r.current_revision+1;
  insert into public.project_engineering_revisions(record_id,revision,content,reason,created_by)
  select r.id,next_revision,jsonb_set(content,'{change_dimension}','"all"'),trim(p_reason),auth.uid() from public.project_engineering_revisions where record_id=r.id and revision=r.current_revision;
  update public.project_engineering_records set current_revision=next_revision where id=r.id;
 end loop;
 update public.project_engineering_links set resolved_by=auth.uid(),resolved_at=now(),resolution=trim(p_reason)
 where source_id=p_source and target_id=p_target and relation='conflicts_with';
 insert into public.project_engineering_conflict_audit(source_id,target_id,source_revision,target_revision,action,reason,actor_id)
 select p_source,p_target,s.current_revision,t.current_revision,'resolved',trim(p_reason),auth.uid() from public.project_engineering_records s,public.project_engineering_records t where s.id=p_source and t.id=p_target;
end $$;
revoke all on function public.resolve_engineering_conflict(uuid,uuid,text) from public,anon;
grant execute on function public.resolve_engineering_conflict(uuid,uuid,text) to authenticated;
commit;

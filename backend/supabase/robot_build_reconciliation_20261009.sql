-- Explicit demand identity before manufacturing or ordering. Existing CAD stays immutable.
begin;
alter table public.robot_build_bom_lines add column if not exists scope_decision text check(scope_decision in ('independent','additional','covered'));
alter table public.robot_build_bom_lines add column if not exists covered_by uuid references public.robot_build_bom_lines(id) on delete restrict;
alter table public.robot_build_bom_lines add column if not exists scope_note text;
alter table public.robot_build_bom_lines add column if not exists scope_peers jsonb not null default '[]';
alter table public.robot_build_bom_lines add column if not exists covered_quantity integer;

create or replace function public.robot_build_overlap_ids(p_line uuid) returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(x.id order by x.id),'[]') from public.robot_build_bom_lines l
 join public.robot_build_boms b on b.id=l.bom_id
 join public.robot_build_boms other on other.project_id=b.project_id
 join public.robot_build_bom_lines x on x.bom_id=other.id and x.id<>l.id
 where l.id=p_line and (
  (l.source_identity->>'documentId' is not null and x.source_identity->>'documentId'=l.source_identity->>'documentId'
   and x.source_identity->>'elementId'=l.source_identity->>'elementId'
   and x.source_identity->>'partId'=l.source_identity->>'partId'
   and coalesce(x.source_identity->>'configuration','')=coalesce(l.source_identity->>'configuration',''))
  or (b.snapshot_id is not null and other.snapshot_id is not null and exists(
   select 1 from public.cad_snapshots a join public.cad_sources sa on sa.id=a.source_id,
   public.cad_snapshots z join public.cad_sources sz on sz.id=z.source_id
   where a.id=b.snapshot_id and z.id=other.snapshot_id and sa.document_id=sz.document_id and sa.element_id=sz.element_id and sa.configuration=sz.configuration
   and l.source_identity->>'partId'=x.source_identity->>'partId'))
  or (b.snapshot_id is not null and other.snapshot_id is not null and exists(
   select 1 from public.cad_snapshots a join public.cad_sources sa on sa.id=a.source_id,
   public.cad_snapshots z join public.cad_sources sz on sz.id=z.source_id
   where a.id=b.snapshot_id and z.id=other.snapshot_id and (
    exists(select 1 from jsonb_array_elements(coalesce(a.evidence#>'{assembly,subAssemblies}','[]')||coalesce(a.evidence#>'{assembly,rootAssembly,instances}','[]')) sub where sub->>'documentId'=sz.document_id and sub->>'elementId'=sz.element_id)
    or exists(select 1 from jsonb_array_elements(coalesce(z.evidence#>'{assembly,subAssemblies}','[]')||coalesce(z.evidence#>'{assembly,rootAssembly,instances}','[]')) sub where sub->>'documentId'=sa.document_id and sub->>'elementId'=sa.element_id)))));
$$;
revoke all on function public.robot_build_overlap_ids(uuid) from public,anon,authenticated;

create or replace function public.robot_build_reconciliation_context(p_bom uuid,p_line uuid default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare result jsonb;b public.robot_build_boms%rowtype;
begin
 select * into b from public.robot_build_boms where id=p_bom;
 if b.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not(b.owner_id=auth.uid() or b.shared_at is not null) or not exists(select 1 from public.team_projects where id=b.project_id and public.has_permission('assign_team_work',subteam)) then raise exception 'Project management access required';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'peers',public.robot_build_overlap_ids(l.id),'decision',l.scope_decision,
 'current',l.scope_decision is not null and l.scope_peers=public.robot_build_overlap_ids(l.id))), '[]') into result from public.robot_build_bom_lines l where l.bom_id=b.id and (p_line is null or l.id=p_line);
 return result;
end$$;
revoke all on function public.robot_build_reconciliation_context(uuid,uuid) from public,anon;
grant execute on function public.robot_build_reconciliation_context(uuid,uuid) to authenticated;

create or replace function public.reconcile_robot_build_line(p_line uuid,p_expected integer,p_decision text,p_target uuid,p_peers jsonb,p_note text)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;t public.robot_build_bom_lines%rowtype;peers jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_bom_lines where id=p_line for update;
 select * into b from public.robot_build_boms where id=l.bom_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not(b.owner_id=auth.uid() or b.shared_at is not null)
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Project management access required';end if;
 if l.revision<>p_expected then raise exception 'Requirement changed. Reload the reconciliation';end if;
 peers:=public.robot_build_overlap_ids(l.id);
 if peers is distinct from p_peers then raise exception 'Another source was imported. Reload and review the overlapping requirements';end if;
 if p_decision is null or p_decision not in ('independent','additional','covered') or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose a demand decision and record its reason';end if;
 if p_decision='independent' and jsonb_array_length(peers)>0 then raise exception 'Overlapping parts require an additional-demand or covered-by decision';end if;
 if p_decision<>'covered' and p_target is not null then raise exception 'A covering requirement applies only to covered demand';end if;
 if p_decision='covered' then
  select * into t from public.robot_build_bom_lines where id=p_target;
  if t.id is null or t.id=l.id or t.covered_by is not null or t.disposition in ('review','exclude') or t.required_quantity<coalesce(l.covered_quantity,l.required_quantity)
   or not exists(select 1 from public.robot_build_boms where id=t.bom_id and project_id=b.project_id and shared_at is not null)
  then raise exception 'Select a reviewed shared requirement with enough quantity in this project';end if;
  if l.job_id is not null or exists(select 1 from public.robot_build_allocations where line_id=l.id and (reserved>0 or issued>0)) or exists(select 1 from public.robot_build_purchases where line_id=l.id) then raise exception 'This requirement already has work or stock history; reconcile that work without discarding it';end if;
 end if;
 update public.robot_build_bom_lines set scope_decision=p_decision,covered_by=p_target,scope_note=trim(p_note),scope_peers=peers,
 covered_quantity=case when p_decision='covered' then coalesce(covered_quantity,required_quantity) else null end,
 disposition=case when p_decision='covered' then 'exclude' else disposition end,
 required_quantity=case when p_decision='covered' then 0 else required_quantity end,revision=revision+1 where id=l.id;
 insert into public.robot_build_bom_audit(bom_id,actor_id,action,detail)values(b.id,auth.uid(),'scope_reconciled',jsonb_build_object('line',l.id,'decision',p_decision,'target',p_target,'peers',peers,'reason',trim(p_note)));
end$$;
revoke all on function public.reconcile_robot_build_line(uuid,integer,text,uuid,jsonb,text) from public,anon;
grant execute on function public.reconcile_robot_build_line(uuid,integer,text,uuid,jsonb,text) to authenticated;

create or replace function public.guard_robot_build_scope() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype; target uuid;
begin
 if tg_table_name='robot_build_bom_lines' then
  if new.job_id is not distinct from old.job_id then return new;end if;target:=new.id;
 elsif tg_table_name='robot_build_allocations' then
  if tg_op='UPDATE' and new.reserved<=old.reserved and new.issued<=old.issued then return new;end if;target:=new.line_id;
 else target:=new.line_id;end if;
 select * into l from public.robot_build_bom_lines where id=target;
 if l.scope_decision is null or l.scope_decision='covered' or l.scope_peers is distinct from public.robot_build_overlap_ids(l.id) then raise exception 'Review demand overlaps and CAD revisions before starting or allocating this requirement';end if;
 return new;
end$$;
drop trigger if exists guard_build_scope_job on public.robot_build_bom_lines;
create trigger guard_build_scope_job before update of job_id on public.robot_build_bom_lines for each row execute function public.guard_robot_build_scope();
drop trigger if exists guard_build_scope_allocation on public.robot_build_allocations;
create trigger guard_build_scope_allocation before insert or update on public.robot_build_allocations for each row execute function public.guard_robot_build_scope();
drop trigger if exists guard_build_scope_purchase on public.robot_build_purchases;
create trigger guard_build_scope_purchase before insert on public.robot_build_purchases for each row execute function public.guard_robot_build_scope();
revoke all on function public.guard_robot_build_scope() from public,anon,authenticated;
create or replace function public.guard_robot_build_project_close() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status in ('archived','completed') and old.status is distinct from new.status and exists(
 select 1 from public.robot_build_boms b join public.robot_build_bom_lines l on l.bom_id=b.id join public.robot_build_allocations a on a.line_id=l.id where b.project_id=new.id and a.reserved>0)
 then raise exception 'Release remaining Robot Build stock reservations before closing this project';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_project_close on public.team_projects;
create trigger guard_robot_build_project_close before update of status on public.team_projects for each row execute function public.guard_robot_build_project_close();
revoke all on function public.guard_robot_build_project_close() from public,anon,authenticated;
create or replace function public.guard_robot_build_covered_demand() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.robot_build_bom_lines where covered_by=old.id and
 (new.covered_by is not null or new.disposition in ('review','exclude') or new.inventory_id is distinct from old.inventory_id or new.required_quantity<coalesce(covered_quantity,design_quantity)))
 then raise exception 'Other requirements rely on this demand. Reconcile those covering decisions before changing its identity or quantity';end if;
 if new.scope_decision='covered' and (new.disposition<>'exclude' or new.required_quantity<>0) then raise exception 'Reconcile this covered requirement before restoring demand';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_covered_demand on public.robot_build_bom_lines;
create trigger guard_robot_build_covered_demand before update on public.robot_build_bom_lines for each row execute function public.guard_robot_build_covered_demand();
revoke all on function public.guard_robot_build_covered_demand() from public,anon,authenticated;
commit;

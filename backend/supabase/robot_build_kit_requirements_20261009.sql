begin;
-- Existing installations retain their recorded scope. New kits must declare demand.
alter table public.robot_build_kits add column if not exists requirements_required boolean not null default false;
alter table public.robot_build_kits alter column requirements_required set default true;
alter table public.robot_build_kit_items add column if not exists line_id uuid references public.robot_build_bom_lines(id);
create table if not exists public.robot_build_kit_requirements(
 kit_id uuid not null references public.robot_build_kits(id),line_id uuid not null references public.robot_build_bom_lines(id),
 quantity integer not null check(quantity>0),line_revision integer not null,identity_snapshot jsonb not null,
 primary key(kit_id,line_id)
);
alter table public.robot_build_kit_requirements enable row level security;
revoke all on public.robot_build_kit_requirements from public,anon,authenticated;
grant select on public.robot_build_kit_requirements to authenticated;
drop policy if exists kit_requirement_read on public.robot_build_kit_requirements;
create policy kit_requirement_read on public.robot_build_kit_requirements for select to authenticated using(exists(select 1 from public.robot_build_kits where id=kit_id));

create or replace function public.set_robot_build_kit_requirement(p_kit uuid,p_line uuid,p_quantity integer,p_expected integer,p_note text,p_request uuid,p_previous_quantity integer default 0)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;l public.robot_build_bom_lines%rowtype;r public.robot_build_kit_requirements%rowtype;e public.robot_build_kit_events%rowtype;total integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project leader required';end if;
 select * into e from public.robot_build_kit_events where id=p_request;
 if e.id is not null then
  if e.kit_id=p_kit and e.action='requirement' and e.quantity=p_quantity and e.expected_revision=p_expected and e.actor_id=auth.uid() and e.note=p_line::text||' | previous='||p_previous_quantity||' | '||trim(p_note) then return;end if;
  raise exception 'Request identity already used';
 end if;
 if not k.requirements_required or k.installed_at is not null or k.retired_at is not null or t.archived or t.status='done'
 or exists(select 1 from public.project_review_gates where task_id=k.task_id and current_submission is not null)
 then raise exception 'Only an open, unsubmitted requirement-based kit can change its plan';end if;
 if p_request is null or p_quantity is null or p_quantity<0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter a quantity and explain the assembly requirement';end if;
 select l1.* into l from public.robot_build_bom_lines l1 join public.robot_build_boms b on b.id=l1.bom_id where l1.id=p_line and b.project_id=t.project_id and b.shared_at is not null;
 if l.id is null or l.revision is distinct from p_expected or l.disposition not in ('make','buy','reuse') or (l.disposition='make' and l.job_id is null) or (l.disposition<>'make' and l.inventory_id is null) then raise exception 'Choose a current reviewed requirement with a manufacturing job or matched stock';end if;
 select * into r from public.robot_build_kit_requirements where kit_id=k.id and line_id=l.id;
 if coalesce(r.quantity,0) is distinct from p_previous_quantity then raise exception 'Kit plan changed. Reload before saving';end if;
 if exists(select 1 from public.robot_build_kit_items where kit_id=k.id and line_id=l.id and quantity>0) then raise exception 'Return this requirement''s kit pieces before changing its planned quantity';end if;
 select coalesce(sum(quantity),0) into total from public.robot_build_kit_requirements where line_id=l.id and kit_id<>k.id;
 if total+p_quantity>l.required_quantity then raise exception 'Assembly destinations exceed the required quantity; review additional demand first';end if;
 if p_quantity=0 then delete from public.robot_build_kit_requirements where kit_id=k.id and line_id=l.id;
 else insert into public.robot_build_kit_requirements(kit_id,line_id,quantity,line_revision,identity_snapshot)
 values(k.id,l.id,p_quantity,l.revision,jsonb_build_object('name',l.name,'source',l.source_identity,'job_id',l.job_id,'inventory_id',l.inventory_id,'disposition',l.disposition))
 on conflict(kit_id,line_id)do update set quantity=excluded.quantity,line_revision=excluded.line_revision,identity_snapshot=excluded.identity_snapshot;end if;
 insert into public.robot_build_kit_events(id,kit_id,action,quantity,expected_revision,actor_id,note)values(p_request,k.id,'requirement',p_quantity,p_expected,auth.uid(),l.id::text||' | previous='||p_previous_quantity||' | '||trim(p_note));
end$$;
revoke all on function public.set_robot_build_kit_requirement(uuid,uuid,integer,integer,text,uuid,integer) from public,anon;
grant execute on function public.set_robot_build_kit_requirement(uuid,uuid,integer,integer,text,uuid,integer) to authenticated;

create or replace function public.guard_kit_requirement_identity()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (new.job_id is distinct from old.job_id or new.inventory_id is distinct from old.inventory_id or new.source_identity is distinct from old.source_identity or new.disposition is distinct from old.disposition or new.required_quantity is distinct from old.required_quantity)
 and exists(select 1 from public.robot_build_kit_requirements where line_id=old.id) then raise exception 'Assembly demand is pinned to this requirement. Reconcile its kit plan before changing identity or quantity';end if;
 return new;
end$$;
drop trigger if exists guard_kit_requirement_identity on public.robot_build_bom_lines;
create trigger guard_kit_requirement_identity before update on public.robot_build_bom_lines for each row execute function public.guard_kit_requirement_identity();

create or replace function public.guard_kit_demand_complete()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if old.requirements_required and not new.requirements_required then raise exception 'Kit requirement checking cannot be disabled';end if;
 if new.requirements_required and old.installed_at is null and new.installed_at is not null then
  if not exists(select 1 from public.robot_build_kit_requirements where kit_id=new.id)
  or exists(select 1 from public.robot_build_kit_requirements r where r.kit_id=new.id and r.quantity<>(select coalesce(sum(i.quantity),0) from public.robot_build_kit_items i where i.kit_id=r.kit_id and i.line_id=r.line_id))
  or exists(select 1 from public.robot_build_kit_items where kit_id=new.id and quantity>0 and line_id is null)
  then raise exception 'Complete every planned assembly requirement before installing this kit';end if;
 end if;return new;
end$$;
drop trigger if exists guard_kit_demand_complete on public.robot_build_kits;
create trigger guard_kit_demand_complete before update on public.robot_build_kits for each row execute function public.guard_kit_demand_complete();
-- Stock already issued into a kit cannot also be returned through the general stock screen.
create or replace function public.guard_kit_allocation_coverage()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.issued<(select coalesce(sum(quantity),0) from public.robot_build_kit_items where line_id=new.line_id) then raise exception 'Return assembly pieces through their kit before returning general issued stock';end if;return new;
end$$;
drop trigger if exists guard_kit_allocation_coverage on public.robot_build_allocations;
create trigger guard_kit_allocation_coverage before update on public.robot_build_allocations for each row execute function public.guard_kit_allocation_coverage();
revoke all on function public.guard_kit_requirement_identity(),public.guard_kit_demand_complete(),public.guard_kit_allocation_coverage() from public,anon,authenticated;
alter table public.robot_build_kit_events add column if not exists line_id uuid references public.robot_build_bom_lines(id);
create or replace function public.move_robot_build_kit_requirement(p_kit uuid,p_batch uuid,p_action text,p_quantity integer,p_expected integer,p_note text,p_request uuid,p_line uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;b public.robot_build_batches%rowtype;j public.robot_build_jobs%rowtype;i public.robot_build_kit_items%rowtype;e public.robot_build_kit_events%rowtype;available integer;delta integer;physical numeric;printing numeric;r public.robot_build_kit_requirements%rowtype;l public.robot_build_bom_lines%rowtype;a public.robot_build_allocations%rowtype;used integer;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into e from public.robot_build_kit_events where id=p_request;
 if e.id is not null then
  if e.kit_id=p_kit and e.batch_id=p_batch and e.action=p_action and e.quantity=p_quantity and e.expected_revision=p_expected and e.actor_id=auth.uid() and e.note=trim(p_note) and e.line_id is not distinct from p_line then return;end if;
  raise exception 'Request identity already used';end if;
 if k.installed_at is not null or k.retired_at is not null or t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('archived','completed')) then raise exception 'Installed or closed kit contents are immutable; create a replacement kit and configuration';end if;
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Reopen installation review before changing submitted kit contents';end if;
 if p_request is null or p_action is null or p_action not in ('issue','return') or p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose issue or return, positive pieces and a traceability note';end if;
 select * into b from public.robot_build_batches where id=p_batch;select * into j from public.robot_build_jobs where id=b.job_id;
 if b.id is null or b.project_id is distinct from t.project_id then raise exception 'Choose an accepted batch from this project';end if;
 select * into i from public.robot_build_kit_items where kit_id=k.id and batch_id=b.id for update;
 if coalesce(i.revision,0)<>p_expected then raise exception 'Kit contents changed. Reload before saving';end if;
 delta:=case when p_action='issue' then p_quantity else -p_quantity end;
 if k.requirements_required then
  select * into r from public.robot_build_kit_requirements where kit_id=k.id and line_id=p_line;
  select * into l from public.robot_build_bom_lines where id=r.line_id;
  if r.line_id is null then raise exception 'Choose the assembly requirement for this batch';end if;
  if (l.disposition='make' and l.job_id is distinct from b.job_id) or (l.disposition in ('buy','reuse') and (l.inventory_id is distinct from b.part_id or b.job_id is not null)) then raise exception 'Batch does not match the exact planned assembly requirement';end if;
  if i.batch_id is not null and i.line_id is distinct from p_line then raise exception 'This batch is assigned to another requirement in this kit';end if;
  select coalesce(sum(quantity),0) into used from public.robot_build_kit_items where kit_id=k.id and line_id=p_line;
  if used+delta>r.quantity then raise exception 'Issue exceeds this assembly destination requirement';end if;
 elsif p_line is not null then raise exception 'Historical kit does not have a requirement plan';end if;
 if coalesce(i.quantity,0)+delta<0 then raise exception 'Return exceeds the quantity in this kit';end if;
 if p_action='issue' then
  if not exists(select 1 from public.project_review_gates where task_id=b.source_task_id and current_submission=b.qc_submission_id and public.project_review_passed(task_id))
   or (b.job_id is not null and not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.project_review_passed(task_id))) then raise exception 'Batch release or QC changed; review before issuing';end if;
  select b.quantity-coalesce(sum(quantity),0) into available from public.robot_build_kit_items where batch_id=b.id;
  if available<p_quantity then raise exception 'This batch does not have enough unallocated pieces';end if;
 end if;
 if k.requirements_required and l.disposition in ('buy','reuse') and p_action='issue' then
  insert into public.robot_build_allocations(line_id,part_id)values(l.id,b.part_id)on conflict do nothing;
  select * into a from public.robot_build_allocations where line_id=l.id for update;
  if a.part_id<>b.part_id or a.issued+p_quantity>l.required_quantity then raise exception 'This demand already has issued supply; return or reconcile it before kitting';end if;
  update public.robot_build_allocations set reserved=greatest(0,reserved-p_quantity),issued=issued+p_quantity,revision=revision+1 where line_id=l.id;
 end if;
 select quantity into physical from public.frc_parts_inventory where id=b.part_id and not archived and unit='pcs' for update;
 select coalesce(sum((x->>'grams')::numeric*f.quantity/1000),0)into printing from public.fundraising_jobs f cross join lateral jsonb_array_elements(f.snapshot->'materials') x where f.status='printing' and x->>'part_id'=b.part_id::text;
 if physical is null or physical-delta<public.robot_build_reserved(b.part_id)+printing then raise exception 'Not enough unreserved physical stock';end if;
 insert into public.robot_build_kit_items(kit_id,batch_id,quantity,line_id)values(k.id,b.id,greatest(delta,0),p_line)
 on conflict(kit_id,batch_id)do update set quantity=robot_build_kit_items.quantity+delta,revision=robot_build_kit_items.revision+1;
 if k.requirements_required and l.disposition in ('buy','reuse') and p_action='return' then
  update public.robot_build_allocations set issued=issued-p_quantity,revision=revision+1 where line_id=l.id;
 end if;
 update public.frc_parts_inventory set quantity=quantity-delta,updated_at=now() where id=b.part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(b.part_id,-delta,case when delta>0 then 'used' else 'returned' end,'Assembly kit '||k.id||': '||trim(p_note),auth.uid());
 insert into public.robot_build_kit_events(id,kit_id,batch_id,action,quantity,expected_revision,actor_id,note,line_id)values(p_request,k.id,b.id,p_action,p_quantity,p_expected,auth.uid(),trim(p_note),p_line);
end$$;


-- Older clients cannot bypass the requirement plan. Historical kits retain their original flow.
create or replace function public.move_robot_build_kit(p_kit uuid,p_batch uuid,p_action text,p_quantity integer,p_expected integer,p_note text,p_request uuid)
returns void language sql security definer set search_path=public,pg_temp as $$
 select public.move_robot_build_kit_requirement(p_kit,p_batch,p_action,p_quantity,p_expected,p_note,p_request,null);
$$;
revoke all on function public.move_robot_build_kit_requirement(uuid,uuid,text,integer,integer,text,uuid,uuid) from public,anon;
grant execute on function public.move_robot_build_kit_requirement(uuid,uuid,text,integer,integer,text,uuid,uuid) to authenticated;
commit;


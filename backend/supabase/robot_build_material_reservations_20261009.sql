-- Extend the shared inventory reservation floor; never create a separate material ledger.
begin;
alter table public.robot_build_materials add column if not exists reserved numeric(14,4) not null default 0;
do $$begin
 if not exists(select 1 from pg_constraint where conrelid='public.robot_build_materials'::regclass and conname='build_material_reserved_limit') then
  alter table public.robot_build_materials add constraint build_material_reserved_limit check(reserved>=0 and consumed+reserved<=planned);
 end if;
end$$;
create table if not exists public.robot_build_material_reservations(
 id uuid primary key,material_id uuid not null references public.robot_build_materials(id),
 actor_id uuid not null references public.team_members(id),expected_revision integer not null,
 amount numeric(14,4) not null check(amount>0),action text not null check(action in ('reserve','release')),
 note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_material_reservations enable row level security;
revoke all on public.robot_build_material_reservations from public,anon,authenticated;
grant select on public.robot_build_material_reservations to authenticated;
drop policy if exists material_reservation_read on public.robot_build_material_reservations;
create policy material_reservation_read on public.robot_build_material_reservations for select to authenticated using(exists(select 1 from public.robot_build_materials where id=material_id));
create or replace function public.robot_build_reserved(p_part uuid)returns numeric language sql stable security definer set search_path=public,pg_temp as $$
 select coalesce((select sum(reserved) from public.robot_build_allocations where part_id=p_part),0)
      + coalesce((select sum(reserved) from public.robot_build_materials where part_id=p_part),0);
$$;
revoke all on function public.robot_build_reserved(uuid) from public,anon,authenticated;

create or replace function public.reserve_robot_build_material(p_material uuid,p_action text,p_amount numeric,p_expected integer,p_note text,p_request uuid)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.robot_build_materials%rowtype;j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;i public.frc_parts_inventory%rowtype;e public.robot_build_material_reservations%rowtype;printing numeric;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into m from public.robot_build_materials where id=p_material for update;
 select * into j from public.robot_build_jobs where id=m.job_id;select * into t from public.project_tasks where id=j.task_id;
 if m.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into e from public.robot_build_material_reservations where id=p_request;
 if e.id is not null then
  if e.material_id=p_material and e.actor_id=auth.uid() and e.action=p_action and e.amount=p_amount and e.expected_revision=p_expected and e.note=trim(p_note) then return p_expected+1;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or p_action is null or p_action not in ('reserve','release') or p_amount is null or p_amount<=0 or p_amount>1000000 or p_amount<>round(p_amount,4) or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose reserve or release, a positive material quantity and a reason';end if;
 if p_expected is null or m.revision<>p_expected then raise exception 'Material plan changed. Reload before saving';end if;
 select * into i from public.frc_parts_inventory where id=m.part_id for update;
 if i.id is null or i.unit<>m.unit then raise exception 'Inventory unit changed; reconcile material first';end if;
 if p_action='reserve' then
  if i.archived or t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('completed','archived')) then raise exception 'Active material and work required';end if;
  if m.reserved+m.consumed+p_amount>m.planned then raise exception 'Reservation exceeds remaining planned material';end if;
  select coalesce(sum((x->>'grams')::numeric*f.quantity/1000),0)into printing from public.fundraising_jobs f cross join lateral jsonb_array_elements(f.snapshot->'materials') x where f.status='printing' and x->>'part_id'=i.id::text;
  if i.quantity-public.robot_build_reserved(i.id)-printing<p_amount then raise exception 'Not enough unreserved stock; other builds or printing already need it';end if;
  update public.robot_build_materials set reserved=reserved+p_amount,revision=revision+1 where id=m.id;
 else
  if p_amount>m.reserved then raise exception 'Release exceeds reserved material';end if;
  update public.robot_build_materials set reserved=reserved-p_amount,revision=revision+1 where id=m.id;
 end if;
 insert into public.robot_build_material_reservations(id,material_id,actor_id,expected_revision,amount,action,note)values(p_request,m.id,auth.uid(),p_expected,p_amount,p_action,trim(p_note));
 return p_expected+1;
end$$;
revoke all on function public.reserve_robot_build_material(uuid,text,numeric,integer,text,uuid) from public,anon;
grant execute on function public.reserve_robot_build_material(uuid,text,numeric,integer,text,uuid) to authenticated;

-- Existing record_robot_build_work follows with one additive reservation-release step.

create or replace function public.record_robot_build_work(p_job uuid,p_action text,p_material uuid,p_amount numeric,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;m public.robot_build_materials%rowtype;i public.frc_parts_inventory%rowtype;e public.robot_build_work_events%rowtype;printing numeric;delta numeric;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into j from public.robot_build_jobs where id=p_job for update;select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not coalesce(t.assignee_id=auth.uid() or exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam)),false) then raise exception 'Assigned worker or project manager required';end if;
 select * into e from public.robot_build_work_events where id=p_request;
 if e.id is not null then
  if e.job_id=p_job and e.actor_id=auth.uid() and e.action=p_action and e.material_id is not distinct from p_material and e.amount=p_amount and e.expected_revision=p_expected and e.note=trim(p_note) then return;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or p_action is null or p_action not in ('consume','return_material','scrap','rework','operation') or p_amount is null or p_amount<=0 or p_amount>1000000 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter a valid activity, positive quantity and evidence note';end if;
 if t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('completed','archived')) then raise exception 'Reopen active work before adding a manufacturing event';end if;
 if not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and enabled and current_submission=j.release_submission_id and public.project_review_passed(task_id)) then raise exception 'Manufacturing release requires review';end if;
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Reopen the inspection checkpoint before changing manufacturing evidence';end if;
 if p_action in ('consume','return_material') then
  if not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('manage_inventory',subteam)) then raise exception 'Inventory management permission required to record material movements';end if;
  select * into m from public.robot_build_materials where id=p_material and job_id=j.id for update;
  if m.id is null or m.revision<>p_expected then raise exception 'Select the current material plan';end if;
  select * into i from public.frc_parts_inventory where id=m.part_id and not archived for update;
  if i.id is null or i.unit<>m.unit then raise exception 'Material inventory or unit changed';end if;
  delta:=case when p_action='consume' then -p_amount else p_amount end;
  if m.consumed-delta<0 or m.consumed-delta>m.planned then raise exception 'Movement exceeds consumed or planned material; revise the plan first';end if;
  if p_action='consume' then update public.robot_build_materials set reserved=greatest(0,reserved-p_amount) where id=m.id;end if;
  select coalesce(sum((x->>'grams')::numeric*f.quantity/1000),0)into printing from public.fundraising_jobs f cross join lateral jsonb_array_elements(f.snapshot->'materials') x where f.status='printing' and x->>'part_id'=i.id::text;
  if i.quantity+delta<public.robot_build_reserved(i.id)+printing then raise exception 'Not enough unreserved material';end if;
  update public.frc_parts_inventory set quantity=quantity+delta,updated_at=now() where id=i.id;
  insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(i.id,delta,case when delta<0 then 'used' else 'returned' end,'Build job '||j.id||': '||trim(p_note),auth.uid());
  update public.robot_build_materials set consumed=consumed-delta,revision=revision+1 where id=m.id;
 else
  if p_material is not null or p_amount<>trunc(p_amount) or j.revision<>p_expected then raise exception 'Use a whole piece count and the current job revision';end if;
  if p_action='scrap' then
   if p_amount>j.completed_quantity then raise exception 'Scrap exceeds reported finished quantity. Report unfinished scrap as an operation note';end if;
   update public.robot_build_jobs set completed_quantity=completed_quantity-p_amount,revision=revision+1 where id=j.id;
  else update public.robot_build_jobs set revision=revision+1 where id=j.id;end if;
 end if;
 insert into public.robot_build_work_events(id,job_id,actor_id,action,material_id,amount,expected_revision,note)values(p_request,j.id,auth.uid(),p_action,p_material,p_amount,p_expected,trim(p_note));
end$$;
create or replace function public.guard_build_material_close() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.status in ('completed','archived') and old.status is distinct from new.status and exists(
 select 1 from public.robot_build_materials m join public.robot_build_jobs j on j.id=m.job_id join public.project_tasks t on t.id=j.task_id where t.project_id=new.id and m.reserved>0)
 then raise exception 'Release remaining raw-material reservations before closing this project';end if;
 return new;
end$$;
drop trigger if exists guard_build_material_close on public.team_projects;
create trigger guard_build_material_close before update of status on public.team_projects for each row execute function public.guard_build_material_close();
create or replace function public.guard_build_material_identity() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (new.unit is distinct from old.unit or (new.archived and not old.archived)) and exists(select 1 from public.robot_build_materials where part_id=old.id and reserved>0)
 then raise exception 'Release raw-material reservations before changing the unit or archiving this item';end if;
 return new;
end$$;
drop trigger if exists guard_build_material_identity on public.frc_parts_inventory;
create trigger guard_build_material_identity before update of unit,archived on public.frc_parts_inventory for each row execute function public.guard_build_material_identity();
revoke all on function public.guard_build_material_close(),public.guard_build_material_identity() from public,anon,authenticated;
commit;

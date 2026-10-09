begin;
create table if not exists public.robot_build_materials(
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.robot_build_jobs(id),
 part_id uuid not null references public.frc_parts_inventory(id),unit text not null,
 planned numeric(14,4) not null check(planned>0),consumed numeric(14,4) not null default 0 check(consumed>=0),
 revision integer not null default 1,note text not null,unique(job_id,part_id)
);
create table if not exists public.robot_build_work_events(
 id uuid primary key,job_id uuid not null references public.robot_build_jobs(id),actor_id uuid not null references public.team_members(id),
 action text not null check(action in ('consume','return_material','scrap','rework','operation')),
 material_id uuid references public.robot_build_materials(id),amount numeric(14,4) not null check(amount>0),
 expected_revision integer not null,note text not null,created_at timestamptz not null default now()
);
create table if not exists public.robot_build_material_audit(
 id bigint generated always as identity primary key,material_id uuid not null references public.robot_build_materials(id),
 actor_id uuid not null references public.team_members(id),previous_quantity numeric,new_quantity numeric not null,
 note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_material_audit enable row level security;
revoke all on public.robot_build_material_audit from public,anon,authenticated;
grant select on public.robot_build_material_audit to authenticated;
drop policy if exists build_material_audit_read on public.robot_build_material_audit;
create policy build_material_audit_read on public.robot_build_material_audit for select to authenticated using(exists(select 1 from public.robot_build_materials where id=material_id));
create table if not exists public.robot_build_batches(
 id uuid primary key,job_id uuid not null unique references public.robot_build_jobs(id),part_id uuid not null references public.frc_parts_inventory(id),
 quantity integer not null check(quantity>0),qc_submission_id uuid not null references public.project_review_submissions(id),
 actor_id uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_batches alter column job_id drop not null;
alter table public.robot_build_batches add column if not exists source_task_id uuid references public.project_tasks(id);
alter table public.robot_build_batches add column if not exists project_id uuid references public.team_projects(id);
alter table public.robot_build_batches add column if not exists origin text not null default 'manufactured' check(origin in ('manufactured','existing_stock'));
update public.robot_build_batches b set source_task_id=j.task_id,project_id=t.project_id from public.robot_build_jobs j join public.project_tasks t on t.id=j.task_id where b.job_id=j.id and b.source_task_id is null;
alter table public.robot_build_materials enable row level security;
alter table public.robot_build_work_events enable row level security;
alter table public.robot_build_batches enable row level security;
revoke all on public.robot_build_materials,public.robot_build_work_events,public.robot_build_batches from public,anon,authenticated;
grant select on public.robot_build_materials,public.robot_build_work_events,public.robot_build_batches to authenticated;
drop policy if exists build_material_read on public.robot_build_materials;
create policy build_material_read on public.robot_build_materials for select to authenticated using(exists(select 1 from public.robot_build_jobs where id=job_id));
drop policy if exists build_work_event_read on public.robot_build_work_events;
create policy build_work_event_read on public.robot_build_work_events for select to authenticated using(exists(select 1 from public.robot_build_jobs where id=job_id));
drop policy if exists build_batch_read on public.robot_build_batches;
create policy build_batch_read on public.robot_build_batches for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.project_tasks where id=source_task_id));

create or replace function public.plan_robot_build_material(p_job uuid,p_part uuid,p_quantity numeric,p_expected integer,p_note text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;i public.frc_parts_inventory%rowtype;m public.robot_build_materials%rowtype;result uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into j from public.robot_build_jobs where id=p_job;select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or t.archived or t.status='done' or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required to plan materials';end if;
 select * into i from public.frc_parts_inventory where id=p_part and not archived;
 if i.id is null or p_quantity is null or p_quantity<=0 or p_quantity>1000000 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose an active material, positive total quantity and planning note';end if;
 select * into m from public.robot_build_materials where job_id=j.id and part_id=i.id for update;
 if coalesce(m.revision,0)<>p_expected then raise exception 'Material plan changed. Reload before saving';end if;
 if m.consumed>p_quantity then raise exception 'Plan cannot be reduced below recorded consumption';end if;
 if m.id is null then
  insert into public.robot_build_materials(job_id,part_id,unit,planned,note)values(j.id,i.id,i.unit,p_quantity,trim(p_note))returning id into result;
 else
  if m.unit<>i.unit then raise exception 'Inventory unit changed; reconcile the material before continuing';end if;
  update public.robot_build_materials set planned=p_quantity,note=trim(p_note),revision=revision+1 where id=m.id;result:=m.id;
 end if;
 insert into public.robot_build_material_audit(material_id,actor_id,previous_quantity,new_quantity,note)values(result,auth.uid(),m.planned,p_quantity,trim(p_note));
 return result;
end$$;

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

create or replace function public.receive_robot_build_batch(p_job uuid,p_part uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;b public.robot_build_batches%rowtype;qc uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into j from public.robot_build_jobs where id=p_job for update;select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into b from public.robot_build_batches where job_id=j.id;
 if b.id is not null then
  if b.part_id=p_part then return b.id;end if;raise exception 'This accepted batch is already mapped to another inventory item';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record the accepted batch storage location and identity';end if;
 if not exists(select 1 from public.frc_parts_inventory where id=p_part and not archived and unit='pcs') then raise exception 'Choose an active finished component measured in pieces';end if;
 select g.current_submission into qc from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission where g.task_id=t.id and g.enabled and g.decision_type='qc_accepted' and s.revision=j.part_revision and public.project_review_passed(t.id);
 if t.status<>'done' or t.archived or qc is null or j.completed_quantity<>j.required_quantity or not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and enabled and current_submission=j.release_submission_id and public.project_review_passed(task_id)) then raise exception 'Current manufacturing release and completed physical QC are required';end if;
 insert into public.robot_build_batches(id,job_id,source_task_id,project_id,part_id,quantity,qc_submission_id,actor_id,note)values(p_request,j.id,t.id,t.project_id,p_part,j.required_quantity,qc,auth.uid(),trim(p_note));
 update public.frc_parts_inventory set quantity=quantity+j.required_quantity,updated_at=now() where id=p_part;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(p_part,j.required_quantity,'received','Accepted build batch '||p_request||': '||trim(p_note),auth.uid());
 return p_request;
end$$;
create or replace function public.reconcile_robot_build_existing_stock(p_task uuid,p_part uuid,p_quantity integer,p_note text,p_request uuid)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.project_tasks%rowtype;qc uuid;b public.robot_build_batches%rowtype;physical numeric;mapped numeric;
begin
 perform pg_advisory_xact_lock(6740,911);select * into t from public.project_tasks where id=p_task;
 if t.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into b from public.robot_build_batches where id=p_request;
 if b.id is not null then
  if b.origin='existing_stock' and b.source_task_id=p_task and b.part_id=p_part and b.quantity=p_quantity and b.actor_id=auth.uid() and b.note=trim(p_note) then return b.id;end if;raise exception 'Request identity already used';end if;
 if p_request is null or p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Record verified pieces, source history and storage location';end if;
 if t.archived or exists(select 1 from public.robot_build_jobs where task_id=t.id) then raise exception 'Use a separate existing-stock inspection task, not a manufacturing job';end if;
 select current_submission into qc from public.project_review_gates where task_id=t.id and enabled and decision_type='qc_accepted' and public.project_review_passed(t.id);
 if qc is null then raise exception 'Existing stock needs current physical QC before it can become an accepted batch';end if;
 select quantity into physical from public.frc_parts_inventory where id=p_part and not archived and unit='pcs' for update;
 select coalesce(sum(x.quantity-coalesce((select sum(ki.quantity) from public.robot_build_kit_items ki where ki.batch_id=x.id),0)),0) into mapped from public.robot_build_batches x where x.part_id=p_part;
 if physical is null or p_quantity>physical-mapped then raise exception 'Verified quantity exceeds physical stock not already represented by accepted batches';end if;
 insert into public.robot_build_batches(id,source_task_id,project_id,part_id,quantity,qc_submission_id,origin,actor_id,note)values(p_request,t.id,t.project_id,p_part,p_quantity,qc,'existing_stock',auth.uid(),trim(p_note));
 return p_request;
end$$;
-- Called only after installation migration creates kit_items; no stock or finance mutation.
revoke all on function public.reconcile_robot_build_existing_stock(uuid,uuid,integer,text,uuid) from public,anon;
grant execute on function public.reconcile_robot_build_existing_stock(uuid,uuid,integer,text,uuid) to authenticated;
revoke all on function public.plan_robot_build_material(uuid,uuid,numeric,integer,text),public.record_robot_build_work(uuid,text,uuid,numeric,integer,text,uuid),public.receive_robot_build_batch(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.plan_robot_build_material(uuid,uuid,numeric,integer,text),public.record_robot_build_work(uuid,text,uuid,numeric,integer,text,uuid),public.receive_robot_build_batch(uuid,uuid,text,uuid) to authenticated;
create or replace function public.guard_robot_build_work_scope() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if exists(select 1 from public.robot_build_bom_lines l where l.job_id=new.job_id and (l.scope_decision is null or l.scope_decision='covered' or l.scope_peers is distinct from public.robot_build_overlap_ids(l.id))) then raise exception 'Review changed CAD demand scope before continuing this job';end if;
 return new;
end$$;
drop trigger if exists build_progress_scope on public.robot_build_progress;
create trigger build_progress_scope before insert on public.robot_build_progress for each row execute function public.guard_robot_build_work_scope();
drop trigger if exists build_activity_scope on public.robot_build_work_events;
create trigger build_activity_scope before insert on public.robot_build_work_events for each row execute function public.guard_robot_build_work_scope();
drop trigger if exists build_batch_scope on public.robot_build_batches;
create trigger build_batch_scope before insert on public.robot_build_batches for each row execute function public.guard_robot_build_work_scope();
revoke all on function public.guard_robot_build_work_scope() from public,anon,authenticated;
commit;

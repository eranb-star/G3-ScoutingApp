-- Partial inspection uses existing task review and stock/installation records.
begin;
create table if not exists public.robot_build_lots(
 id uuid primary key,job_id uuid not null references public.robot_build_jobs(id),
 task_id uuid not null unique references public.project_tasks(id),
 quantity integer not null check(quantity between 1 and 100000),
 status text not null default 'inspection' check(status in ('inspection','rework','held','split','scrapped','accepted')),
 revision integer not null default 1,created_by uuid not null references public.team_members(id),
 request_payload jsonb not null,created_at timestamptz not null default now()
);
create table if not exists public.robot_build_lot_events(
 id uuid primary key,lot_id uuid not null references public.robot_build_lots(id),
 actor_id uuid not null references public.team_members(id),action text not null,
 expected_revision integer not null,note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_lots enable row level security;
alter table public.robot_build_lot_events enable row level security;
revoke all on public.robot_build_lots,public.robot_build_lot_events from public,anon,authenticated;
grant select on public.robot_build_lots,public.robot_build_lot_events to authenticated;
drop policy if exists build_lot_read on public.robot_build_lots;
create policy build_lot_read on public.robot_build_lots for select to authenticated using(
 exists(select 1 from public.robot_build_jobs where id=job_id));
drop policy if exists build_lot_event_read on public.robot_build_lot_events;
create policy build_lot_event_read on public.robot_build_lot_events for select to authenticated using(
 exists(select 1 from public.robot_build_lots where id=lot_id));
alter table public.robot_build_batches add column if not exists lot_id uuid unique references public.robot_build_lots(id);
alter table public.robot_build_batches drop constraint if exists robot_build_batches_job_id_key;
create unique index if not exists build_whole_job_batch on public.robot_build_batches(job_id) where lot_id is null;

create or replace function public.prepare_robot_build_lot(p_job uuid,p_quantity integer,p_reviewer uuid,p_requirements jsonb,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;l public.robot_build_lots%rowtype;payload jsonb;new_task uuid;claimed integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into j from public.robot_build_jobs where id=p_job for update;
 select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required';end if;
 payload:=jsonb_build_object('quantity',p_quantity,'reviewer',p_reviewer,'requirements',p_requirements);
 select * into l from public.robot_build_lots where id=p_request;
 if l.id is not null then
  if l.job_id=j.id and l.created_by=auth.uid() and l.request_payload=payload then return l.id;end if;
  raise exception 'Request identity already used with different values';end if;
 if t.archived or t.status='done' or t.assignee_id is null then raise exception 'Choose active work with an assigned worker';end if;
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Reopen the whole-job inspection before introducing partial lots';end if;
 if exists(select 1 from public.robot_build_batches where job_id=j.id and lot_id is null) then raise exception 'This job already has a whole-job accepted batch';end if;
 if p_request is null or p_quantity is null or p_quantity<1 or p_quantity>100000 or p_reviewer is null or p_reviewer=t.assignee_id then raise exception 'Enter pieces and an independent reviewer';end if;
 if not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.project_review_passed(task_id)) then raise exception 'Manufacturing release needs review';end if;
 select coalesce(sum(quantity),0) into claimed from public.robot_build_lots where job_id=j.id and status not in ('scrapped','split');
 if claimed+p_quantity>j.completed_quantity then raise exception 'Lot exceeds reported pieces not already in inspection, rework or accepted lots';end if;
 insert into public.project_tasks(project_id,title,assignee_id,created_by)
 values(t.project_id,j.part_name||' · '||p_quantity||' pcs · lot '||left(p_request::text,8),t.assignee_id,auth.uid()) returning id into new_task;
 perform public.configure_engineering_requirements(new_task,p_reviewer,p_requirements,'Inspect this exact lot: '||p_request||'; quantity '||p_quantity);
 perform public.configure_project_review_stage(new_task,'qc_accepted','Physical acceptance of this lot only');
 insert into public.robot_build_lots(id,job_id,task_id,quantity,created_by,request_payload)
 values(p_request,j.id,new_task,p_quantity,auth.uid(),payload);
 return p_request;
end$$;

create or replace function public.record_robot_build_lot(p_lot uuid,p_action text,p_expected integer,p_note text,p_request uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_lots%rowtype;j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;e public.robot_build_lot_events%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_lots where id=p_lot for update;
 select * into j from public.robot_build_jobs where id=l.job_id for update;
 select * into t from public.project_tasks where id=j.task_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required';end if;
 select * into e from public.robot_build_lot_events where id=p_request;
 if e.id is not null then
  if e.lot_id=l.id and e.actor_id=auth.uid() and e.action=p_action and e.expected_revision=p_expected and e.note=trim(p_note) then return;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or p_action is null or p_action not in ('rework','inspection','hold','scrap') or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose an action and record the reason';end if;
 if l.revision<>p_expected then raise exception 'Lot changed. Reload before continuing';end if;
 if l.status in ('accepted','scrapped','split') or t.archived or t.status='done' then raise exception 'Accepted, scrapped or closed lot is immutable';end if;
 if p_action='inspection' and l.status not in ('rework','held') then raise exception 'Only reworked or held pieces can return to inspection';end if;
 if p_action='hold' and l.status not in ('inspection','rework') then raise exception 'Only active pieces can be held';end if;
 if p_action='rework' and l.status<>'inspection' then raise exception 'Only an inspection lot can enter rework';end if;
 if exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission where g.task_id=l.task_id and s.status in ('pending','approved','overridden')) then raise exception 'Have the reviewer request changes or reopen the checkpoint before changing this lot';end if;
 update public.robot_build_lots set status=case when p_action='scrap' then 'scrapped' when p_action='hold' then 'held' else p_action end,revision=revision+1 where id=l.id;
 if p_action='scrap' then
  perform public.record_robot_build_work(j.id,'scrap',null,l.quantity,j.revision,p_note,p_request);
 end if;
 insert into public.robot_build_lot_events(id,lot_id,actor_id,action,expected_revision,note)values(p_request,l.id,auth.uid(),p_action,p_expected,trim(p_note));
end$$;

-- A split retains the original lot and its evidence. Children require fresh inspection.
alter table public.robot_build_lots add column if not exists parent_lot_id uuid references public.robot_build_lots(id);
create table if not exists public.robot_build_lot_splits(
 id uuid primary key,lot_id uuid not null references public.robot_build_lots(id),
 first_lot uuid not null references public.robot_build_lots(id),second_lot uuid not null references public.robot_build_lots(id),
 first_quantity integer not null,expected_revision integer not null,
 actor_id uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_lot_splits enable row level security;
revoke all on public.robot_build_lot_splits from public,anon,authenticated;
grant select on public.robot_build_lot_splits to authenticated;
drop policy if exists build_split_read on public.robot_build_lot_splits;
create policy build_split_read on public.robot_build_lot_splits for select to authenticated using(exists(select 1 from public.robot_build_lots where id=lot_id));
create or replace function public.split_robot_build_lot(p_lot uuid,p_quantity integer,p_expected integer,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_lots%rowtype;j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;g public.project_review_gates%rowtype;r public.robot_build_lot_splits%rowtype;a uuid;b uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_lots where id=p_lot for update;
 select * into j from public.robot_build_jobs where id=l.job_id for update;
 select * into t from public.project_tasks where id=j.task_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required';end if;
 select * into r from public.robot_build_lot_splits where id=p_request;
 if r.id is not null then
  if r.lot_id=l.id and r.actor_id=auth.uid() and r.first_quantity=p_quantity and r.expected_revision=p_expected and r.note=trim(p_note) then return r.first_lot;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or p_quantity is null or p_quantity<1 or p_quantity>=l.quantity or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose a smaller positive quantity and explain the split';end if;
 if l.revision<>p_expected then raise exception 'Lot changed. Reload before continuing';end if;
 if l.status not in ('inspection','rework','held') or t.archived or t.status='done' then raise exception 'Only open unreceived lots may be split';end if;
 select * into g from public.project_review_gates where task_id=l.task_id;
 if exists(select 1 from public.project_review_submissions where id=g.current_submission and status in ('pending','approved','overridden')) then raise exception 'Have the reviewer request changes or reopen the checkpoint before splitting';end if;
 update public.robot_build_lots set status='split',revision=revision+1 where id=l.id;
 a:=public.prepare_robot_build_lot(j.id,p_quantity,g.reviewer_id,g.requirements,gen_random_uuid());
 b:=public.prepare_robot_build_lot(j.id,l.quantity-p_quantity,g.reviewer_id,g.requirements,gen_random_uuid());
 update public.robot_build_lots set parent_lot_id=l.id,status=case when l.status='held' then 'held' when l.status='rework' then 'rework' else 'inspection' end where id in (a,b);
 update public.project_tasks set archived=true where id=l.task_id;
 insert into public.robot_build_lot_splits(id,lot_id,first_lot,second_lot,first_quantity,expected_revision,actor_id,note)values(p_request,l.id,a,b,p_quantity,p_expected,auth.uid(),trim(p_note));
 return a;
end$$;
revoke all on function public.split_robot_build_lot(uuid,integer,integer,text,uuid) from public,anon;
grant execute on function public.split_robot_build_lot(uuid,integer,integer,text,uuid) to authenticated;

create or replace function public.receive_robot_build_lot(p_lot uuid,p_part uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_lots%rowtype;j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;b public.robot_build_batches%rowtype;qc uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into l from public.robot_build_lots where id=p_lot for update;
 select * into j from public.robot_build_jobs where id=l.job_id;
 select * into t from public.project_tasks where id=j.task_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Active project and inventory manager required';end if;
 select * into b from public.robot_build_batches where id=p_request;
 if b.id is not null then
  if b.lot_id=l.id and b.part_id=p_part and b.actor_id=auth.uid() and b.note=trim(p_note) then return b.id;end if;
  raise exception 'Request identity already used with different values';end if;
 if exists(select 1 from public.robot_build_batches where lot_id=l.id) then raise exception 'Lot was already received; open its existing batch';end if;
 if p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 or l.status<>'inspection' or t.archived then raise exception 'Choose an inspection lot and record its storage location';end if;
 if not exists(select 1 from public.frc_parts_inventory where id=p_part and not archived and unit='pcs') then raise exception 'Choose an active finished component measured in pieces';end if;
 if exists(select 1 from public.robot_build_batches where job_id=j.id and part_id<>p_part)
 or exists(select 1 from public.robot_build_bom_lines where job_id=j.id and inventory_id is not null and inventory_id<>p_part) then raise exception 'Use the confirmed finished inventory identity for this job';end if;
 select g.current_submission into qc from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission join public.project_tasks lt on lt.id=g.task_id
 where g.task_id=l.task_id and not lt.archived and g.enabled and g.decision_type='qc_accepted' and s.revision=j.part_revision and public.project_review_passed(g.task_id);
 if qc is null or not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.project_review_passed(task_id)) then raise exception 'Current manufacturing release and independent physical lot QC are required';end if;
 insert into public.robot_build_batches(id,job_id,lot_id,source_task_id,project_id,part_id,quantity,qc_submission_id,actor_id,note)
 values(p_request,j.id,l.id,l.task_id,t.project_id,p_part,l.quantity,qc,auth.uid(),trim(p_note));
 update public.frc_parts_inventory set quantity=quantity+l.quantity,updated_at=now() where id=p_part;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(p_part,l.quantity,'received','Accepted inspection lot '||l.id||': '||trim(p_note),auth.uid());
 update public.robot_build_lots set status='accepted',revision=revision+1 where id=l.id;
 return p_request;
end$$;

-- Old clients may use whole-job output only if this job has never used partial lots.
do $$begin
 if to_regprocedure('public.receive_robot_build_batch_legacy(uuid,uuid,text,uuid)') is null then
  alter function public.receive_robot_build_batch(uuid,uuid,text,uuid) rename to receive_robot_build_batch_legacy;
 end if;
end$$;
revoke all on function public.receive_robot_build_batch_legacy(uuid,uuid,text,uuid) from public,anon,authenticated;
create or replace function public.receive_robot_build_batch(p_job uuid,p_part uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if exists(select 1 from public.robot_build_lots where job_id=p_job) then raise exception 'This job uses partial inspection lots. Receive each approved lot separately';end if;
 return public.receive_robot_build_batch_legacy(p_job,p_part,p_note,p_request);
end$$;

create or replace function public.guard_robot_build_lot_progress() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.completed_quantity<(select coalesce(sum(quantity),0) from public.robot_build_lots where job_id=new.id and status<>'scrapped') then raise exception 'Reported progress cannot fall below pieces already assigned to inspection lots';end if;
 return new;
end$$;
drop trigger if exists build_lot_progress on public.robot_build_jobs;
create trigger build_lot_progress before update of completed_quantity on public.robot_build_jobs for each row execute function public.guard_robot_build_lot_progress();
revoke all on function public.guard_robot_build_lot_progress() from public,anon,authenticated;
create or replace function public.guard_robot_build_lot_completion() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;accepted integer;
begin
 if new.status<>'done' then return new;end if;
 select * into j from public.robot_build_jobs where task_id=new.id;
 if j.id is null or not exists(select 1 from public.robot_build_lots where job_id=j.id) then return new;end if;
 select coalesce(sum(b.quantity),0) into accepted from public.robot_build_batches b join public.robot_build_lots l on l.id=b.lot_id
 where l.job_id=j.id and l.status='accepted' and exists(select 1 from public.project_review_gates where task_id=b.source_task_id and current_submission=b.qc_submission_id and public.project_review_passed(task_id));
 if accepted<>j.required_quantity or exists(select 1 from public.robot_build_lots where job_id=j.id and status in ('inspection','rework','held')) then raise exception 'Receive all required independently inspected lots before completing this job';end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_lot_completion on public.project_tasks;
create trigger guard_robot_build_lot_completion before update of status on public.project_tasks for each row execute function public.guard_robot_build_lot_completion();
revoke all on function public.guard_robot_build_lot_completion() from public,anon,authenticated;
revoke all on function public.prepare_robot_build_lot(uuid,integer,uuid,jsonb,uuid),public.record_robot_build_lot(uuid,text,integer,text,uuid),public.receive_robot_build_lot(uuid,uuid,text,uuid),public.receive_robot_build_batch(uuid,uuid,text,uuid) from public,anon;
grant execute on function public.prepare_robot_build_lot(uuid,integer,uuid,jsonb,uuid),public.record_robot_build_lot(uuid,text,integer,text,uuid),public.receive_robot_build_lot(uuid,uuid,text,uuid),public.receive_robot_build_batch(uuid,uuid,text,uuid) to authenticated;
commit;

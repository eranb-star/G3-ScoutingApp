-- Additive grouping of existing manufacturing work; no historical record rewrite.
begin;
create table if not exists public.robot_build_work_packages(
 id uuid primary key, project_id uuid not null references public.team_projects(id),
 bom_id uuid not null references public.robot_build_boms(id), name text not null,
 instructions text not null, acceptance text not null, owner_id uuid references public.team_members(id),
 reviewer_id uuid references public.team_members(id), members uuid[] not null default '{}', due_at timestamptz,
 state text not null default 'draft' check(state in ('draft','assigned')), revision integer not null default 1,
 created_by uuid not null references public.team_members(id), created_at timestamptz not null default now()
);
create table if not exists public.robot_build_work_package_items(
 package_id uuid not null references public.robot_build_work_packages(id), line_id uuid not null references public.robot_build_bom_lines(id),
 preparation_id uuid unique references public.robot_build_preparations(id), primary key(package_id,line_id)
);
create table if not exists public.robot_build_work_package_events(
 id uuid primary key, package_id uuid not null references public.robot_build_work_packages(id),
 actor_id uuid not null references public.team_members(id), payload jsonb not null, created_at timestamptz not null default now()
);
alter table public.robot_build_work_packages enable row level security;
alter table public.robot_build_work_package_items enable row level security;
alter table public.robot_build_work_package_events enable row level security;
revoke all on public.robot_build_work_packages,public.robot_build_work_package_items,public.robot_build_work_package_events from public,anon,authenticated;
grant select on public.robot_build_work_packages,public.robot_build_work_package_items,public.robot_build_work_package_events to authenticated;
drop policy if exists work_package_read on public.robot_build_work_packages;
create policy work_package_read on public.robot_build_work_packages for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.team_projects where id=project_id)
 and (state='assigned' or created_by=auth.uid()));
drop policy if exists work_package_item_read on public.robot_build_work_package_items;
create policy work_package_item_read on public.robot_build_work_package_items for select to authenticated using(exists(select 1 from public.robot_build_work_packages where id=package_id));
drop policy if exists work_package_event_read on public.robot_build_work_package_events;
create policy work_package_event_read on public.robot_build_work_package_events for select to authenticated using(exists(select 1 from public.robot_build_work_packages where id=package_id));

create or replace function public.prepare_robot_build_work_with_checks(p_project uuid,p_line uuid,p_name text,p_revision text,p_instructions text,p_quantity integer,p_owner uuid,p_reviewer uuid,p_requirements jsonb,p_due timestamptz,p_request uuid,p_work_requirements jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.robot_build_preparations%rowtype;payload jsonb;release_id uuid;work_id uuid;l public.robot_build_bom_lines%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required';end if;
 payload:=jsonb_build_object('line',p_line,'name',trim(p_name),'revision',trim(p_revision),'instructions',trim(p_instructions),'quantity',p_quantity,'owner',p_owner,'reviewer',p_reviewer,'requirements',p_requirements,'work_requirements',p_work_requirements,'due',p_due);
 select * into previous from public.robot_build_preparations where id=p_request;
 if previous.id is not null then
  if previous.project_id=p_project and previous.created_by=auth.uid() and previous.request_payload=payload then return previous.id;end if;
  raise exception 'Request identity already used with different values';end if;
 if p_request is null or length(trim(coalesce(p_name,''))) not between 1 and 180 or length(trim(coalesce(p_revision,''))) not between 1 and 120
 or length(trim(coalesce(p_instructions,''))) not between 3 and 8000 or p_quantity is null or p_quantity not between 1 and 100000
 or p_owner is null or p_reviewer is null or p_owner=p_reviewer or not exists(select 1 from public.team_members where id=p_owner and active)
 then raise exception 'Enter part identity, instructions, quantity, an active worker and a different reviewer';end if;
 if p_line is not null then
  select l0.* into l from public.robot_build_bom_lines l0 join public.robot_build_boms b on b.id=l0.bom_id where l0.id=p_line and b.project_id=p_project and b.shared_at is not null;
  if l.id is null or l.disposition<>'make' or l.required_quantity<>p_quantity or l.job_id is not null then raise exception 'Choose a shared reviewed manufacturing requirement with matching quantity and no job';end if;
  if exists(select 1 from public.robot_build_preparations where line_id=p_line) then raise exception 'This requirement already has prepared work. Open its existing preparation';end if;
 end if;
 insert into public.project_tasks(project_id,title,assignee_id,created_by,due_at)
 values(p_project,trim(p_name)||' · release '||trim(p_revision),p_owner,auth.uid(),p_due) returning id into release_id;
 insert into public.project_tasks(project_id,title,assignee_id,created_by,due_at)
 values(p_project,trim(p_name)||' · manufacture & inspect',p_owner,auth.uid(),p_due) returning id into work_id;
 perform public.configure_engineering_requirements(release_id,p_reviewer,p_requirements,'Prepared through Robot Build');
 perform public.configure_project_review_stage(release_id,'released_for_manufacturing','Prepared through Robot Build');
 perform public.configure_engineering_requirements(work_id,p_reviewer,p_work_requirements,'Prepared through Robot Build');
 perform public.configure_project_review_stage(work_id,'qc_accepted','Prepared through Robot Build');
 -- Stage setup labels a new task in_progress; this new manufacturing task has not started.
 update public.project_tasks set status='todo',completed_at=null where id=work_id;
 insert into public.project_task_dependencies(task_id,prerequisite_id)values(work_id,release_id);
 insert into public.robot_build_preparations(id,project_id,release_task_id,work_task_id,line_id,part_name,part_revision,instructions,quantity,request_payload,created_by)
 values(p_request,p_project,release_id,work_id,p_line,trim(p_name),trim(p_revision),trim(p_instructions),p_quantity,payload,auth.uid());
 return p_request;
end$$;
revoke all on function public.prepare_robot_build_work_with_checks(uuid,uuid,text,text,text,integer,uuid,uuid,jsonb,timestamptz,uuid,jsonb) from public,anon,authenticated;

create or replace function public.save_robot_build_work_package(p_id uuid,p_bom uuid,p_name text,p_instructions text,p_acceptance text,p_lines jsonb,p_owner uuid,p_members uuid[],p_reviewer uuid,p_due timestamptz,p_assign boolean,p_expected integer,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare b public.robot_build_boms%rowtype; old public.robot_build_work_packages%rowtype; e public.robot_build_work_package_events%rowtype;
 payload jsonb; x jsonb; l public.robot_build_bom_lines%rowtype; prep uuid; r public.robot_build_preparations%rowtype; members uuid[];
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into b from public.robot_build_boms where id=p_bom;
 if b.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=b.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam))
 or (b.shared_at is null and b.owner_id<>auth.uid()) then raise exception 'Active build leader and accessible parts list required';end if;
 select coalesce(array_agg(distinct m order by m),'{}') into members from unnest(coalesce(p_members,'{}'::uuid[]))m where m is not null and m is distinct from p_owner;
 payload:=jsonb_build_object('bom',p_bom,'name',trim(p_name),'instructions',trim(p_instructions),'acceptance',trim(p_acceptance),'lines',p_lines,'owner',p_owner,'members',members,'reviewer',p_reviewer,'due',p_due,'assign',p_assign,'expected',p_expected);
 select * into e from public.robot_build_work_package_events where id=p_request;
 if found then if e.package_id=p_id and e.actor_id=auth.uid() and e.payload=payload then return p_id;end if;raise exception 'Request already used with different values';end if;
 select * into old from public.robot_build_work_packages where id=p_id for update;
 if p_id is null or p_request is null or p_assign is null or p_expected is null or p_expected<>coalesce(old.revision,0)
 or (old.id is not null and (old.bom_id<>p_bom or old.state<>'draft')) then raise exception 'Work changed. Reload before saving';end if;
 if length(trim(coalesce(p_name,''))) not between 2 and 180 or length(coalesce(p_instructions,''))>8000 or length(coalesce(p_acceptance,''))>600
 or jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) not between 1 and 500
 or (select count(distinct entry->>'id') from jsonb_array_elements(p_lines)entry)<>jsonb_array_length(p_lines) then raise exception 'Enter a name and select distinct parts (maximum 500 per work package)';end if;
 if p_assign and (p_owner is null or p_reviewer is null or p_owner=p_reviewer or p_reviewer=any(members)
 or length(trim(coalesce(p_instructions,'')))<3 or length(trim(coalesce(p_acceptance,'')))<3
 or not exists(select 1 from public.team_members where id=p_owner and active)
 or exists(select 1 from unnest(members)m where not exists(select 1 from public.team_members where id=m and active))) then raise exception 'Choose active students, an independent reviewer, instructions and acceptance criteria';end if;
 -- Sharing is explicit in Save & assign. Draft saves leave existing sharing untouched.
 if p_assign and b.shared_at is null then perform public.share_robot_build_bom(b.id,b.revision);end if;
 insert into public.robot_build_work_packages(id,project_id,bom_id,name,instructions,acceptance,owner_id,reviewer_id,members,due_at,state,created_by)
 values(p_id,b.project_id,p_bom,trim(p_name),trim(p_instructions),trim(p_acceptance),p_owner,p_reviewer,members,p_due,case when p_assign then 'assigned' else 'draft' end,auth.uid())
 on conflict(id)do update set name=excluded.name,instructions=excluded.instructions,acceptance=excluded.acceptance,owner_id=excluded.owner_id,reviewer_id=excluded.reviewer_id,members=excluded.members,due_at=excluded.due_at,state=excluded.state,revision=robot_build_work_packages.revision+1;
 delete from public.robot_build_work_package_items where package_id=p_id;
 for x in select value from jsonb_array_elements(p_lines) loop
  select * into l from public.robot_build_bom_lines where id=(x->>'id')::uuid and bom_id=p_bom for update;
  if l.id is null or l.revision is distinct from (x->>'revision')::integer or l.job_id is not null
  or l.disposition not in ('review','make') or l.required_quantity<1
  or exists(select 1 from public.robot_build_preparations where line_id=l.id) then raise exception 'A selected part changed, is not for manufacturing or already has work. Reload';end if;
  prep:=null;
  if p_assign then
   if l.disposition='review' then perform public.review_robot_build_line(l.id,l.revision,'make',l.required_quantity,null,'Selected for manufacturing: '||trim(p_name));end if;
   prep:=gen_random_uuid();
   perform public.prepare_robot_build_work_with_checks(b.project_id,l.id,l.name,coalesce(nullif(l.source_identity->>'microversion',''),'manual-'||l.revision),trim(p_instructions),l.required_quantity,p_owner,p_reviewer,
    jsonb_build_array(jsonb_build_object('requirement',left(l.name,160),'acceptance',trim(p_acceptance),'method','inspection')),p_due,prep,jsonb_build_array(jsonb_build_object('requirement',left(l.name,160),'acceptance',trim(p_acceptance),'method','test')));
   select * into r from public.robot_build_preparations where id=prep;
   perform public.set_task_collaborators(r.work_task_id,members);
   perform public.set_task_collaborators(r.release_task_id,members);
  end if;
  insert into public.robot_build_work_package_items values(p_id,l.id,prep);
 end loop;
 insert into public.robot_build_work_package_events values(p_request,p_id,auth.uid(),payload,now());
 return p_id;
end$$;
revoke all on function public.save_robot_build_work_package(uuid,uuid,text,text,text,jsonb,uuid,uuid[],uuid,timestamptz,boolean,integer,uuid) from public,anon;
grant execute on function public.save_robot_build_work_package(uuid,uuid,text,text,text,jsonb,uuid,uuid[],uuid,timestamptz,boolean,integer,uuid) to authenticated;

-- Collaborator execution is scoped to new grouped work, not all project tasks.
create or replace function public.robot_build_package_for_task(p_task uuid) returns uuid
language sql stable security definer set search_path=public,pg_temp as $$
 select i.package_id from public.robot_build_work_package_items i
 join public.robot_build_preparations p on p.id=i.preparation_id
 where p.work_task_id=p_task or p.release_task_id=p_task
 or exists(select 1 from public.robot_build_lots lot join public.robot_build_jobs job on job.id=lot.job_id where lot.task_id=p_task and job.task_id=p.work_task_id)
 limit 1
$$;
create or replace function public.robot_build_package_contributor(p_task uuid,p_member uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select p_member=auth.uid() and public.robot_build_package_for_task(p_task) is not null
 and exists(select 1 from public.team_members where id=p_member and active)
 and exists(select 1 from public.project_task_collaborators where task_id=p_task and member_id=p_member)
$$;
revoke all on function public.robot_build_package_for_task(uuid),public.robot_build_package_contributor(uuid,uuid) from public,anon;
grant execute on function public.robot_build_package_for_task(uuid),public.robot_build_package_contributor(uuid,uuid) to authenticated;
create or replace function public.robot_build_package_worker(p_task uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select public.robot_build_package_for_task(p_task) is not null and exists(select 1 from public.team_members where id=auth.uid() and active)
 and exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=p_task and not t.archived and p.status not in ('completed','archived')
 and (t.assignee_id=auth.uid() or public.robot_build_package_contributor(t.id,auth.uid())))
$$;
revoke all on function public.robot_build_package_worker(uuid) from public,anon;
grant execute on function public.robot_build_package_worker(uuid) to authenticated;
do $$ declare d text; n text; replacement text; sig text; begin
 for sig,n,replacement in select * from (values
 ('public.start_robot_build_preparation(uuid)',
  'public.has_permission(''assign_team_work'',subteam)',
  '(public.has_permission(''assign_team_work'',subteam) or public.robot_build_package_worker(p.work_task_id))'),
 ('public.create_robot_build_job(uuid,uuid,uuid,text,text,text,integer)',
  'public.has_permission(''assign_team_work'',p.subteam)',
  '(public.has_permission(''assign_team_work'',p.subteam) or (public.robot_build_package_worker(t.id) and exists(select 1 from public.robot_build_preparations prepared where prepared.work_task_id=t.id and prepared.release_task_id=p_release_task and prepared.part_name=trim(p_name) and prepared.part_revision=trim(p_revision) and prepared.instructions=trim(p_instructions) and prepared.quantity=p_quantity)))'),
 ('public.link_robot_build_line(uuid,integer,uuid)',
  'public.has_permission(''assign_team_work'',subteam)',
  '(public.has_permission(''assign_team_work'',subteam) or (public.robot_build_package_worker(j.task_id) and exists(select 1 from public.robot_build_preparations prepared where prepared.work_task_id=j.task_id and prepared.line_id=l.id)))')
 ) x(signature,needle,new_text) loop
  d:=pg_get_functiondef(sig::regprocedure);
  if position('public.robot_build_package_worker' in d)=0 then
   if (length(d)-length(replace(d,n,'')))/length(n)<>1 then raise exception 'Unexpected work setup definition: %',sig;end if;
   execute replace(d,n,replacement);
  end if;
 end loop;
end$$;
-- Preserve the deployed functions' later safety fixes. Fail closed on unexpected definitions.
do $$ declare sig text; definition text; needle text:='t.assignee_id=auth.uid()'; begin
 foreach sig in array array['public.record_robot_build_progress(uuid,integer,integer,text,uuid)','public.report_robot_build_problem(uuid,text,uuid)','public.submit_project_review(uuid,text,text,text)'] loop
  definition:=pg_get_functiondef(sig::regprocedure);
  if position('public.robot_build_package_contributor(t.id,auth.uid())' in definition)=0 then
   if (length(definition)-length(replace(definition,needle,'')))/length(needle)<>1 then raise exception 'Unexpected authorization definition: %',sig;end if;
   execute replace(definition,needle,'(t.assignee_id=auth.uid() or public.robot_build_package_contributor(t.id,auth.uid()))');
  end if;
 end loop;
end $$;
-- Remember participation even after a leader reassigns work.
create table if not exists public.robot_build_package_participants(
 package_id uuid not null references public.robot_build_work_packages(id),member_id uuid not null references public.team_members(id),primary key(package_id,member_id)
);
alter table public.robot_build_package_participants enable row level security;
revoke all on public.robot_build_package_participants from public,anon,authenticated;
create or replace function public.remember_robot_build_participant() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare task uuid; member uuid; package uuid;
begin
 if tg_table_name='project_tasks' then task:=new.id;member:=new.assignee_id;else task:=new.task_id;member:=new.member_id;end if;
 package:=public.robot_build_package_for_task(task);
 if package is not null and member is not null then insert into public.robot_build_package_participants values(package,member) on conflict do nothing;end if;
 return new;
end$$;
revoke all on function public.remember_robot_build_participant() from public,anon,authenticated;
drop trigger if exists remember_build_owner on public.project_tasks;
create trigger remember_build_owner after update of assignee_id on public.project_tasks for each row execute function public.remember_robot_build_participant();
drop trigger if exists remember_build_contributor on public.project_task_collaborators;
create trigger remember_build_contributor after insert or update of member_id on public.project_task_collaborators for each row execute function public.remember_robot_build_participant();
create or replace function public.guard_robot_build_package_independence() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare package_id uuid; p public.robot_build_work_packages%rowtype; worker uuid;
begin
 package_id:=public.robot_build_package_for_task(new.task_id);
 if package_id is null then return new;end if;
 select * into p from public.robot_build_work_packages where id=package_id;
 select assignee_id into worker from public.project_tasks where id=new.task_id;
 if (new.status in ('approved','overridden') or new.reviewer_decisions->auth.uid()::text->>'decision'='approved') and (auth.uid()=p.owner_id or auth.uid()=worker or auth.uid()=any(p.members)
 or exists(select 1 from public.project_task_collaborators where task_id=new.task_id and member_id=auth.uid()) or exists(select 1 from public.robot_build_package_participants history where history.package_id=p.id and history.member_id=auth.uid())) then
 raise exception 'A work participant cannot approve this work';end if;
 return new;
end$$;
drop trigger if exists guard_work_package_independence on public.project_review_submissions;
create trigger guard_work_package_independence before insert or update of status,reviewer_decisions on public.project_review_submissions for each row execute function public.guard_robot_build_package_independence();
revoke all on function public.guard_robot_build_package_independence() from public,anon,authenticated;

-- Rework is a new inspection attempt, not a fictional new CAD revision.
-- Legacy tasks retain attempt=1 and their previous uniqueness behavior.
alter table public.project_review_submissions add column if not exists build_attempt integer not null default 1 check(build_attempt>0);
do $$ declare c record;begin
 for c in select conname from pg_constraint where conrelid='public.project_review_submissions'::regclass and contype='u' and pg_get_constraintdef(oid)='UNIQUE (task_id, revision)' loop
 execute format('alter table public.project_review_submissions drop constraint %I',c.conname);
 end loop;
end$$;
create unique index if not exists project_review_revision_attempt on public.project_review_submissions(task_id,revision,build_attempt);
create or replace function public.number_robot_build_review_attempt() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if public.robot_build_package_for_task(new.task_id) is not null then
  select coalesce(max(build_attempt),0)+1 into new.build_attempt from public.project_review_submissions where task_id=new.task_id and revision=new.revision;
 else new.build_attempt:=1;end if;
 return new;
end$$;
drop trigger if exists number_build_review_attempt on public.project_review_submissions;
create trigger number_build_review_attempt before insert on public.project_review_submissions for each row execute function public.number_robot_build_review_attempt();
revoke all on function public.number_robot_build_review_attempt() from public,anon,authenticated;

create table if not exists public.robot_build_inspection_contexts(
 submission_id uuid primary key references public.project_review_submissions(id),configuration_id uuid not null references public.project_robot_configurations(id),
 actor_id uuid not null references public.team_members(id),payload jsonb not null,created_at timestamptz not null default now()
);
alter table public.robot_build_inspection_contexts enable row level security;
revoke all on public.robot_build_inspection_contexts from public,anon,authenticated;
grant select on public.robot_build_inspection_contexts to authenticated;
drop policy if exists build_inspection_context_read on public.robot_build_inspection_contexts;
create policy build_inspection_context_read on public.robot_build_inspection_contexts for select to authenticated using(exists(select 1 from public.project_review_submissions where id=submission_id));
create or replace function public.prepare_robot_build_inspection_context(p_submission uuid,p_tag text,p_reference text,p_description text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.project_review_submissions%rowtype; p public.robot_build_work_packages%rowtype; a public.project_physical_assets%rowtype;
 previous public.robot_build_inspection_contexts%rowtype; designed uuid; built uuid; payload jsonb; cfg_name text;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into s from public.project_review_submissions where id=p_submission;
 select * into p from public.robot_build_work_packages where id=public.robot_build_package_for_task(s.task_id);
 if p.id is null or s.decision_type<>'qc_accepted' or s.status<>'pending'
 or not exists(select 1 from public.team_projects where id=p.project_id and status not in ('completed','archived'))
 or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not public.has_permission('decide_engineering_review') or not s.required_reviewers @> jsonb_build_array(auth.uid())
 or auth.uid()=s.submitted_by or auth.uid()=p.owner_id or auth.uid()=any(p.members)
 or not exists(select 1 from public.project_review_gates where current_submission=s.id and enabled) then raise exception 'Current independent assigned inspector required';end if;
 if length(trim(coalesce(p_tag,''))) not between 3 and 120 or length(trim(coalesce(p_reference,''))) not between 3 and 500 or length(trim(coalesce(p_description,''))) not between 3 and 2000 then raise exception 'Identify the physical parts, measurement reference and inspection setup';end if;
 payload:=jsonb_build_object('tag',trim(p_tag),'reference',trim(p_reference),'description',trim(p_description));
 select * into previous from public.robot_build_inspection_contexts where submission_id=s.id;
 if found then if previous.payload=payload then return previous.configuration_id;end if;raise exception 'Inspection identity already recorded. Preserve it and submit corrected evidence';end if;
 select * into a from public.project_physical_assets where project_id=p.project_id and serial=trim(p_tag);
 if a.id is not null and a.asset_kind<>'component' then raise exception 'This tag identifies another asset type. Use the parts batch tag';end if;
 if a.id is null then
  insert into public.project_physical_assets(project_id,serial,name,asset_kind)values(p.project_id,trim(p_tag),left(p.name||' · parts',160),'component')returning * into a;
 end if;
 cfg_name:='Parts inspection '||s.id;
 insert into public.project_robot_configurations(project_id,name,revision,configuration_kind,details,identity_snapshot)
 values(p.project_id,cfg_name||' design',s.revision,'designed',left(s.evidence_items::text,4000),jsonb_build_object('submission_id',s.id))returning id into designed;
 insert into public.project_robot_configurations(project_id,name,revision,configuration_kind,details,identity_snapshot)
 values(p.project_id,cfg_name,s.revision,'as_built',trim(p_description),jsonb_build_object('asset',to_jsonb(a),'parent_configuration_id',designed,'parent_revision',s.revision,'software_reference','Not applicable: mechanical parts inspection','calibration_reference',trim(p_reference),'submission_id',s.id))returning id into built;
 insert into public.robot_build_inspection_contexts values(s.id,built,auth.uid(),payload,now());
 insert into public.project_review_audit(task_id,action,actor_id,note)values(s.task_id,'physical_parts_identified',auth.uid(),built::text||' | '||payload::text);
 return built;
end$$;
revoke all on function public.prepare_robot_build_inspection_context(uuid,text,text,text) from public,anon;
grant execute on function public.prepare_robot_build_inspection_context(uuid,text,text,text) to authenticated;
create or replace function public.robot_build_action_groups() returns table(task_id uuid,package_id uuid,name text,project_id uuid)
language sql stable security invoker set search_path=public,pg_temp as $$
 select tasks.id,p.id,p.name,p.project_id from public.robot_build_work_packages p
 join public.robot_build_work_package_items i on i.package_id=p.id
 join public.robot_build_preparations prepared on prepared.id=i.preparation_id
 cross join lateral (values(prepared.work_task_id),(prepared.release_task_id))tasks(id)
 where p.state='assigned'
$$;
revoke all on function public.robot_build_action_groups() from public,anon;
grant execute on function public.robot_build_action_groups() to authenticated;

create or replace function public.submit_robot_build_package_work(p_job uuid,p_expected integer,p_completed integer,p_note text,p_request uuid,p_expected_submission uuid,p_lot uuid default null) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype; p public.robot_build_work_packages%rowtype; g public.project_review_gates%rowtype;
 release public.project_review_submissions%rowtype; lot public.robot_build_lots%rowtype; e public.robot_build_work_package_events%rowtype;
 payload jsonb; target uuid; claimed integer; result jsonb; submission uuid; lot_id uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into j from public.robot_build_jobs where id=p_job for update;
 select * into p from public.robot_build_work_packages where id=public.robot_build_package_for_task(j.task_id);
 if p.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p.project_id and status not in ('completed','archived') and (public.robot_build_package_worker(j.task_id) or public.has_permission('assign_team_work',subteam))) then raise exception 'Assigned worker or build leader required';end if;
 payload:=jsonb_build_object('job',p_job,'expected',p_expected,'completed',p_completed,'note',trim(p_note),'expected_submission',p_expected_submission,'lot',p_lot);
 select * into e from public.robot_build_work_package_events where id=p_request;
 if found then if e.package_id=p.id and e.actor_id=auth.uid() and e.payload-'result'=payload then return e.payload->'result';end if;raise exception 'Request already used with different values';end if;
 select * into release from public.project_review_submissions where id=j.release_submission_id;
 select * into g from public.project_review_gates where task_id=j.task_id;
 if p_request is null or p_completed is null or p_completed<1 or p_completed>j.required_quantity or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Enter the total ready quantity and a short work report';end if;
 target:=j.task_id;
 if p_lot is not null then
  select * into lot from public.robot_build_lots where id=p_lot and job_id=j.id for update;
  if lot.id is null or lot.status not in ('inspection','rework') then raise exception 'Choose a returned lot from this job';end if;
  target:=lot.task_id;lot_id:=lot.id;
 elsif p_completed<j.required_quantity or (exists(select 1 from public.robot_build_lots where job_id=j.id)
 and not (p_completed=j.required_quantity and (select coalesce(sum(quantity),0) from public.robot_build_lots where job_id=j.id and status='accepted')=j.required_quantity)) then
  if g.current_submission is not null then raise exception 'Whole-job review already exists. Ask the reviewer to resolve it before splitting';end if;
  select coalesce(sum(quantity),0) into claimed from public.robot_build_lots where job_id=j.id and status not in ('scrapped','split');
  if p_completed<=claimed then raise exception 'These pieces already have an inspection. Open the returned lot or report additional pieces';end if;
  lot_id:=p_request;
  insert into public.project_tasks(project_id,title,assignee_id,created_by,due_at)
  select project_id,j.part_name||' · '||(p_completed-claimed)||' pcs',assignee_id,auth.uid(),due_at from public.project_tasks where id=j.task_id returning id into target;
  insert into public.robot_build_lots(id,job_id,task_id,quantity,created_by,request_payload)
  values(lot_id,j.id,target,p_completed-claimed,auth.uid(),jsonb_build_object('quantity',p_completed-claimed,'reviewer',g.reviewer_id,'requirements',g.requirements));
  -- Copy the leader's already configured QC policy; workers cannot choose or weaken it.
  insert into public.project_review_gates select (jsonb_populate_record(null::public.project_review_gates,to_jsonb(g)||jsonb_build_object('task_id',target,'current_submission',null,'created_at',now()))).*;
  insert into public.project_task_collaborators(task_id,member_id,added_by)select target,member_id,added_by from public.project_task_collaborators where task_id=j.task_id;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(target,'package_lot_prepared',auth.uid(),'Inherited QC policy from '||j.task_id);
 end if;
 if (select current_submission from public.project_review_gates where task_id=target) is distinct from p_expected_submission then raise exception 'Inspection changed. Reload before submitting';end if;
 if p_expected_submission is not null and not exists(select 1 from public.project_review_submissions where id=p_expected_submission and status='changes_requested') then raise exception 'This work is already submitted or approved';end if;
 perform public.record_robot_build_progress(j.id,p_expected,p_completed,p_note,p_request);
 if p_lot is not null and lot.status='rework' then
  update public.robot_build_lots set status='inspection',revision=revision+1 where id=lot.id;
  insert into public.robot_build_lot_events(id,lot_id,actor_id,action,expected_revision,note)values(p_request,lot.id,auth.uid(),'inspection',lot.revision,trim(p_note));
 end if;
 perform public.submit_engineering_review(target,j.part_revision,release.evidence_items,p_expected_submission,trim(p_note));
 select current_submission into submission from public.project_review_gates where task_id=target;
 result:=jsonb_build_object('task_id',target,'submission_id',submission,'lot_id',lot_id);
 insert into public.robot_build_work_package_events values(p_request,p.id,auth.uid(),payload||jsonb_build_object('result',result),now());
 return result;
end$$;
revoke all on function public.submit_robot_build_package_work(uuid,integer,integer,text,uuid,uuid,uuid) from public,anon;
grant execute on function public.submit_robot_build_package_work(uuid,integer,integer,text,uuid,uuid,uuid) to authenticated;
-- A returned grouped inspection may be corrected; pending and accepted reports stay frozen.
do $$ declare d text;n text:='where task_id=t.id and current_submission is not null';begin
 d:=pg_get_functiondef('public.record_robot_build_progress(uuid,integer,integer,text,uuid)'::regprocedure);
 if position('grouped_returned' in d)=0 then
  if position(n in d)=0 then raise exception 'Unexpected progress inspection guard';end if;
  execute replace(d,n,n||' and not (public.robot_build_package_for_task(t.id) is not null and exists(select 1 from public.project_review_submissions grouped_returned where grouped_returned.id=current_submission and grouped_returned.status=''changes_requested''))');
 end if;
end$$;
commit;

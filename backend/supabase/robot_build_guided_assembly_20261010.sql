-- Guided assembly and bench-test planning. Existing review/stock RPCs remain authoritative.
begin;
create table if not exists public.robot_build_assembly_plans(
 id uuid primary key,assembly_id uuid not null references public.robot_build_assemblies(id),
 assembly_task_id uuid not null unique references public.project_tasks(id),
 test_task_id uuid not null unique references public.project_tasks(id),
 kit_id uuid not null unique references public.robot_build_kits(id),
 instructions text not null,request_payload jsonb not null,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now()
);
alter table public.robot_build_assembly_plans enable row level security;
revoke all on public.robot_build_assembly_plans from public,anon,authenticated;
grant select on public.robot_build_assembly_plans to authenticated;
drop policy if exists assembly_plan_read on public.robot_build_assembly_plans;
create policy assembly_plan_read on public.robot_build_assembly_plans for select to authenticated using(exists(select 1 from public.robot_build_assemblies where id=assembly_id));
create or replace function public.prepare_robot_build_assembly(p_assembly uuid,p_owner uuid,p_reviewer uuid,p_instructions text,p_assembly_checks jsonb,p_test_checks jsonb,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare a public.robot_build_assemblies%rowtype;previous public.robot_build_assembly_plans%rowtype;payload jsonb;work_id uuid;test_id uuid;kit uuid:=gen_random_uuid();r record;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into a from public.robot_build_assemblies where id=p_assembly for update;
 if a.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=a.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active build leader required';end if;
 payload:=jsonb_build_object('assembly',p_assembly,'owner',p_owner,'reviewer',p_reviewer,'instructions',trim(p_instructions),'assembly_checks',p_assembly_checks,'test_checks',p_test_checks);
 select * into previous from public.robot_build_assembly_plans where id=p_request;
 if found then if previous.created_by=auth.uid() and previous.request_payload=payload then return previous.id;end if;raise exception 'Request already used with different values';end if;
 if p_request is null or p_owner is null or p_owner=p_reviewer or not exists(select 1 from public.team_members where id=p_owner and active) or length(trim(coalesce(p_instructions,''))) not between 3 and 8000 then raise exception 'Choose an active worker, independent reviewer and assembly instructions';end if;
 if not exists(select 1 from jsonb_array_elements(p_assembly_checks)x where x->>'method' in ('test','demonstration')) or not exists(select 1 from jsonb_array_elements(p_test_checks)x where x->>'method' in ('test','demonstration')) then raise exception 'Include a physical test or demonstration in both assembly and bench acceptance';end if;
 if not exists(select 1 from public.robot_build_assembly_requirements where assembly_id=a.id) then raise exception 'Define assembly parts before planning assembly work';end if;
 insert into public.project_tasks(project_id,title,assignee_id,created_by,due_at) values(a.project_id,a.name||' · assemble & inspect',p_owner,auth.uid(),a.due_at) returning id into work_id;
 insert into public.project_tasks(project_id,title,assignee_id,created_by,due_at) values(a.project_id,a.name||' · bench test',p_owner,auth.uid(),a.due_at) returning id into test_id;
 perform public.configure_engineering_requirements(work_id,p_reviewer,p_assembly_checks,'Assembly work plan');
 perform public.configure_project_review_stage(work_id,'qc_accepted','Assembly inspection, not robot installation');
 perform public.configure_engineering_requirements(test_id,p_reviewer,p_test_checks,'Bench test plan');
 perform public.configure_project_review_stage(test_id,'prototype_validated','Bench testing, not robot verification');
 update public.project_tasks set status='todo',completed_at=null where id in(work_id,test_id);
 insert into public.project_task_dependencies(task_id,prerequisite_id)values(test_id,work_id);
 insert into public.robot_build_kits(id,task_id,name,created_by)values(kit,work_id,a.name||' · assembly components',auth.uid());
 for r in select ar.line_id,ar.quantity,l.revision from public.robot_build_assembly_requirements ar join public.robot_build_bom_lines l on l.id=ar.line_id where ar.assembly_id=a.id loop
  perform public.set_robot_build_kit_requirement(kit,r.line_id,r.quantity,r.revision,'Planned from assembly requirements',gen_random_uuid(),0);
 end loop;
 insert into public.robot_build_assembly_plans(id,assembly_id,assembly_task_id,test_task_id,kit_id,instructions,request_payload,created_by)values(p_request,a.id,work_id,test_id,kit,trim(p_instructions),payload,auth.uid());
 return p_request;
end$$;
-- A submission cannot claim completed assembly while components are missing.
create or replace function public.guard_build_assembly_submission()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare k uuid;
begin
 select kit_id into k from public.robot_build_assembly_plans where assembly_task_id=new.task_id;
 if k is not null and (not exists(select 1 from public.robot_build_kit_requirements where kit_id=k) or exists(select 1 from public.robot_build_kit_requirements r where r.kit_id=k and r.quantity<>(select coalesce(sum(i.quantity),0) from public.robot_build_kit_items i where i.kit_id=k and i.line_id=r.line_id))) then raise exception 'Issue all planned assembly components before submitting assembly inspection';end if;
 return new;
end$$;
drop trigger if exists guard_build_assembly_submission on public.project_review_submissions;
create trigger guard_build_assembly_submission before insert on public.project_review_submissions for each row execute function public.guard_build_assembly_submission();
revoke all on function public.prepare_robot_build_assembly(uuid,uuid,uuid,text,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.prepare_robot_build_assembly(uuid,uuid,uuid,text,jsonb,jsonb,uuid) to authenticated;
revoke all on function public.guard_build_assembly_submission() from public,anon,authenticated;
commit;
begin;
create table if not exists public.robot_build_problem_reports(
 id uuid primary key,task_id uuid not null references public.project_tasks(id),actor_id uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now()
);
alter table public.robot_build_problem_reports enable row level security;
revoke all on public.robot_build_problem_reports from public,anon,authenticated;
grant select on public.robot_build_problem_reports to authenticated;
drop policy if exists build_problem_read on public.robot_build_problem_reports;
create policy build_problem_read on public.robot_build_problem_reports for select to authenticated using(exists(select 1 from public.project_tasks where id=task_id));
create or replace function public.report_robot_build_problem(p_task uuid,p_note text,p_request uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.project_tasks%rowtype;e public.robot_build_problem_reports%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task for update;
 if t.id is null or t.archived or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and (t.assignee_id=auth.uid() or public.has_permission('assign_team_work',subteam))) then raise exception 'Only the assigned worker or build leader can report this blocker';end if;
 select * into e from public.robot_build_problem_reports where id=p_request;
 if found then if e.task_id=p_task and e.actor_id=auth.uid() and e.note=trim(p_note) then return;end if;raise exception 'Request already used';end if;
 if t.status='done' or p_request is null or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Describe the problem on an open task';end if;
 insert into public.robot_build_problem_reports(id,task_id,actor_id,note)values(p_request,p_task,auth.uid(),trim(p_note));
 update public.project_tasks set status='blocked',completed_at=null where id=p_task;
 if exists(select 1 from public.project_review_gates where task_id=p_task) then insert into public.project_review_audit(task_id,actor_id,action,note)values(p_task,auth.uid(),'work_blocker_reported',trim(p_note));end if;
end$$;
revoke all on function public.report_robot_build_problem(uuid,text,uuid) from public,anon;
grant execute on function public.report_robot_build_problem(uuid,text,uuid) to authenticated;
commit;
begin;
alter table public.robot_build_assembly_plans add column if not exists installation_task_id uuid unique references public.project_tasks(id);
alter table public.robot_build_assembly_plans add column if not exists installation_request uuid unique;
alter table public.robot_build_assembly_plans add column if not exists installation_payload jsonb;
create or replace function public.prepare_robot_build_installation(p_plan uuid,p_reviewer uuid,p_checks jsonb,p_request uuid)returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.robot_build_assembly_plans%rowtype;t public.project_tasks%rowtype;result uuid;payload jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into p from public.robot_build_assembly_plans where id=p_plan for update;
 select * into t from public.project_tasks where id=p.assembly_task_id;
 if p.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active build leader required';end if;
 payload:=jsonb_build_object('reviewer',p_reviewer,'checks',p_checks,'actor',auth.uid());
 if p.installation_task_id is not null then if p.installation_request=p_request and p.installation_payload=payload then return p.installation_task_id;end if;raise exception 'Installation is already planned; open its existing task';end if;
 if not public.robot_build_review_usable(p.assembly_task_id) or not public.robot_build_review_usable(p.test_task_id) then raise exception 'Approve assembly inspection and bench test before planning installation';end if;
 if p_request is null or p_reviewer=t.assignee_id or not exists(select 1 from jsonb_array_elements(p_checks)x where x->>'method' in ('test','demonstration')) then raise exception 'Choose an independent reviewer and physical installation checks';end if;
 insert into public.project_tasks(project_id,title,assignee_id,created_by)values(t.project_id,t.title||' · install on robot',t.assignee_id,auth.uid())returning id into result;
 perform public.configure_engineering_requirements(result,p_reviewer,p_checks,'Optional robot installation');
 perform public.configure_project_review_stage(result,'installed','Separate robot installation after bench testing');
 update public.project_tasks set status='todo',completed_at=null where id=result;
 insert into public.project_task_dependencies(task_id,prerequisite_id)values(result,p.test_task_id);
 update public.robot_build_kits set task_id=result where id=p.kit_id;
 update public.robot_build_assembly_plans set installation_task_id=result,installation_request=p_request,installation_payload=payload where id=p.id;
 insert into public.robot_build_kit_events(id,kit_id,action,actor_id,note)values(p_request,p.kit_id,'installation_planned',auth.uid(),'Assembly and bench evidence retained on plan '||p.id);
 return result;
end$$;
-- Reviewed assemblies cannot silently lose or substitute components after submission.
create or replace function public.guard_reviewed_assembly_contents()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare target uuid;
begin
 target:=coalesce(new.kit_id,old.kit_id);
 if exists(select 1 from public.robot_build_assembly_plans p join public.project_review_gates g on g.task_id=p.assembly_task_id where p.kit_id=target and g.current_submission is not null) then raise exception 'This assembly has submitted inspection evidence. Reopen its assembly review before changing components';end if;
 return coalesce(new,old);
end$$;
drop trigger if exists guard_reviewed_assembly_contents on public.robot_build_kit_items;
create trigger guard_reviewed_assembly_contents before insert or update or delete on public.robot_build_kit_items for each row execute function public.guard_reviewed_assembly_contents();
revoke all on function public.prepare_robot_build_installation(uuid,uuid,jsonb,uuid) from public,anon;
grant execute on function public.prepare_robot_build_installation(uuid,uuid,jsonb,uuid) to authenticated;
revoke all on function public.guard_reviewed_assembly_contents() from public,anon,authenticated;
-- A failed inspection must have an explicit correction path without erasing evidence.
create or replace function public.reopen_robot_build_assembly(p_plan uuid,p_reason text)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.robot_build_assembly_plans%rowtype;project uuid;t uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into p from public.robot_build_assembly_plans where id=p_plan for update;
 select project_id into project from public.robot_build_assemblies where id=p.assembly_id;
 if p.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam))
 or not public.has_permission('reopen_engineering_review') then raise exception 'Active build leader with review reopen permission required';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'Record the correction and required retest';end if;
 if p.installation_task_id is not null then raise exception 'Installation has been planned. Use the installation replacement and retest workflow';end if;
 if not exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission where g.task_id in(p.assembly_task_id,p.test_task_id) and s.status='changes_requested') then raise exception 'A reviewer must request changes before reopening this assembly for correction';end if;
 foreach t in array array[p.test_task_id,p.assembly_task_id] loop
  update public.project_review_gates set current_submission=null where task_id=t;
  update public.project_tasks set status='todo',completed_at=null,updated_at=now() where id=t;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(t,'assembly_correction',auth.uid(),trim(p_reason));
 end loop;
end$$;
revoke all on function public.reopen_robot_build_assembly(uuid,text) from public,anon;
grant execute on function public.reopen_robot_build_assembly(uuid,text) to authenticated;
commit;

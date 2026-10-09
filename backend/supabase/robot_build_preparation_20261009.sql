-- Guided preparation orchestrates existing tasks and engineering approval functions.
begin;
create table if not exists public.robot_build_preparations(
 id uuid primary key,project_id uuid not null references public.team_projects(id),
 release_task_id uuid not null unique references public.project_tasks(id),
 work_task_id uuid not null unique references public.project_tasks(id),
 line_id uuid references public.robot_build_bom_lines(id),
 part_name text not null,part_revision text not null,instructions text not null,
 quantity integer not null check(quantity between 1 and 100000),
 request_payload jsonb not null,created_by uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 job_id uuid unique references public.robot_build_jobs(id)
);
alter table public.robot_build_preparations enable row level security;
revoke all on public.robot_build_preparations from public,anon,authenticated;
grant select on public.robot_build_preparations to authenticated;
drop policy if exists build_preparation_read on public.robot_build_preparations;
create policy build_preparation_read on public.robot_build_preparations for select to authenticated using(
 exists(select 1 from public.team_members where id=auth.uid() and active) and exists(select 1 from public.project_tasks where id=work_task_id));

create or replace function public.prepare_robot_build_work(p_project uuid,p_line uuid,p_name text,p_revision text,p_instructions text,p_quantity integer,p_owner uuid,p_reviewer uuid,p_requirements jsonb,p_due timestamptz,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare previous public.robot_build_preparations%rowtype;payload jsonb;release_id uuid;work_id uuid;l public.robot_build_bom_lines%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p_project and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required';end if;
 payload:=jsonb_build_object('line',p_line,'name',trim(p_name),'revision',trim(p_revision),'instructions',trim(p_instructions),'quantity',p_quantity,'owner',p_owner,'reviewer',p_reviewer,'requirements',p_requirements,'due',p_due);
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
 perform public.configure_engineering_requirements(work_id,p_reviewer,p_requirements,'Prepared through Robot Build');
 perform public.configure_project_review_stage(work_id,'qc_accepted','Prepared through Robot Build');
 -- Stage setup labels a new task in_progress; this new manufacturing task has not started.
 update public.project_tasks set status='todo',completed_at=null where id=work_id;
 insert into public.project_task_dependencies(task_id,prerequisite_id)values(work_id,release_id);
 insert into public.robot_build_preparations(id,project_id,release_task_id,work_task_id,line_id,part_name,part_revision,instructions,quantity,request_payload,created_by)
 values(p_request,p_project,release_id,work_id,p_line,trim(p_name),trim(p_revision),trim(p_instructions),p_quantity,payload,auth.uid());
 return p_request;
end$$;
create or replace function public.start_robot_build_preparation(p_preparation uuid) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare p public.robot_build_preparations%rowtype;submission uuid;result uuid;l public.robot_build_bom_lines%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into p from public.robot_build_preparations where id=p_preparation for update;
 if p.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=p.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project manager required';end if;
 if p.job_id is not null then return p.job_id;end if;
 select current_submission into submission from public.project_review_gates where task_id=p.release_task_id;
 result:=public.create_robot_build_job(p.work_task_id,p.release_task_id,submission,p.part_name,p.part_revision,p.instructions,p.quantity);
 if p.line_id is not null then
  select * into l from public.robot_build_bom_lines where id=p.line_id for update;
  perform public.link_robot_build_line(l.id,l.revision,result);
 end if;
 update public.robot_build_preparations set job_id=result where id=p.id;
 return result;
end$$;
revoke all on function public.prepare_robot_build_work(uuid,uuid,text,text,text,integer,uuid,uuid,jsonb,timestamptz,uuid),public.start_robot_build_preparation(uuid) from public,anon;
grant execute on function public.prepare_robot_build_work(uuid,uuid,text,text,text,integer,uuid,uuid,jsonb,timestamptz,uuid),public.start_robot_build_preparation(uuid) to authenticated;
commit;

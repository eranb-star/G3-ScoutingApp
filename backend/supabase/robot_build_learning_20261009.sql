begin;
create table if not exists public.robot_build_operation_learning(
 job_id uuid not null references public.robot_build_jobs(id),
 step_id integer not null check(step_id>0),
 course_id uuid not null references public.training_courses(id),
 step_title text not null,
 linked_by uuid not null references public.team_members(id),
 linked_at timestamptz not null default now(),
 primary key(job_id,step_id,course_id)
);
alter table public.robot_build_operation_learning enable row level security;
revoke all on public.robot_build_operation_learning from public,anon,authenticated;
grant select on public.robot_build_operation_learning to authenticated;
drop policy if exists build_operation_learning_read on public.robot_build_operation_learning;
create policy build_operation_learning_read on public.robot_build_operation_learning for select to authenticated using(
 exists(select 1 from public.robot_build_jobs j where j.id=job_id)
 and exists(select 1 from public.training_courses c where c.id=course_id));
create or replace function public.link_robot_build_learning(p_job uuid,p_step integer,p_course uuid,p_expected integer,p_remove boolean default false)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;title text;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into j from public.robot_build_jobs where id=p_job for update;
 select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam))
 then raise exception 'Active project leader required';end if;
 if j.revision is distinct from p_expected or t.archived or t.status='done' then raise exception 'Work changed or closed; reload before editing learning links';end if;
 if p_remove is true then
  delete from public.robot_build_operation_learning where job_id=p_job and step_id=p_step and course_id=p_course;return;
 end if;
 select s->>'title' into title from jsonb_array_elements(j.operations) s where (s->>'id')::integer=p_step;
 if title is null or not exists(select 1 from public.training_courses where id=p_course and active) then raise exception 'Choose a current operation and active Academy course';end if;
 insert into public.robot_build_operation_learning(job_id,step_id,course_id,step_title,linked_by)
 values(p_job,p_step,p_course,title,auth.uid())
 on conflict(job_id,step_id,course_id) do update set step_title=excluded.step_title,linked_by=excluded.linked_by,linked_at=now();
 -- A learning reference does not enroll, certify, grant machine access or change work progress.
end$$;
revoke all on function public.link_robot_build_learning(uuid,integer,uuid,integer,boolean) from public,anon;
grant execute on function public.link_robot_build_learning(uuid,integer,uuid,integer,boolean) to authenticated;
commit;

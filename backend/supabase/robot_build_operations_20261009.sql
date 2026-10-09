begin;
alter table public.robot_build_jobs add column if not exists operations jsonb not null default '[]';
create or replace function public.set_robot_build_operations(p_job uuid,p_expected integer,p_steps jsonb)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into j from public.robot_build_jobs where id=p_job for update;select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Project manager required';end if;
 if j.revision<>p_expected or t.archived or t.status='done' or j.completed_quantity>0 or exists(select 1 from public.robot_build_work_events where job_id=j.id) or exists(select 1 from public.robot_build_progress where job_id=j.id) then raise exception 'Configure operations before work starts; preserve an active job and use a new job for a changed process';end if;
 if jsonb_typeof(p_steps) is distinct from 'array' or jsonb_array_length(p_steps) not between 1 and 30 or exists(select 1 from jsonb_array_elements(p_steps) s where jsonb_typeof(s)<>'string' or length(trim(s#>>'{}')) not between 3 and 180) then raise exception 'Enter 1–30 clear operation names';end if;
 update public.robot_build_jobs set operations=(select jsonb_agg(jsonb_build_object('id',n,'title',s#>>'{}','completed',0) order by n) from jsonb_array_elements(p_steps) with ordinality x(s,n)),revision=revision+1 where id=j.id;
end$$;
create or replace function public.record_robot_build_operation(p_job uuid,p_step integer,p_quantity integer,p_expected integer,p_note text,p_request uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare j public.robot_build_jobs%rowtype;t public.project_tasks%rowtype;e public.robot_build_work_events%rowtype;step jsonb;marker text;
begin
 perform pg_advisory_xact_lock(6740,911);select * into j from public.robot_build_jobs where id=p_job for update;select * into t from public.project_tasks where id=j.task_id;
 if j.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not coalesce(t.assignee_id=auth.uid() or exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam)),false) then raise exception 'Assigned worker or project manager required';end if;
 marker:='Step '||p_step||': '||trim(p_note);
 select * into e from public.robot_build_work_events where id=p_request;
 if e.id is not null then
  if e.job_id=p_job and e.actor_id=auth.uid() and e.action='operation' and e.amount=p_quantity and e.expected_revision=p_expected and e.note=marker then return;end if;raise exception 'Request identity already used';end if;
 select s into step from jsonb_array_elements(j.operations) s where (s->>'id')::integer=p_step;
 if p_request is null or step is null or p_quantity is null or p_quantity<=0 or p_quantity+(step->>'completed')::integer>j.required_quantity or length(trim(coalesce(p_note,''))) not between 3 and 1800 then raise exception 'Choose an operation and quantity within this batch';end if;
 if j.revision<>p_expected or t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('completed','archived')) then raise exception 'Work changed or closed; reload before recording';end if;
 if not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.project_review_passed(task_id)) then raise exception 'Manufacturing release requires review';end if;
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Reopen inspection before changing operation evidence';end if;
 update public.robot_build_jobs set operations=(select jsonb_agg(case when (s->>'id')::integer=p_step then jsonb_set(s,'{completed}',to_jsonb((s->>'completed')::integer+p_quantity)) else s end order by (s->>'id')::integer) from jsonb_array_elements(j.operations) s),revision=revision+1 where id=j.id;
 insert into public.robot_build_work_events(id,job_id,actor_id,action,amount,expected_revision,note)values(p_request,j.id,auth.uid(),'operation',p_quantity,p_expected,marker);
end$$;
create or replace function public.guard_robot_build_operations()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare ops jsonb;
begin
 select operations into ops from public.robot_build_jobs where id=new.job_id;
 if exists(select 1 from jsonb_array_elements(ops) s where (s->>'completed')::integer<new.completed_quantity) then raise exception 'Complete each planned operation for the reported quantity first';end if;
 return new;
end$$;
drop trigger if exists build_operation_completion on public.robot_build_progress;
create trigger build_operation_completion before insert on public.robot_build_progress for each row execute function public.guard_robot_build_operations();
create or replace function public.reduce_scrapped_build_operations()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.action='scrap' then
  update public.robot_build_jobs set operations=(select coalesce(jsonb_agg(jsonb_set(s,'{completed}',to_jsonb(greatest(0,(s->>'completed')::integer-new.amount::integer))) order by (s->>'id')::integer),'[]') from jsonb_array_elements(operations) s) where id=new.job_id;
 end if;return new;
end$$;
drop trigger if exists build_scrap_operations on public.robot_build_work_events;
create trigger build_scrap_operations after insert on public.robot_build_work_events for each row execute function public.reduce_scrapped_build_operations();
revoke all on function public.set_robot_build_operations(uuid,integer,jsonb),public.record_robot_build_operation(uuid,integer,integer,integer,text,uuid) from public,anon;
grant execute on function public.set_robot_build_operations(uuid,integer,jsonb),public.record_robot_build_operation(uuid,integer,integer,integer,text,uuid) to authenticated;
revoke all on function public.guard_robot_build_operations(),public.reduce_scrapped_build_operations() from public,anon,authenticated;
commit;

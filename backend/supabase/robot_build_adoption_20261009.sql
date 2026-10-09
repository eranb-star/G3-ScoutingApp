-- Adopt existing hardware only through actual installation evidence, never fake stock.
begin;
alter table public.robot_build_kits add column if not exists adoption_note text;
create or replace function public.adopt_robot_build_installation(p_task uuid,p_configuration uuid,p_retest uuid,p_name text,p_note text,p_request uuid)returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare t public.project_tasks%rowtype;c public.project_robot_configurations%rowtype;s public.project_review_submissions%rowtype;k public.robot_build_kits%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;
 if t.id is null or t.archived or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('completed','archived') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project and build leader required';end if;
 select * into k from public.robot_build_kits where id=p_request;
 if k.id is not null then if k.task_id=p_task and k.configuration_id=p_configuration and k.retest_task_id=p_retest and k.name=trim(p_name) and k.adoption_note=trim(p_note) and k.created_by=auth.uid() then return k.id;end if;raise exception 'Request identity already used';end if;
 if exists(select 1 from public.robot_build_kits where task_id=p_task or (configuration_id=p_configuration and retired_at is null)) then raise exception 'This installation is already recorded. Open its existing kit';end if;
 select * into c from public.project_robot_configurations where id=p_configuration and project_id=t.project_id and configuration_kind='as_installed';
 select sub.* into s from public.project_review_gates g join public.project_review_submissions sub on sub.id=g.current_submission where g.task_id=t.id and g.enabled and g.decision_type='installed' and public.robot_build_review_usable(g.task_id);
 if c.id is null or c.identity_snapshot#>>'{asset,id}' is null or s.id is null or s.revision<>c.revision
 or not exists(select 1 from jsonb_each(s.requirement_results) x where x.value->>'result'='passed' and x.value->'configuration_snapshot'->>'id'=c.id::text)
 or exists(select 1 from jsonb_each(s.requirement_results) x where x.value->'configuration_snapshot'->>'id' is not null and x.value->'configuration_snapshot'->>'id'<>c.id::text)
 then raise exception 'Approve the existing installation checkpoint against this exact physical configuration first';end if;
 if p_retest=p_task or not exists(select 1 from public.project_tasks v join public.project_review_gates g on g.task_id=v.id where v.id=p_retest and v.project_id=t.project_id and not v.archived and v.status<>'done' and g.enabled and g.decision_type in ('verified_on_robot','competition_ready')) then raise exception 'Choose an open physical verification task for the adopted installation';end if;
 if p_request is null or length(trim(coalesce(p_name,''))) not between 3 and 180 or length(trim(coalesce(p_note,''))) not between 10 and 2000 then raise exception 'Describe the existing hardware, inspection reference and gaps in its history';end if;
 insert into public.robot_build_kits(id,task_id,name,created_by,configuration_id,installation_submission,installed_at,retest_task_id,requirements_required,adoption_note)
 values(p_request,t.id,trim(p_name),auth.uid(),c.id,s.id,now(),p_retest,false,trim(p_note));
 insert into public.robot_build_kit_events(id,kit_id,action,actor_id,note)values(p_request,p_request,'existing_installation_adopted',auth.uid(),trim(p_note));
 return p_request;
end$$;
revoke all on function public.adopt_robot_build_installation(uuid,uuid,uuid,text,text,uuid) from public,anon;
grant execute on function public.adopt_robot_build_installation(uuid,uuid,uuid,text,text,uuid) to authenticated;
commit;

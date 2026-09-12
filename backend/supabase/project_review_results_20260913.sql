begin;
alter table public.project_review_submissions add column if not exists requirement_results jsonb not null default '{}';

create or replace function public.record_project_requirement_result(
 p_submission uuid,p_requirement uuid,p_result text,p_evidence integer,p_note text,
 p_configuration text default '',p_expires_at timestamptz default null
) returns void language plpgsql security definer set search_path=public as $$
declare s public.project_review_submissions%rowtype;g public.project_review_gates%rowtype;r jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into s from public.project_review_submissions where id=p_submission;
 select * into g from public.project_review_gates where task_id=s.task_id;
 if s.id is null or g.current_submission is distinct from s.id or not g.enabled or s.status<>'pending'
 or s.submitted_by=auth.uid() or not exists(select 1 from public.team_members where id=auth.uid() and active and role in ('mentor','admin'))
 or not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=s.task_id and not t.archived and p.status not in ('archived','completed'))
 then raise exception 'Only a current pending review can be assessed; self-review is not allowed';end if;
 if p_result='waived' then
  if not coalesce(public.is_admin(),false) then raise exception 'Only an administrator may waive a requirement';end if;
  if p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'Waiver expiry must be within the next 30 days';end if;
 elsif g.reviewer_id is distinct from auth.uid() then raise exception 'Only the assigned reviewer may record a result';end if;
 if p_result is null or p_result not in ('passed','failed','waived') or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'A result and findings are required';end if;
 select value into r from jsonb_array_elements(s.requirements) where value->>'id'=p_requirement::text;
 if r is null then raise exception 'Requirement does not belong to this revision';end if;
 if p_evidence is null or p_evidence<0 or p_evidence>=jsonb_array_length(s.evidence_items) then raise exception 'Select submitted evidence for this finding';end if;
 if r->>'method' in ('test','demonstration') and length(trim(coalesce(p_configuration,''))) not between 3 and 240 then raise exception 'Identify the exact robot/prototype and configuration tested';end if;
 update public.project_review_submissions set requirement_results=jsonb_set(requirement_results,array[p_requirement::text],jsonb_build_object(
 'result',p_result,'evidence',p_evidence,'note',trim(p_note),'configuration',trim(coalesce(p_configuration,'')),
 'actor_id',auth.uid(),'recorded_at',now(),'expires_at',case when p_result='waived' then p_expires_at else null end)) where id=s.id;
 insert into public.project_review_audit(task_id,action,actor_id,note) values(s.task_id,'requirement_'||p_result,auth.uid(),s.revision||' | '||p_requirement||' | '||trim(p_note)||' | configuration='||coalesce(p_configuration,'')||' | expiry='||coalesce(p_expires_at::text,''));
end $$;
revoke all on function public.record_project_requirement_result(uuid,uuid,text,integer,text,text,timestamptz) from public,anon;
grant execute on function public.record_project_requirement_result(uuid,uuid,text,integer,text,text,timestamptz) to authenticated;

create or replace function public.requirement_results_pass(p_requirements jsonb,p_results jsonb,p_allow_waiver boolean)
returns boolean language sql stable set search_path=public as $$
 select not exists(select 1 from jsonb_array_elements(p_requirements) r where
 coalesce(p_results->(r->>'id')->>'result','pending')<>'passed'
 and not (p_allow_waiver and coalesce(p_results->(r->>'id')->>'result','pending')='waived'
 and coalesce((p_results->(r->>'id')->>'expires_at')::timestamptz>now(),false)));
$$;
create or replace function public.guard_requirement_release() returns trigger language plpgsql set search_path=public as $$
begin
 if new.status in ('approved','overridden') and new.status is distinct from old.status
 and not public.requirement_results_pass(new.requirements,new.requirement_results,new.status='overridden')
 then raise exception 'Resolve every requirement before release. Waived requirements require an explicit override';end if;
 return new;
end $$;
drop trigger if exists guard_requirement_release on public.project_review_submissions;
create trigger guard_requirement_release before update of status on public.project_review_submissions for each row execute function public.guard_requirement_release();
create or replace function public.project_review_passed(p_task uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission and s.task_id=g.task_id
 where g.task_id=p_task and g.enabled and s.status in ('approved','overridden')
 and public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden'));
$$;
create or replace function public.task_dependency_context(p_home boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(to_jsonb(x) order by task_id,prerequisite_id),'[]'::jsonb) from (
 select d.task_id,d.prerequisite_id,t.status as task_status,
 u.title,u.status,case when u.id is not null and q.id is not null then u.archived or q.status='archived' else true end as unavailable,
 u.assignee_id,m.display_name as owner,q.subteam,u.due_at,
 case when u.id is not null and q.id is not null then '/projects?project='||u.project_id||'&task='||u.id else null end as href,
 not coalesce(u.status='done' and not u.archived and q.status<>'archived' and not exists(
 select 1 from public.project_review_gates rg left join public.project_review_submissions rs on rs.id=rg.current_submission
 where rg.task_id=u.id and rg.enabled and (rs.id is null or rs.status not in ('approved','overridden')
 or not public.requirement_results_pass(rs.requirements,rs.requirement_results,rs.status='overridden'))
 ),false) as waiting
 from project_task_dependencies d join project_tasks t on t.id=d.task_id join team_projects p on p.id=t.project_id
 left join project_tasks u on u.id=d.prerequisite_id left join team_projects q on q.id=u.project_id left join team_members m on m.id=u.assignee_id
 where not t.archived and p.status<>'archived'
 and (not p_home or t.assignee_id=auth.uid() or (has_permission('view_team_risks') and has_permission('assign_team_work',p.subteam)))
 ) x;
$$;

commit;

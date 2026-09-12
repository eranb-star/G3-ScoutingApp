begin;
alter table public.project_review_gates add column if not exists reviewer_ids jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists required_reviewers jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists reviewer_decisions jsonb not null default '{}';
create or replace function public.reset_changed_reviewers() returns trigger language plpgsql set search_path=public as $$
begin
 if new.reviewer_id is distinct from old.reviewer_id then new.reviewer_ids:='[]';new.current_submission:=null;end if;return new;
end $$;
drop trigger if exists reset_changed_reviewers on public.project_review_gates;
create trigger reset_changed_reviewers before update of reviewer_id on public.project_review_gates for each row execute function public.reset_changed_reviewers();
create or replace function public.configure_project_reviewers(p_task uuid,p_reviewers uuid[],p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare g public.project_review_gates%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 if coalesce(cardinality(p_reviewers),0) not between 1 and 5 or (select count(distinct id) from unnest(p_reviewers) id)<>cardinality(p_reviewers)
 or exists(select 1 from unnest(p_reviewers) as j(value) where not exists(select 1 from public.team_members m where m.id=j.value and m.active and m.role in ('mentor','admin')))
 then raise exception 'Choose 1 to 5 different active mentors';end if;
 select * into g from public.project_review_gates where task_id=p_task;
 if g.task_id is null then raise exception 'Configure milestone criteria first';end if;
 perform public.configure_project_review(p_task,p_reviewers[1],g.criteria,p_reason);
 if g.reviewer_ids is distinct from to_jsonb(p_reviewers) then
  update public.project_review_gates set reviewer_ids=to_jsonb(p_reviewers),current_submission=null where task_id=p_task;
  update public.project_tasks set status='in_progress',completed_at=null,updated_at=now() where id=p_task;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'required_reviewers_changed',auth.uid(),p_reason||' | '||to_jsonb(p_reviewers)::text);
 end if;
end $$;
revoke all on function public.configure_project_reviewers(uuid,uuid[],text) from public,anon;
grant execute on function public.configure_project_reviewers(uuid,uuid[],text) to authenticated;
create or replace function public.snapshot_required_reviewers() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select case when reviewer_ids='[]'::jsonb then jsonb_build_array(reviewer_id) else reviewer_ids end into new.required_reviewers from public.project_review_gates where task_id=new.task_id;
 if new.required_reviewers @> jsonb_build_array(new.submitted_by) then raise exception 'A required reviewer cannot submit their own work';end if;
 if exists(select 1 from jsonb_array_elements_text(new.required_reviewers) as j(value) where not exists(select 1 from public.team_members m where m.id::text=j.value and m.active and m.role in ('mentor','admin'))) then raise exception 'Replace unavailable reviewers before submitting';end if;
 return new;
end $$;
drop trigger if exists snapshot_required_reviewers on public.project_review_submissions;
create trigger snapshot_required_reviewers before insert on public.project_review_submissions for each row execute function public.snapshot_required_reviewers();
create or replace function public.invalidate_changed_findings_votes() returns trigger language plpgsql set search_path=public as $$
begin
 if new.requirement_results is distinct from old.requirement_results then new.reviewer_decisions:='{}'::jsonb;end if;return new;
end $$;
drop trigger if exists invalidate_changed_findings_votes on public.project_review_submissions;
create trigger invalidate_changed_findings_votes before update of requirement_results on public.project_review_submissions for each row execute function public.invalidate_changed_findings_votes();
create or replace function public.decide_project_review(p_task uuid,p_submission uuid,p_decision text,p_note text) returns void
language plpgsql security definer set search_path=public as $$
declare g public.project_review_gates%rowtype;s public.project_review_submissions%rowtype;required jsonb;votes jsonb;complete boolean:=false;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into g from public.project_review_gates where task_id=p_task;
 select * into s from public.project_review_submissions where id=p_submission and task_id=p_task;
 if s.id is null or not g.enabled or g.current_submission is distinct from s.id or s.status<>'pending' then raise exception 'Review is no longer pending. Refresh before deciding';end if;
 if not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=p_task and not t.archived and p.status not in ('archived','completed')) then raise exception 'Checkpoint unavailable';end if;
 if s.submitted_by=auth.uid() or not exists(select 1 from public.team_members where id=auth.uid() and active and role in ('mentor','admin')) then raise exception 'An active independent reviewer is required';end if;
 required:=case when s.required_reviewers='[]'::jsonb then jsonb_build_array(g.reviewer_id) else s.required_reviewers end;
 if p_decision='overridden' then
  if not coalesce(public.is_admin(),false) then raise exception 'Only an administrator may override';end if;
 elsif not required @> jsonb_build_array(auth.uid()) then raise exception 'Only a required reviewer may decide';end if;
 if p_decision is null or p_decision not in ('approved','changes_requested','overridden') or length(trim(coalesce(p_note,''))) not between 3 and 5000 then raise exception 'A decision and reason are required';end if;
 if p_decision in ('approved','overridden') and not public.requirement_results_pass(s.requirements,s.requirement_results,p_decision='overridden') then raise exception 'Resolve every requirement before release';end if;
 votes:=jsonb_set(s.reviewer_decisions,array[auth.uid()::text],jsonb_build_object('decision',p_decision,'note',trim(p_note),'at',now()));
 complete:=p_decision in ('changes_requested','overridden') or not exists(select 1 from jsonb_array_elements_text(required) id where coalesce(votes->id->>'decision','')<>'approved');
 update public.project_review_submissions set reviewer_decisions=votes,status=case when complete then p_decision else 'pending' end,
 decided_by=case when complete then auth.uid() else null end,decided_at=case when complete then now() else null end,decision_note=case when complete then trim(p_note) else null end where id=s.id;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'reviewer_'||p_decision,auth.uid(),s.revision||' | '||trim(p_note));
 if complete and p_decision in ('approved','overridden') then update public.project_tasks set status='done',completed_at=now(),updated_at=now() where id=p_task;end if;
end $$;
create or replace function public.project_review_context(p_task uuid default null,p_all boolean default false) returns jsonb language sql stable security invoker set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('task_id',g.task_id,'project_id',t.project_id,'title',t.title,'due_at',t.due_at,'reviewer_id',g.reviewer_id,'reviewer',m.display_name,'criteria',g.criteria,'reviewer_ids',g.reviewer_ids,
 'submission',(select to_jsonb(s)||jsonb_build_object('submitted_by_name',a.display_name,'decided_by_name',d.display_name) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.id=g.current_submission),
 'history',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(s)||jsonb_build_object('submitted_by_name',a.display_name,'decided_by_name',d.display_name) order by s.submitted_at desc),'[]'::jsonb) from public.project_review_submissions s left join public.team_members a on a.id=s.submitted_by left join public.team_members d on d.id=s.decided_by where s.task_id=g.task_id) end,
 'audit',case when p_task is null then '[]'::jsonb else (select coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('actor_name',m.display_name) order by a.created_at desc),'[]'::jsonb) from public.project_review_audit a left join public.team_members m on m.id=a.actor_id where a.task_id=g.task_id) end)
 order by g.created_at),'[]'::jsonb)
 from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id left join public.team_members m on m.id=g.reviewer_id
 where g.enabled and ((p_task is not null and g.task_id=p_task) or (p_task is null and p_all) or (p_task is null and not p_all and not t.archived and p.status<>'archived' and (g.reviewer_id=auth.uid() or g.reviewer_ids @> jsonb_build_array(auth.uid()))
 and exists(select 1 from public.project_review_submissions s where s.id=g.current_submission and s.status='pending')));
$$;

create or replace function public.configure_project_review(p_task uuid,p_reviewer uuid,p_criteria text,p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare t public.project_tasks%rowtype;p public.team_projects%rowtype;g public.project_review_gates%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;select * into p from public.team_projects where id=t.project_id;
 if t.id is null or t.archived or p.status='archived' or not public.has_permission('assign_team_work',p.subteam)
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Project review configuration is not permitted';end if;
 if p.status='completed' then raise exception 'Reopen the completed project before changing review checkpoints';end if;
 if not exists(select 1 from public.team_members where id=p_reviewer and active and role in ('mentor','admin')) then raise exception 'Choose an active mentor or administrator as reviewer';end if;
 select * into g from public.project_review_gates where task_id=p_task;
 if g.task_id is null or not g.enabled then
 if t.status='done' or exists(select 1 from public.project_task_dependencies d join public.project_tasks c on c.id=d.task_id where d.prerequisite_id=p_task and c.status in ('in_progress','done')) then raise exception 'Configure the checkpoint before dependent work starts; reopen completed work deliberately first';end if;
 insert into public.project_review_gates(task_id,reviewer_id,criteria)values(p_task,p_reviewer,trim(p_criteria))
 on conflict(task_id) do update set enabled=true,reviewer_id=excluded.reviewer_id,criteria=excluded.criteria;
 else
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Explain the reviewer or criteria change';end if;
 -- Submitted criteria are immutable. Changing criteria requires a fresh revision.
 update public.project_review_gates set reviewer_id=p_reviewer,criteria=trim(p_criteria),
 current_submission=case when criteria is distinct from trim(p_criteria) then null else current_submission end where task_id=p_task;
 if g.criteria is distinct from trim(p_criteria) or g.reviewer_id is distinct from p_reviewer then update public.project_tasks set status='in_progress',completed_at=null,updated_at=now() where id=p_task;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'required_reviewers_changed',auth.uid(),p_reason||' | '||p_reviewer::text);end if;
 end if;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'configured',auth.uid(),coalesce(nullif(trim(p_reason),''),'Review checkpoint enabled')||' | reviewer='||(select display_name from public.team_members where id=p_reviewer)||' | criteria='||trim(p_criteria));
end$$;


commit;

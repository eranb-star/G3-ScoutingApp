begin;
alter table public.project_review_gates add column if not exists decision_type text not null default 'legacy_review';
alter table public.project_review_submissions add column if not exists decision_type text not null default 'legacy_review';
create or replace function public.configure_project_review_stage(p_task uuid,p_stage text,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if p_stage is null or p_stage not in ('concept_approved','prototype_validated','design_review_passed','released_for_manufacturing','qc_accepted','cleared_for_installation','installed','verified_on_robot','competition_ready')
 then raise exception 'Choose an explicit engineering decision';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'Explain the decision stage';end if;
 if not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=p_task and not t.archived and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam))
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Stage configuration is not permitted';end if;
 if not exists(select 1 from public.project_review_gates where task_id=p_task and enabled) then raise exception 'Configure the checkpoint first';end if;
 if exists(select 1 from public.project_review_gates where task_id=p_task and decision_type=p_stage) then return;end if;
 update public.project_review_gates set decision_type=p_stage,current_submission=null where task_id=p_task;
 update public.project_tasks set status='in_progress',completed_at=null where id=p_task;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'decision_type_changed',auth.uid(),p_stage||' | '||p_reason);
end $$;
revoke all on function public.configure_project_review_stage(uuid,text,text) from public,anon;
grant execute on function public.configure_project_review_stage(uuid,text,text) to authenticated;
create or replace function public.snapshot_review_stage() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select decision_type into new.decision_type from public.project_review_gates where task_id=new.task_id;
 return new;
end $$;
drop trigger if exists snapshot_review_stage on public.project_review_submissions;
create trigger snapshot_review_stage before insert on public.project_review_submissions for each row execute function public.snapshot_review_stage();
-- Legacy clients retain their existing RPC contract; new engineering submissions require a named stage.
create or replace function public.submit_engineering_review(p_task uuid,p_revision text,p_items jsonb,p_expected_submission uuid,p_notes text default '') returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.project_review_gates where task_id=p_task and decision_type<>'legacy_review') then raise exception 'The team leader must select an engineering decision stage before submission';end if;
 perform public.submit_project_review_evidence(p_task,p_revision,p_items,p_expected_submission,p_notes);
end $$;
revoke all on function public.submit_engineering_review(uuid,text,jsonb,uuid,text) from public,anon;
grant execute on function public.submit_engineering_review(uuid,text,jsonb,uuid,text) to authenticated;
commit;

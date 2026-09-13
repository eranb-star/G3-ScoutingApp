begin;
alter table public.engineering_controls add column if not exists require_two_person_overrides boolean not null default true;
alter table public.project_review_submissions add column if not exists requires_two_person_override boolean not null default false;
create table if not exists public.project_override_requests(
 id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.project_review_submissions(id) on delete restrict,
 proposed_by uuid not null,approved_by uuid,created_at timestamptz not null default now(),approved_at timestamptz,
 risk text not null,configuration text not null,expires_at timestamptz not null,reason text not null,approval_note text,
 check(approved_by is null or approved_by<>proposed_by)
);
create unique index if not exists project_override_request_retry_key on public.project_override_requests(submission_id,proposed_by,expires_at,md5(risk||chr(31)||configuration||chr(31)||reason));
alter table public.project_override_requests enable row level security;
drop policy if exists override_request_read on public.project_override_requests;
create policy override_request_read on public.project_override_requests for select to authenticated using(exists(select 1 from public.project_review_submissions where id=submission_id));
revoke all on public.project_override_requests from public,anon,authenticated;
grant select on public.project_override_requests to authenticated;
create or replace function public.snapshot_override_policy()returns trigger language plpgsql security definer set search_path=public as $$
begin
 new.requires_two_person_override:=new.decision_type<>'legacy_review' and coalesce((select require_two_person_overrides from public.engineering_controls where id),true)
 and coalesce((new.engineering_snapshot->'content'->>'critical')::boolean,true);
 return new;
end $$;
drop trigger if exists snapshot_z_override_policy on public.project_review_submissions;
create trigger snapshot_z_override_policy before insert on public.project_review_submissions for each row execute function public.snapshot_override_policy();
create or replace function public.set_engineering_override_policy(p_required boolean,p_reason text)returns void language plpgsql security definer set search_path=public as $$
declare previous jsonb;current jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not coalesce(public.is_admin(),false) then raise exception 'Administrator access required';end if;
 if p_required is null or length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'Choose policy and explain the change';end if;
 select to_jsonb(c) into previous from public.engineering_controls c where id;
 update public.engineering_controls set require_two_person_overrides=p_required,updated_at=now()where id returning to_jsonb(engineering_controls) into current;
 insert into public.engineering_control_audit(actor_id,reason,previous,current)values(auth.uid(),trim(p_reason),previous,current);
end $$;
revoke all on function public.set_engineering_override_policy(boolean,text) from public,anon;
grant execute on function public.set_engineering_override_policy(boolean,text) to authenticated;
create or replace function public.set_engineering_policies(p_allow_new boolean,p_allow_decisions boolean,p_require_two_person boolean,p_reason text)returns void language plpgsql security definer set search_path=public as $$
begin
 perform public.set_engineering_controls(p_allow_new,p_allow_decisions,p_reason);
 perform public.set_engineering_override_policy(p_require_two_person,p_reason);
end $$;
revoke all on function public.set_engineering_policies(boolean,boolean,boolean,text) from public,anon;
grant execute on function public.set_engineering_policies(boolean,boolean,boolean,text) to authenticated;
create or replace function public.propose_engineering_override(p_submission uuid,p_risk text,p_configuration text,p_expires_at timestamptz,p_reason text)returns uuid language plpgsql security definer set search_path=public as $$
declare s public.project_review_submissions%rowtype;result uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into s from public.project_review_submissions where id=p_submission;
 if s.id is null or s.status<>'pending' or s.submitted_by=auth.uid() or not public.has_permission('authorize_engineering_override') or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.project_review_gates g join public.project_tasks t on t.id=g.task_id join public.team_projects p on p.id=t.project_id where g.current_submission=s.id and g.enabled and not t.archived and p.status not in ('archived','completed')) then raise exception 'An independent authorized approver is required for a current pending review';end if;
 if length(trim(coalesce(p_risk,''))) not between 3 and 2000 or length(trim(coalesce(p_configuration,''))) not between 3 and 500 or length(trim(coalesce(p_reason,''))) not between 3 and 2000 or p_expires_at is null or p_expires_at<=now() or p_expires_at>now()+interval '30 days' then raise exception 'Record bounded risk, configuration, reason and expiry within 30 days';end if;
 insert into public.project_override_requests(submission_id,proposed_by,risk,configuration,expires_at,reason)values(s.id,auth.uid(),trim(p_risk),trim(p_configuration),p_expires_at,trim(p_reason))on conflict do nothing returning id into result;
 if result is null then
  select id into result from public.project_override_requests where submission_id=s.id and proposed_by=auth.uid() and risk=trim(p_risk) and configuration=trim(p_configuration) and expires_at=p_expires_at and reason=trim(p_reason);
  if result is null then raise exception 'Conflicting exception request';end if;
  return result;
 end if;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(s.task_id,'override_proposed',auth.uid(),result::text||' | '||trim(p_reason));
 return result;
end $$;
revoke all on function public.propose_engineering_override(uuid,text,text,timestamptz,text) from public,anon;
grant execute on function public.propose_engineering_override(uuid,text,text,timestamptz,text) to authenticated;
create or replace function public.guard_two_person_override()returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='overridden' and new.status is distinct from old.status and new.requires_two_person_override and not exists(
 select 1 from public.project_override_requests r join public.team_members p on p.id=r.proposed_by and p.active join public.team_members a on a.id=r.approved_by and a.active
 where r.submission_id=new.id and r.approved_by is not null and r.proposed_by<>new.submitted_by and r.approved_by<>new.submitted_by
 and r.expires_at>now() and r.risk=new.override_scope->>'risk' and r.configuration=new.override_scope->>'configuration' and r.expires_at=(new.override_scope->>'expires_at')::timestamptz and r.reason=new.override_scope->>'reason')
 then raise exception 'This critical review requires two independent authorizations for the exact override scope';end if;
 return new;
end $$;
drop trigger if exists guard_two_person_override on public.project_review_submissions;
create trigger guard_two_person_override before update of status on public.project_review_submissions for each row execute function public.guard_two_person_override();
create or replace function public.countersign_engineering_override(p_request uuid,p_note text)returns void language plpgsql security definer set search_path=public as $$
declare r public.project_override_requests%rowtype;s public.project_review_submissions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into r from public.project_override_requests where id=p_request for update;
 select * into s from public.project_review_submissions where id=r.submission_id;
 if r.id is null or r.approved_by is not null or r.proposed_by=auth.uid() or s.submitted_by=auth.uid() or not public.has_permission('authorize_engineering_override')
 or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_members m join public.role_permissions rp on rp.role=m.role and rp.permission_key='authorize_engineering_override' and rp.allowed where m.id=r.proposed_by and m.active)
 then raise exception 'A different active authorized approver must countersign';end if;
 if r.expires_at<=now() or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'A current exception and countersignature reason are required';end if;
 update public.project_override_requests set approved_by=auth.uid(),approved_at=now(),approval_note=trim(p_note)where id=r.id;
 perform public.decide_engineering_review(s.task_id,s.id,'overridden',r.reason,jsonb_build_object('risk',r.risk,'configuration',r.configuration,'expires_at',r.expires_at));
 insert into public.project_review_audit(task_id,action,actor_id,note)values(s.task_id,'override_countersigned',auth.uid(),r.id::text||' | '||trim(p_note));
end $$;
revoke all on function public.countersign_engineering_override(uuid,text) from public,anon;
grant execute on function public.countersign_engineering_override(uuid,text) to authenticated;
commit;

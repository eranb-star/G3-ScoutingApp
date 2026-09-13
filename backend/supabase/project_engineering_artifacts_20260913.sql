begin;
alter table public.project_review_submissions add column if not exists artifact_policy_version integer not null default 0;
create or replace function public.snapshot_review_stage() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select decision_type into new.decision_type from public.project_review_gates where task_id=new.task_id;
 new.artifact_policy_version:=case when new.decision_type='legacy_review' then 0 else 1 end;
 return new;
end $$;
create table if not exists public.project_artifact_checks(
 id bigint generated always as identity primary key,submission_id uuid not null references public.project_review_submissions(id) on delete restrict,
 reviewer_id uuid not null, item_index integer not null check(item_index between 0 and 11),
 status text not null check(status in ('verified','missing','changed')),note text not null check(length(trim(note)) between 3 and 2000),created_at timestamptz not null default now()
);
alter table public.project_artifact_checks enable row level security;
drop policy if exists artifact_checks_read on public.project_artifact_checks;
create policy artifact_checks_read on public.project_artifact_checks for select to authenticated using(exists(select 1 from public.project_review_submissions where id=submission_id));
revoke all on public.project_artifact_checks from public,anon,authenticated;
grant select on public.project_artifact_checks to authenticated;
create or replace function public.submit_engineering_review(p_task uuid,p_revision text,p_items jsonb,p_expected_submission uuid,p_notes text default '') returns void
language plpgsql security definer set search_path=public as $$
declare item jsonb;normalized jsonb:='[]';
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.project_review_gates where task_id=p_task and decision_type<>'legacy_review') then raise exception 'The team leader must select an engineering decision stage before submission';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or octet_length(p_items::text)>50000 then raise exception 'Add structured evidence';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if coalesce(item->>'artifact_type','') not in ('drawing','code','test','document','photo')
   or coalesce(length(trim(item->>'source_id')),0) not between 3 and 240
   or (coalesce(item->>'sha256','')<>'' and item->>'sha256' !~ '^[a-fA-F0-9]{64}$')
  then raise exception 'Each artifact requires its type and fixed source version ID; a fingerprint must be SHA-256';end if;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('title',trim(item->>'title'),'revision',trim(item->>'revision'),'url',item->>'url','artifact_type',item->>'artifact_type','source_id',trim(item->>'source_id'),'sha256',lower(item->>'sha256')));
 end loop;
 perform public.submit_project_review_evidence(p_task,p_revision,normalized,p_expected_submission,p_notes);
 update public.project_review_submissions set evidence_items=normalized,artifact_policy_version=1 where id=(select current_submission from public.project_review_gates where task_id=p_task);
end $$;
create or replace function public.check_engineering_artifact(p_submission uuid,p_index integer,p_status text,p_note text) returns void
language plpgsql security definer set search_path=public as $$
declare s public.project_review_submissions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into s from public.project_review_submissions where id=p_submission;
 if s.id is null or s.submitted_by=auth.uid() or not s.required_reviewers @> jsonb_build_array(auth.uid())
 or not public.has_permission('decide_engineering_review') or not exists(select 1 from public.team_members where id=auth.uid() and active)
 then raise exception 'An assigned independent reviewer must check the artifact';end if;
 if not exists(select 1 from public.project_review_gates where current_submission=s.id and enabled) then raise exception 'This submission was superseded';end if;
 if p_index is null or p_index<0 or p_index>=jsonb_array_length(s.evidence_items) or p_status is null or p_status not in ('verified','missing','changed')
 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Select an artifact, access result and explanation';end if;
 insert into public.project_artifact_checks(submission_id,reviewer_id,item_index,status,note)values(s.id,auth.uid(),p_index,p_status,trim(p_note));
 insert into public.project_review_audit(task_id,action,actor_id,note)values(s.task_id,'artifact_'||p_status,auth.uid(),s.revision||' | '||p_index||' | '||trim(p_note));
end $$;
revoke all on function public.check_engineering_artifact(uuid,integer,text,text) from public,anon;
grant execute on function public.check_engineering_artifact(uuid,integer,text,text) to authenticated;
create or replace function public.engineering_artifacts_current(p_submission uuid,p_reviewer uuid default null) returns boolean
language sql stable security invoker set search_path=public as $$
 select coalesce((select s.artifact_policy_version=0 or (
  jsonb_array_length(s.evidence_items)>0 and not exists(select 1 from jsonb_array_elements(s.evidence_items) e where coalesce(length(e->>'source_id'),0)<3 or coalesce(e->>'artifact_type','') not in ('drawing','code','test','document','photo'))
  -- A reported changed/missing artifact invalidates that submission permanently. Submit a fresh version after repair.
  and not exists(select 1 from public.project_artifact_checks c where c.submission_id=s.id and c.status in ('missing','changed'))
  and not exists(select 1 from jsonb_array_elements_text(s.required_reviewers) r(id),generate_series(0,jsonb_array_length(s.evidence_items)-1) i(idx)
   where (p_reviewer is null or r.id=p_reviewer::text) and not exists(select 1 from public.project_artifact_checks c where c.submission_id=s.id and c.reviewer_id::text=r.id and c.item_index=i.idx and c.status='verified')))
 from public.project_review_submissions s where s.id=p_submission),false);
$$;
create or replace function public.guard_engineering_artifact_decisions() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.artifact_policy_version=0 then return new;end if;
 if new.reviewer_decisions is distinct from old.reviewer_decisions and new.reviewer_decisions->auth.uid()::text->>'decision'='approved'
 and not public.engineering_artifacts_current(new.id,auth.uid()) then raise exception 'Open and verify every artifact before approving; missing or changed evidence requires a fresh submission';end if;
 if new.status is distinct from old.status and new.status in ('approved','overridden') and not public.engineering_artifacts_current(new.id)
 then raise exception 'All assigned reviewers must verify current evidence before release';end if;
 return new;
end $$;
drop trigger if exists guard_engineering_artifact_decisions on public.project_review_submissions;
create trigger guard_engineering_artifact_decisions before update on public.project_review_submissions for each row execute function public.guard_engineering_artifact_decisions();
-- Extend the established validity checks consistently in source guards, Home context and dependency context.
do $$declare f record;definition text;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('project_review_passed','task_dependency_context','task_change_impact','project_review_context') loop
  definition:=pg_get_functiondef(f.oid);
  if position('engineering_artifacts_current' in definition)>0 then continue;end if;
  definition:=replace(definition,'public.engineering_override_current(s.override_scope)','(public.engineering_override_current(s.override_scope) and public.engineering_artifacts_current(s.id))');
  definition:=replace(definition,'public.engineering_override_current(rs.override_scope)','(public.engineering_override_current(rs.override_scope) and public.engineering_artifacts_current(rs.id))');
  execute definition;
 end loop;
end $$;
commit;

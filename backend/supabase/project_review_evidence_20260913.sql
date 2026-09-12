-- Release 1 foundation. Extends existing review submission; old APK RPC remains valid.
begin;
alter table public.project_review_submissions add column if not exists evidence_items jsonb not null default '[]'::jsonb;

create or replace function public.submit_project_review_evidence(
 p_task uuid,p_revision text,p_items jsonb,p_expected_submission uuid,p_notes text default ''
) returns void language plpgsql security definer set search_path=public as $$
declare item jsonb; current_id uuid; normalized jsonb:='[]'::jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 select current_submission into current_id from public.project_review_gates where task_id=p_task;
 if current_id is distinct from p_expected_submission then raise exception 'The review changed. Refresh before submitting';end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Add evidence for review';end if;
 if jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>12 then raise exception 'Add between 1 and 12 evidence items';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item)<>'object' or coalesce(length(trim(item->>'title')),0) not between 1 and 160
   or coalesce(length(trim(item->>'revision')),0) not between 1 and 120
   or coalesce(length(item->>'url'),0)>2048
   or coalesce(item->>'url','') !~ '^https://[^[:space:]/]+(/[^[:space:]]*)?$'
  then raise exception 'Each evidence item needs a title, exact revision and HTTPS link';end if;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('title',trim(item->>'title'),'revision',trim(item->>'revision'),'url',item->>'url'));
 end loop;
 -- Existing RPC performs actor, reviewer, task and project authorization and source synchronization.
 perform public.submit_project_review(p_task,p_revision,normalized->0->>'url',p_notes);
 update public.project_review_submissions set evidence_items=normalized
 where id=(select current_submission from public.project_review_gates where task_id=p_task);
end $$;
revoke all on function public.submit_project_review_evidence(uuid,text,jsonb,uuid,text) from public,anon;
grant execute on function public.submit_project_review_evidence(uuid,text,jsonb,uuid,text) to authenticated;
commit;

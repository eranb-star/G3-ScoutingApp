-- Structured authoring over the existing immutable criteria snapshot.
-- Existing clients continue using configure_project_review unchanged.
begin;
alter table public.project_review_gates add column if not exists requirements jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists requirements jsonb not null default '[]';
create or replace function public.snapshot_review_requirements() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select requirements into new.requirements from public.project_review_gates where task_id=new.task_id and criteria=new.criteria;
 new.requirements:=coalesce(new.requirements,'[]'::jsonb);return new;
end $$;
drop trigger if exists snapshot_review_requirements on public.project_review_submissions;
create trigger snapshot_review_requirements before insert on public.project_review_submissions for each row execute function public.snapshot_review_requirements();
create or replace function public.clear_changed_review_requirements() returns trigger language plpgsql set search_path=public as $$
begin
 if new.criteria is distinct from old.criteria then new.requirements:='[]'::jsonb;end if;return new;
end $$;
drop trigger if exists clear_changed_review_requirements on public.project_review_gates;
create trigger clear_changed_review_requirements before update of criteria on public.project_review_gates for each row execute function public.clear_changed_review_requirements();
create or replace function public.configure_project_review_requirements(
 p_task uuid,p_reviewer uuid,p_requirements jsonb,p_reason text default ''
) returns void language plpgsql security definer set search_path=public as $$
declare r jsonb; criteria text:=''; n integer:=0; normalized jsonb:='[]';
begin
 if p_requirements is null or jsonb_typeof(p_requirements)<>'array' then raise exception 'Add milestone requirements';end if;
 if jsonb_array_length(p_requirements)<1 or jsonb_array_length(p_requirements)>10 then raise exception 'Add between 1 and 10 requirements';end if;
 for r in select value from jsonb_array_elements(p_requirements) loop
  if jsonb_typeof(r)<>'object'
   or coalesce(length(trim(r->>'requirement')),0) not between 3 and 160
   or coalesce(length(trim(r->>'acceptance')),0) not between 3 and 600
   or coalesce(r->>'method','') not in ('inspection','test','analysis','demonstration')
  then raise exception 'Each requirement needs a description, measurable acceptance criterion and verification method';end if;
  n:=n+1; normalized:=normalized||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'requirement',trim(r->>'requirement'),'acceptance',trim(r->>'acceptance'),'method',r->>'method'));
  criteria:=criteria||case when n>1 then E'\n\n' else '' end||'R'||n||': '||trim(r->>'requirement')||E'\nAcceptance: '||trim(r->>'acceptance')||E'\nVerification: '||(r->>'method');
 end loop;
 if length(criteria)>4000 then raise exception 'Keep the combined requirements within 4000 characters';end if;
 -- Existing authorization, audit, revision invalidation and dependent-task blocking remain authoritative.
 perform public.configure_project_review(p_task,p_reviewer,criteria,p_reason);
 update public.project_review_gates set requirements=normalized where task_id=p_task and requirements='[]'::jsonb;
end $$;
revoke all on function public.configure_project_review_requirements(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.configure_project_review_requirements(uuid,uuid,jsonb,text) to authenticated;
commit;

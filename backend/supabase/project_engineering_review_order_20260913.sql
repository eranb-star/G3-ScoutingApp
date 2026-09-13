begin;
alter table public.project_review_gates add column if not exists review_mode text not null default 'parallel' check(review_mode in ('parallel','sequential'));
alter table public.project_review_gates add column if not exists reviewer_disciplines jsonb not null default '[]';
alter table public.project_review_submissions add column if not exists review_mode text not null default 'parallel';
alter table public.project_review_submissions add column if not exists reviewer_disciplines jsonb not null default '[]';
create or replace function public.configure_engineering_reviewers(p_task uuid,p_reviewers uuid[],p_mode text,p_disciplines jsonb,p_reason text)returns void language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if p_mode is null or p_mode not in ('parallel','sequential') or p_disciplines is null or jsonb_typeof(p_disciplines)<>'array' or jsonb_array_length(p_disciplines)<>cardinality(p_reviewers)
 or exists(select 1 from jsonb_array_elements(p_disciplines) d where jsonb_typeof(d)<>'string' or length(trim(d#>>'{}')) not between 2 and 100) then raise exception 'Choose review order and the accountable discipline for every reviewer';end if;
 perform public.configure_project_reviewers(p_task,p_reviewers,p_reason);
 if exists(select 1 from public.project_review_gates where task_id=p_task and (review_mode<>p_mode or reviewer_disciplines<>p_disciplines)) then
  update public.project_review_gates set review_mode=p_mode,reviewer_disciplines=p_disciplines,current_submission=null where task_id=p_task;
  update public.project_tasks set status='in_progress',completed_at=null where id=p_task;
  insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'review_order_changed',auth.uid(),p_mode||' | '||p_disciplines::text||' | '||p_reason);
 end if;
end $$;
revoke all on function public.configure_engineering_reviewers(uuid,uuid[],text,jsonb,text) from public,anon;
grant execute on function public.configure_engineering_reviewers(uuid,uuid[],text,jsonb,text) to authenticated;
create or replace function public.snapshot_engineering_review_order()returns trigger language plpgsql security definer set search_path=public as $$
begin
 select review_mode,reviewer_disciplines into new.review_mode,new.reviewer_disciplines from public.project_review_gates where task_id=new.task_id;
 return new;
end $$;
drop trigger if exists snapshot_engineering_review_order on public.project_review_submissions;
create trigger snapshot_engineering_review_order before insert on public.project_review_submissions for each row execute function public.snapshot_engineering_review_order();
create or replace function public.guard_engineering_review_order()returns trigger language plpgsql set search_path=public as $$
declare actor_position bigint;
begin
 if new.review_mode='sequential' and new.reviewer_decisions is distinct from old.reviewer_decisions and new.reviewer_decisions->auth.uid()::text->>'decision'='approved' then
  select ord into actor_position from jsonb_array_elements_text(new.required_reviewers) with ordinality r(id,ord) where id=auth.uid()::text;
  if exists(select 1 from jsonb_array_elements_text(new.required_reviewers) with ordinality r(id,ord) where ord<actor_position and coalesce(old.reviewer_decisions->id->>'decision','')<>'approved') then raise exception 'Earlier reviewers must approve before your sequential review';end if;
 end if;
 return new;
end $$;
drop trigger if exists guard_engineering_review_order on public.project_review_submissions;
create trigger guard_engineering_review_order before update on public.project_review_submissions for each row execute function public.guard_engineering_review_order();
commit;

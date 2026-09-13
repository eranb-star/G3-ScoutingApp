begin;
create table if not exists public.engineering_controls(id boolean primary key default true check(id),allow_new boolean not null default true,allow_decisions boolean not null default true,updated_at timestamptz not null default now());
insert into public.engineering_controls(id)values(true)on conflict do nothing;
create table if not exists public.engineering_control_audit(id bigint generated always as identity primary key,actor_id uuid not null,created_at timestamptz not null default now(),reason text not null,previous jsonb not null,current jsonb not null);
alter table public.engineering_controls enable row level security;
alter table public.engineering_control_audit enable row level security;
drop policy if exists engineering_controls_read on public.engineering_controls;
create policy engineering_controls_read on public.engineering_controls for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active));
drop policy if exists engineering_control_audit_read on public.engineering_control_audit;
create policy engineering_control_audit_read on public.engineering_control_audit for select to authenticated using(public.is_admin());
revoke all on public.engineering_controls,public.engineering_control_audit from public,anon,authenticated;
grant select on public.engineering_controls,public.engineering_control_audit to authenticated;
create or replace function public.set_engineering_controls(p_allow_new boolean,p_allow_decisions boolean,p_reason text)returns void language plpgsql security definer set search_path=public as $$
declare previous jsonb;current jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not coalesce(public.is_admin(),false) then raise exception 'Administrator access required';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 2000 or p_allow_new is null or p_allow_decisions is null then raise exception 'Choose controls and explain the change';end if;
 select to_jsonb(c) into previous from public.engineering_controls c where id;
 update public.engineering_controls set allow_new=p_allow_new,allow_decisions=p_allow_decisions,updated_at=now()where id returning to_jsonb(engineering_controls) into current;
 insert into public.engineering_control_audit(actor_id,reason,previous,current)values(auth.uid(),trim(p_reason),previous,current);
end $$;
revoke all on function public.set_engineering_controls(boolean,boolean,text) from public,anon;
grant execute on function public.set_engineering_controls(boolean,boolean,text) to authenticated;
create or replace function public.guard_engineering_controls()returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if tg_table_name='project_review_submissions' then
  if new.decision_type='legacy_review' then return new;end if;
  if tg_op='UPDATE' then
   if (new.status is distinct from old.status or new.reviewer_decisions is distinct from old.reviewer_decisions) and not coalesce((select allow_decisions from public.engineering_controls where id),false) then raise exception 'Engineering decisions are paused by an administrator; history remains available';end if;
   return new;
  end if;
 end if;
 if not coalesce((select allow_new from public.engineering_controls where id),false) then raise exception 'New engineering changes are paused by an administrator; history remains available';end if;
 return new;
end $$;
drop trigger if exists zz_guard_engineering_controls on public.project_review_submissions;
create trigger zz_guard_engineering_controls before insert or update on public.project_review_submissions for each row execute function public.guard_engineering_controls();
drop trigger if exists guard_engineering_controls on public.project_engineering_records;
create trigger guard_engineering_controls before insert or update on public.project_engineering_records for each row execute function public.guard_engineering_controls();
drop trigger if exists guard_engineering_controls on public.project_engineering_links;
create trigger guard_engineering_controls before insert or update on public.project_engineering_links for each row execute function public.guard_engineering_controls();
commit;

-- Phase 1/2 extension. Apply before the matching web release.
begin;
create table if not exists public.robot_trial_sessions (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null default auth.uid() references public.team_members(id),
 created_at timestamptz not null default now(),
 title text not null check(length(trim(title)) between 3 and 160),
 protocol text not null check(protocol in ('can','intake','shooting','auto')),
 test_plan_id uuid references public.robot_test_plans(id) on delete restrict,
 protocol_version integer not null default 1 check(protocol_version=1),
 evidence_kind text not null check(evidence_kind in ('physical','simulated')),
 setup jsonb not null,
 trials jsonb not null,
 baseline_id uuid references public.robot_trial_sessions(id),
 change_note text not null default '' check(length(change_note)<=4000),
 repair_task_id uuid references public.project_tasks(id) on delete restrict,
 correction_of uuid references public.robot_trial_sessions(id),
 check (baseline_id is null or length(trim(change_note))>=5),
 check (correction_of is null or length(trim(change_note))>=5),
 check (baseline_id is distinct from id and correction_of is distinct from id)
);
create index if not exists robot_trial_sessions_history on public.robot_trial_sessions(created_at desc,id);
create index if not exists robot_trial_sessions_baseline on public.robot_trial_sessions(baseline_id);
create index if not exists robot_trial_sessions_task on public.robot_trial_sessions(repair_task_id);
alter table public.robot_trial_sessions enable row level security;
revoke all on public.robot_trial_sessions from anon,authenticated;
grant select,insert on public.robot_trial_sessions to authenticated;
drop policy if exists robot_tests_read on public.robot_trial_sessions;
create policy robot_tests_read on public.robot_trial_sessions for select to authenticated using(public.current_team_role() is not null);
drop policy if exists robot_tests_create on public.robot_trial_sessions;
create policy robot_tests_create on public.robot_trial_sessions for insert to authenticated with check(public.current_team_role() is not null and created_by=auth.uid());

create table if not exists public.robot_test_task_links (
 run_id uuid not null references public.robot_trial_sessions(id),
 task_id uuid not null references public.project_tasks(id) on delete restrict,
 created_by uuid not null default auth.uid() references public.team_members(id),
 created_at timestamptz not null default now(),
 primary key(run_id,task_id)
);
alter table public.robot_test_task_links enable row level security;
revoke all on public.robot_test_task_links from anon,authenticated;
grant select,insert on public.robot_test_task_links to authenticated;
drop policy if exists test_task_read on public.robot_test_task_links;
create policy test_task_read on public.robot_test_task_links for select to authenticated using(public.current_team_role() is not null);
drop policy if exists test_task_add on public.robot_test_task_links;
create policy test_task_add on public.robot_test_task_links for insert to authenticated with check(
 created_by=auth.uid() and public.current_team_role() is not null
 and exists(select 1 from public.robot_trial_sessions r where r.id=run_id)
 and exists(select 1 from public.project_tasks t where t.id=task_id)
);

-- Validate the same protocol contract on the server; a forged client cannot bypass it.
create or replace function public.validate_robot_test_run() returns trigger
language plpgsql set search_path=public as $$
declare t jsonb; s jsonb:=new.setup; b public.robot_trial_sessions; field text; n numeric;
begin
 if tg_op<>'INSERT' then raise exception 'Test records are immutable; append a correction or retest'; end if;
 new.created_at:=now();
 if jsonb_typeof(s)<>'object' or jsonb_typeof(new.trials)<>'array' then raise exception 'Setup and trials are required'; end if;
 if jsonb_array_length(new.trials) not between 1 and 200 then raise exception 'Use between 1 and 200 trials'; end if;
 foreach field in array array['robot','mechanism','conditions','procedure','criterion','units'] loop
  if jsonb_typeof(s->field) is distinct from 'string' or length(trim(s->>field)) not between 1 and 2000 then raise exception 'Missing or invalid setup: %',field; end if;
 end loop;
 if s->>'units'<>'seconds/counts/volts' then raise exception 'Unsupported units'; end if;
 foreach field in array array['codeRevision','batteryId'] loop
  if s->field is not null and s->field<>'null'::jsonb and (jsonb_typeof(s->field)<>'string' or length(s->>field)>200) then raise exception 'Invalid optional setup field: %',field;end if;
 end loop;
 if s->>'batteryVolts' is not null then
  if jsonb_typeof(s->'batteryVolts')<>'number' then raise exception 'Battery voltage must be a number or unknown';end if;
  n:=(s->>'batteryVolts')::numeric;
  if n<0 or n>16 or n::text in ('NaN','Infinity','-Infinity') then raise exception 'Invalid battery voltage'; end if;
 end if;
 if s->>'batteryId' is not null and length(s->>'batteryId')>200 then raise exception 'Battery ID too long'; end if;
 if length(new.trials::text)>200000 or length(s::text)>16000 then raise exception 'Record too large'; end if;
 for t in select value from jsonb_array_elements(new.trials) loop
  if jsonb_typeof(t)<>'object' or jsonb_typeof(t->'passed') is distinct from 'boolean' then raise exception 'Every trial needs a pass/fail result'; end if;
  foreach field in array array['seconds','attempted','successful','faults'] loop
   if jsonb_typeof(t->field) is distinct from 'number' then raise exception 'Missing numeric trial field: %',field; end if;
   n:=(t->>field)::numeric;
   if n<0 or n>100000 or n::text in ('NaN','Infinity','-Infinity') or (field<>'seconds' and n<>trunc(n)) then raise exception 'Invalid trial value: %',field; end if;
  end loop;
  if (t->>'seconds')::numeric<=0 or (t->>'attempted')::numeric<1 or (t->>'successful')::numeric>(t->>'attempted')::numeric then raise exception 'Trial duration/counts are inconsistent'; end if;
  if jsonb_typeof(t->'note') is distinct from 'string' or length(t->>'note')>2000 then raise exception 'Trial note must be text up to 2000 characters'; end if;
 end loop;
 if new.baseline_id is not null then
  select * into b from public.robot_trial_sessions where id=new.baseline_id;
  if b.id is null or b.protocol<>new.protocol or b.evidence_kind<>new.evidence_kind or b.protocol_version<>new.protocol_version then raise exception 'Baseline must use the same protocol and evidence type'; end if;
 end if;
 if new.repair_task_id is not null and not exists(select 1 from public.project_tasks where id=new.repair_task_id) then raise exception 'Repair task is unavailable'; end if;
 if new.correction_of is not null and not exists(select 1 from public.robot_trial_sessions where id=new.correction_of) then raise exception 'Original record is unavailable'; end if;
 return new;
end$$;
drop trigger if exists robot_test_validate on public.robot_trial_sessions;
create trigger robot_test_validate before insert or update or delete on public.robot_trial_sessions for each row execute function public.validate_robot_test_run();
revoke all on function public.validate_robot_test_run() from public,anon,authenticated;

create table if not exists public.training_lesson_packs (
 course_id uuid primary key references public.training_courses(id) on delete restrict,
 revision text not null,
 content jsonb not null,
 published_at timestamptz not null default now()
);
alter table public.training_lesson_packs enable row level security;
revoke all on public.training_lesson_packs from anon,authenticated;
grant select on public.training_lesson_packs to authenticated;
drop policy if exists lesson_packs_read on public.training_lesson_packs;
create policy lesson_packs_read on public.training_lesson_packs for select to authenticated using(public.current_team_role() is not null);

-- Learner drafts are private; these are progress, never qualification evidence.
create table if not exists public.training_lesson_drafts (
 member_id uuid not null default auth.uid() references public.team_members(id),
 course_id uuid not null references public.training_lesson_packs(course_id),
 draft jsonb not null default '{}'::jsonb check(jsonb_typeof(draft)='object' and length(draft::text)<=30000),
 updated_at timestamptz not null default now(),
 primary key(member_id,course_id)
);
alter table public.training_lesson_drafts enable row level security;
revoke all on public.training_lesson_drafts from anon,authenticated;
grant select,insert,update on public.training_lesson_drafts to authenticated;
drop policy if exists lesson_drafts_own on public.training_lesson_drafts;
create policy lesson_drafts_own on public.training_lesson_drafts for all to authenticated
using(member_id=auth.uid() and public.current_team_role() is not null)
with check(member_id=auth.uid() and public.current_team_role() is not null);
commit;

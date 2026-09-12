-- QA-only account switching. No real-member accounts are inferred from names.
begin;
create table if not exists public.qa_test_accounts(
 member_id uuid primary key references public.team_members(id) on delete restrict,
 email text unique not null check(email in ('qa.student.20260905@g3-test.invalid','qa.mentor.20260905@g3-test.invalid','qa.leader.20260905@g3-test.invalid')),
 expected_role text not null check(expected_role in ('member','mentor','team_leader')),
 enabled boolean not null default true
);
insert into public.qa_test_accounts(member_id,email,expected_role)
select m.id,lower(m.email),q.role from public.team_members m join (values
 ('qa.student.20260905@g3-test.invalid','member'),('qa.mentor.20260905@g3-test.invalid','mentor'),('qa.leader.20260905@g3-test.invalid','team_leader')
) q(email,role) on lower(m.email)=q.email and m.role::text=q.role
on conflict(member_id) do nothing;

create table if not exists public.qa_test_sessions(
 id uuid primary key default gen_random_uuid(),
 administrator_id uuid not null references public.team_members(id) on delete restrict,
 target_id uuid not null references public.qa_test_accounts(member_id) on delete restrict,
 auth_session_id uuid unique,
 started_at timestamptz not null default now(),
 expires_at timestamptz not null,
 ended_at timestamptz,
 status text not null default 'starting' check(status in ('starting','active','ended','failed'))
);
create table if not exists public.qa_test_changes(
 id bigint generated always as identity primary key,
 test_session_id uuid not null references public.qa_test_sessions(id) on delete restrict,
 table_name text not null,record_id text,operation text not null,changed_at timestamptz not null default now()
);
create index if not exists qa_test_admin_recent on public.qa_test_sessions(administrator_id,started_at desc);
create index if not exists qa_test_changes_session on public.qa_test_changes(test_session_id,changed_at);
alter table public.qa_test_accounts enable row level security;
alter table public.qa_test_sessions enable row level security;
alter table public.qa_test_changes enable row level security;
revoke all on public.qa_test_accounts,public.qa_test_sessions,public.qa_test_changes from anon,authenticated;
grant select on public.qa_test_accounts,public.qa_test_sessions,public.qa_test_changes to authenticated;
grant all on public.qa_test_accounts,public.qa_test_sessions,public.qa_test_changes to service_role;
grant usage,select on sequence public.qa_test_changes_id_seq to service_role;
drop policy if exists qa_accounts_admin_read on public.qa_test_accounts;
create policy qa_accounts_admin_read on public.qa_test_accounts for select to authenticated using(public.is_admin());
drop policy if exists qa_sessions_admin_read on public.qa_test_sessions;
create policy qa_sessions_admin_read on public.qa_test_sessions for select to authenticated using(public.is_admin());
drop policy if exists qa_changes_admin_read on public.qa_test_changes;
create policy qa_changes_admin_read on public.qa_test_changes for select to authenticated using(public.is_admin());

create or replace function public.available_qa_test_accounts()
returns table(id uuid,display_name text,role text,email text) language sql stable security definer set search_path=public as $$
 select m.id,m.display_name,m.role::text,m.email from public.qa_test_accounts q join public.team_members m on m.id=q.member_id
 where q.enabled and m.active and m.role::text=q.expected_role and lower(m.email)=q.email
 and exists(select 1 from public.team_members a where a.id=auth.uid() and a.active and a.role='admin');
$$;
revoke all on function public.available_qa_test_accounts() from public,anon;
grant execute on function public.available_qa_test_accounts() to authenticated;

create or replace function public.audit_qa_test_change() returns trigger language plpgsql security definer set search_path=public as $$
declare session_id text:=auth.jwt()->>'session_id'; test_id uuid; record jsonb;
begin
 if session_id is not null then
  select id into test_id from public.qa_test_sessions where auth_session_id::text=session_id and target_id=auth.uid();
  if test_id is not null then
   if TG_OP='DELETE' then record:=to_jsonb(old);else record:=to_jsonb(new);end if;
   insert into public.qa_test_changes(test_session_id,table_name,record_id,operation)
   values(test_id,TG_TABLE_NAME,coalesce(record->>'id',record->>'task_id',record->>'member_id'),TG_OP);
  end if;
 end if;
 if TG_OP='DELETE' then return old;else return new;end if;
end $$;
revoke all on function public.audit_qa_test_change() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['project_tasks','team_projects','project_review_gates','project_review_submissions','project_task_dependencies','feedback_reports','feedback_comments','frc_purchase_requests','frc_parts_inventory','finance_expenses','team_action_states'] loop
  if to_regclass('public.'||t) is not null then
   execute format('drop trigger if exists qa_test_change_audit on public.%I',t);
   execute format('create trigger qa_test_change_audit after insert or update or delete on public.%I for each row execute function public.audit_qa_test_change()',t);
  end if;
 end loop;
end $$;
commit;

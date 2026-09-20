begin;
create table if not exists public.g3_assist_executions(
 member_id uuid not null references public.team_members(id), request_id uuid not null,
 input_hash text not null check(input_hash ~ '^[0-9a-f]{64}$'),
 state text not null default 'running' check(state in ('running','completed','failed','cancelled','uncertain')),
 result jsonb, created_at timestamptz not null default clock_timestamp(),
 deadline timestamptz not null default clock_timestamp()+interval '90 seconds',
 updated_at timestamptz not null default clock_timestamp(), primary key(member_id,request_id)
);
create index if not exists assist_execution_active on public.g3_assist_executions(state,created_at);
alter table public.g3_assist_executions enable row level security;
revoke all on public.g3_assist_executions from public,anon,authenticated;
grant select on public.g3_assist_executions to authenticated;
drop policy if exists own_assist_execution on public.g3_assist_executions;
create policy own_assist_execution on public.g3_assist_executions for select to authenticated
 using(member_id=auth.uid() and public.current_team_role() is not null);

create or replace function public.claim_g3_assist_execution(p_member uuid,p_request uuid,p_hash text) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.g3_assist_executions;
begin
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 if not exists(select 1 from public.team_members m join public.role_permissions r on r.role=m.role where m.id=p_member and m.active and r.permission_key='use_g3_assist' and r.allowed) then raise exception 'ASSIST_ACCESS_DENIED' using errcode='42501'; end if;
 select * into item from public.g3_assist_executions where member_id=p_member and request_id=p_request;
 if found then
  if item.input_hash is distinct from p_hash then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  if item.state='running' and item.deadline<=clock_timestamp() then
   update public.g3_assist_executions set state='uncertain',updated_at=clock_timestamp() where member_id=p_member and request_id=p_request returning * into item;
  end if;
  return jsonb_build_object('claimed',false,'state',item.state,'result',item.result);
 end if;
 if not exists(select 1 from public.g3_assist_budget_policy where id=true and enabled and activation_approved) then raise exception 'AI_BUDGET_DISABLED'; end if;
 if p_request is null or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'INVALID_EXECUTION'; end if;
 update public.g3_assist_executions set state='uncertain',updated_at=clock_timestamp() where state='running' and deadline<=clock_timestamp();
 if (select count(*) from public.g3_assist_executions where member_id=p_member and created_at>clock_timestamp()-interval '1 minute')>=5 then raise exception 'REQUEST_RATE_LIMIT'; end if;
 if exists(select 1 from public.g3_assist_executions where member_id=p_member and state='running') or
 (select count(*) from public.g3_assist_executions where state='running')>=3 then raise exception 'ASSIST_BUSY'; end if;
 insert into public.g3_assist_executions(member_id,request_id,input_hash) values(p_member,p_request,p_hash);
 return jsonb_build_object('claimed',true,'state','running');
end; $$;
create or replace function public.finish_g3_assist_execution(p_member uuid,p_request uuid,p_result jsonb,p_failed boolean) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 if p_result is null or p_failed is null or octet_length(p_result::text)>100000 then raise exception 'INVALID_EXECUTION_RESULT'; end if;
 update public.g3_assist_executions set state=case when p_failed then 'failed' else 'completed' end,result=p_result,updated_at=clock_timestamp()
 where member_id=p_member and request_id=p_request and state='running' and deadline>clock_timestamp();
 return found;
end; $$;
create or replace function public.cancel_g3_assist_execution(p_request uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare result text;
begin
 if public.current_team_role() is null then raise exception 'Active membership required' using errcode='42501'; end if;
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 -- A cancellation can arrive before the HTTP worker claims the request.
 -- Tombstone it so that a late worker cannot start paid work afterward.
 insert into public.g3_assist_executions(member_id,request_id,input_hash,state)
 values(auth.uid(),p_request,repeat('0',64),'cancelled') on conflict do nothing;
 update public.g3_assist_executions set state='cancelled',updated_at=clock_timestamp()
 where member_id=auth.uid() and request_id=p_request and state='running';
 if found then
  update public.g3_assist_budget_attempts set state=case when state='reserved' then 'released' else 'uncertain' end
  where member_id=auth.uid() and request_id=p_request and state in ('reserved','dispatched');
 end if;
 select state into result from public.g3_assist_executions where member_id=auth.uid() and request_id=p_request;
 return result;
end; $$;
create or replace function public.guard_g3_assist_execution_step() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (TG_OP='INSERT' or (NEW.state='dispatched' and OLD.state='reserved')) and
 not exists(select 1 from public.g3_assist_executions where member_id=NEW.member_id and request_id=NEW.request_id and state='running' and deadline>clock_timestamp()) then
 raise exception 'EXECUTION_NOT_RUNNING'; end if;
 return NEW;
end; $$;
drop trigger if exists guard_g3_assist_execution_step on public.g3_assist_budget_attempts;
create trigger guard_g3_assist_execution_step before insert or update on public.g3_assist_budget_attempts for each row execute function public.guard_g3_assist_execution_step();
revoke all on function public.claim_g3_assist_execution(uuid,uuid,text),public.finish_g3_assist_execution(uuid,uuid,jsonb,boolean),public.guard_g3_assist_execution_step() from public,anon,authenticated;
grant execute on function public.claim_g3_assist_execution(uuid,uuid,text),public.finish_g3_assist_execution(uuid,uuid,jsonb,boolean) to service_role;
revoke all on function public.cancel_g3_assist_execution(uuid) from public,anon;
grant execute on function public.cancel_g3_assist_execution(uuid) to authenticated;
commit;

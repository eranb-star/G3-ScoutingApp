-- Single-team deployment. USD microdollars, UTC calendar months.
-- Backend-only ledger; no provider activation or price assumptions.
begin;
create table if not exists public.g3_assist_budget_policy (
  id boolean primary key default true check(id),
  enabled boolean not null default false,
  monthly_limit_microusd bigint not null default 25000000 check(monthly_limit_microusd between 0 and 25000000),
  updated_at timestamptz not null default now()
);
insert into public.g3_assist_budget_policy(id) values(true) on conflict do nothing;
create table if not exists public.g3_assist_budget_attempts (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members(id),
  request_id uuid not null,
  step_key text not null check(length(step_key) between 1 and 80),
  input_hash text not null check(input_hash ~ '^[0-9a-f]{64}$'),
  price_version text not null check(length(price_version) between 1 and 120),
  provider text not null check(provider in ('gemini','openai')),
  model text not null check(length(model) between 1 and 120),
  period_start date not null,
  reserved_microusd bigint not null check(reserved_microusd between 1 and 25000000),
  actual_microusd bigint check(actual_microusd >= 0),
  state text not null default 'reserved' check(state in ('reserved','dispatched','uncertain','settled','released')),
  created_at timestamptz not null default clock_timestamp(),
  dispatch_by timestamptz not null,
  dispatched_at timestamptz,
  settled_at timestamptz,
  provider_request_id text,
  unique(member_id,request_id,step_key),
  check((state='settled')=(actual_microusd is not null))
);
create index if not exists g3_assist_budget_period_idx on public.g3_assist_budget_attempts(period_start,state);
alter table public.g3_assist_budget_policy enable row level security;
alter table public.g3_assist_budget_attempts enable row level security;
revoke all on public.g3_assist_budget_policy,public.g3_assist_budget_attempts from public,anon,authenticated;
grant select on public.g3_assist_budget_policy,public.g3_assist_budget_attempts to authenticated;
drop policy if exists assist_budget_admin_read on public.g3_assist_budget_policy;
create policy assist_budget_admin_read on public.g3_assist_budget_policy for select to authenticated using(public.is_admin());
drop policy if exists assist_budget_attempt_admin_read on public.g3_assist_budget_attempts;
create policy assist_budget_attempt_admin_read on public.g3_assist_budget_attempts for select to authenticated using(public.is_admin());

-- Every mutating function locks the singleton FIRST, serializing allocation
-- across requests and workers. Clients cannot supply prices or reserve funds.
create or replace function public.reserve_g3_assist_budget(
 p_member uuid,p_request uuid,p_step text,p_hash text,p_price_version text,
 p_provider text,p_model text,p_max_microusd bigint
) returns public.g3_assist_budget_attempts
language plpgsql security definer set search_path=public,pg_temp as $$
declare policy public.g3_assist_budget_policy; attempt public.g3_assist_budget_attempts;
 period date; charged numeric;
begin
 select * into policy from public.g3_assist_budget_policy where id=true for update;
 if not found or not policy.enabled then raise exception 'AI_BUDGET_DISABLED' using errcode='P0001'; end if;
 if not exists(select 1 from public.team_members m join public.role_permissions r on r.role=m.role
   where m.id=p_member and m.active and r.permission_key='use_g3_assist' and r.allowed) then
   raise exception 'ASSIST_ACCESS_DENIED' using errcode='42501';
 end if;
 if p_request is null or p_step is null or length(p_step) not between 1 and 80
   or p_hash is null or p_hash !~ '^[0-9a-f]{64}$'
   or p_price_version is null or length(p_price_version) not between 1 and 120
   or p_provider is null or p_provider not in ('gemini','openai')
   or p_model is null or length(p_model) not between 1 and 120
   or p_max_microusd is null or p_max_microusd not between 1 and 25000000 then
   raise exception 'INVALID_BUDGET_RESERVATION' using errcode='22023';
 end if;
 select * into attempt from public.g3_assist_budget_attempts
   where member_id=p_member and request_id=p_request and step_key=p_step;
 if found then
   if row(attempt.input_hash,attempt.price_version,attempt.provider,attempt.model,attempt.reserved_microusd)
      is distinct from row(p_hash,p_price_version,p_provider,p_model,p_max_microusd) then
     raise exception 'IDEMPOTENCY_CONFLICT' using errcode='22023';
   end if;
   return attempt;
 end if;
 period:=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
 -- Only never-dispatched work can expire without reconciliation. This shares
 -- the dispatch lock, so cleanup cannot race with a provider dispatch claim.
 update public.g3_assist_budget_attempts set state='released'
 where state='reserved' and (dispatch_by<=clock_timestamp() or period_start<>period);
 -- Unresolved dispatched work from previous months also withholds capacity.
 -- This conservatively covers delayed charges; month rollover never frees it.
 select coalesce(sum(case when state='settled' then actual_microusd else reserved_microusd end),0)
 into charged from public.g3_assist_budget_attempts
 where (period_start=period and state<>'released') or state in ('dispatched','uncertain');
 if charged+p_max_microusd>policy.monthly_limit_microusd then
   raise exception 'TEAM_MONTHLY_BUDGET_EXHAUSTED' using errcode='P0001';
 end if;
 insert into public.g3_assist_budget_attempts(member_id,request_id,step_key,input_hash,price_version,provider,model,period_start,reserved_microusd,dispatch_by)
 values(p_member,p_request,p_step,p_hash,p_price_version,p_provider,p_model,period,p_max_microusd,clock_timestamp()+interval '60 seconds') returning * into attempt;
 return attempt;
end; $$;

-- Only the worker receiving TRUE can issue this attempt. A duplicate dispatch
-- always returns FALSE; a crash after this point retains the whole reservation.
create or replace function public.dispatch_g3_assist_budget(p_attempt uuid) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
declare policy public.g3_assist_budget_policy; attempt public.g3_assist_budget_attempts; charged numeric;
begin
 select * into policy from public.g3_assist_budget_policy where id=true for update;
 if not found or not policy.enabled then return false; end if;
 select * into attempt from public.g3_assist_budget_attempts where id=p_attempt for update;
 if not found or attempt.state<>'reserved' then return false; end if;
 select coalesce(sum(case when state='settled' then actual_microusd else reserved_microusd end),0)
 into charged from public.g3_assist_budget_attempts
 where (period_start=date_trunc('month',clock_timestamp() at time zone 'UTC')::date and state<>'released')
   or state in ('dispatched','uncertain');
 if attempt.dispatch_by<=clock_timestamp()
   or charged>policy.monthly_limit_microusd
   or attempt.period_start<>date_trunc('month',clock_timestamp() at time zone 'UTC')::date
   or not exists(select 1 from public.team_members m join public.role_permissions r on r.role=m.role
     where m.id=attempt.member_id and m.active and r.permission_key='use_g3_assist' and r.allowed) then
   update public.g3_assist_budget_attempts set state='released' where id=p_attempt;
   return false;
 end if;
 update public.g3_assist_budget_attempts set state='dispatched',dispatched_at=clock_timestamp() where id=p_attempt;
 return true;
end; $$;

-- Timeout/cancellation cannot refund a possibly billable call.
create or replace function public.stop_g3_assist_budget(p_attempt uuid) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare result text;
begin
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 update public.g3_assist_budget_attempts set state=case when state='reserved' then 'released' when state='dispatched' then 'uncertain' else state end
 where id=p_attempt returning state into result;
 return result;
end; $$;

-- Settle ONLY with complete provider usage and the recorded price version.
-- Missing usage must call stop (uncertain), never settle with a guessed zero.
create or replace function public.settle_g3_assist_budget(p_attempt uuid,p_actual_microusd bigint,p_provider_request_id text) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare attempt public.g3_assist_budget_attempts;
begin
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 if p_actual_microusd is null or p_actual_microusd<0 or p_provider_request_id is null or length(p_provider_request_id) not between 1 and 256 then
   raise exception 'INVALID_SETTLEMENT' using errcode='22023';
 end if;
 select * into attempt from public.g3_assist_budget_attempts where id=p_attempt for update;
 if not found then raise exception 'UNKNOWN_ATTEMPT'; end if;
 if attempt.state='settled' then
   if attempt.actual_microusd<>p_actual_microusd or attempt.provider_request_id<>p_provider_request_id then raise exception 'SETTLEMENT_CONFLICT'; end if;
   return 'settled';
 end if;
 if attempt.state not in ('dispatched','uncertain') then raise exception 'ATTEMPT_NOT_DISPATCHED'; end if;
 update public.g3_assist_budget_attempts set state='settled',actual_microusd=p_actual_microusd,
   provider_request_id=p_provider_request_id,settled_at=clock_timestamp() where id=p_attempt;
 -- Preserve the real charge even when an estimator fails; pause new work.
 if p_actual_microusd>attempt.reserved_microusd then
   update public.g3_assist_budget_policy set enabled=false,updated_at=clock_timestamp() where id=true;
   return 'settled_budget_paused';
 end if;
 return 'settled';
end; $$;

revoke all on function public.reserve_g3_assist_budget(uuid,uuid,text,text,text,text,text,bigint),
 public.dispatch_g3_assist_budget(uuid),public.stop_g3_assist_budget(uuid),public.settle_g3_assist_budget(uuid,bigint,text)
 from public,anon,authenticated;
grant execute on function public.reserve_g3_assist_budget(uuid,uuid,text,text,text,text,text,bigint),
 public.dispatch_g3_assist_budget(uuid),public.stop_g3_assist_budget(uuid),public.settle_g3_assist_budget(uuid,bigint,text)
 to service_role;
commit;

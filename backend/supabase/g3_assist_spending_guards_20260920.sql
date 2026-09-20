-- Apply after budget, admin and execution migrations. Does not enable spending.
begin;
alter table public.g3_assist_budget_policy
 add column if not exists daily_team_microusd bigint not null default 3000000 check(daily_team_microusd between 0 and 25000000),
 add column if not exists daily_member_microusd bigint not null default 1000000 check(daily_member_microusd between 0 and 25000000),
 add column if not exists monthly_scope_microusd bigint not null default 5000000 check(monthly_scope_microusd between 0 and 25000000),
 add column if not exists execution_microusd bigint not null default 1600000 check(execution_microusd between 0 and 25000000),
 add column if not exists dispatches_per_minute integer not null default 4 check(dispatches_per_minute between 1 and 60);

create or replace function public.guard_g3_assist_spending() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare policy public.g3_assist_budget_policy; day_start timestamptz;
 team_total numeric; member_total numeric; scope_total numeric; execution_total numeric;
begin
 if TG_OP='UPDATE' and not (OLD.state='reserved' and NEW.state='dispatched') then return NEW; end if;
 select * into policy from public.g3_assist_budget_policy where id=true for update;
 if not policy.enabled or not policy.activation_approved then raise exception 'AI_BUDGET_DISABLED'; end if;
 if NEW.step_key not in ('scope:0','answer:0') then raise exception 'UNSUPPORTED_PAID_STEP'; end if;
 day_start:=date_trunc('day',clock_timestamp() at time zone 'UTC') at time zone 'UTC';
 -- Include uncertain older charges in every applicable cap; midnight is not a refund.
 with amounts as (
 select *,case when state='settled' then actual_microusd else reserved_microusd end as amount
 from public.g3_assist_budget_attempts where id<>NEW.id and
 (state in ('settled','dispatched','uncertain') or (state='reserved' and dispatch_by>clock_timestamp()))
 ) select
 coalesce(sum(amount) filter(where created_at>=day_start or state in ('dispatched','uncertain')),0),
 coalesce(sum(amount) filter(where member_id=NEW.member_id and (created_at>=day_start or state in ('dispatched','uncertain'))),0),
 coalesce(sum(amount) filter(where step_key='scope:0' and (period_start=date_trunc('month',clock_timestamp() at time zone 'UTC')::date or state in ('dispatched','uncertain'))),0),
 coalesce(sum(amount) filter(where member_id=NEW.member_id and request_id=NEW.request_id),0)
 into team_total,member_total,scope_total,execution_total from amounts;
 if team_total+NEW.reserved_microusd>policy.daily_team_microusd then raise exception 'TEAM_DAILY_BUDGET_EXHAUSTED'; end if;
 if member_total+NEW.reserved_microusd>policy.daily_member_microusd then raise exception 'MEMBER_DAILY_BUDGET_EXHAUSTED'; end if;
 if NEW.step_key='scope:0' and scope_total+NEW.reserved_microusd>policy.monthly_scope_microusd then raise exception 'PURPOSE_BUDGET_EXHAUSTED'; end if;
 if execution_total+NEW.reserved_microusd>policy.execution_microusd then raise exception 'EXECUTION_BUDGET_EXHAUSTED'; end if;
 -- A conservative cooldown after repeated unknown provider outcomes.
 if (select count(*) from public.g3_assist_budget_attempts where state='uncertain' and dispatched_at>clock_timestamp()-interval '5 minutes')>=3 then raise exception 'PROVIDER_COOLDOWN'; end if;
 if TG_OP='UPDATE' and (select count(*) from public.g3_assist_budget_attempts where id<>NEW.id and dispatched_at>clock_timestamp()-interval '1 minute')>=policy.dispatches_per_minute then raise exception 'PROVIDER_RATE_LIMIT'; end if;
 return NEW;
end; $$;
drop trigger if exists guard_g3_assist_spending on public.g3_assist_budget_attempts;
create trigger guard_g3_assist_spending before insert or update on public.g3_assist_budget_attempts for each row execute function public.guard_g3_assist_spending();
revoke all on function public.guard_g3_assist_spending() from public,anon,authenticated;
commit;

begin;
alter table public.g3_assist_budget_policy add column if not exists activation_approved boolean not null default false;
create table if not exists public.g3_assist_budget_settings_audit(
 id bigint generated always as identity primary key, actor_id uuid not null,
 previous_limit bigint not null, new_limit bigint not null, previous_enabled boolean not null,
 new_enabled boolean not null, changed_at timestamptz not null default clock_timestamp()
);
alter table public.g3_assist_budget_settings_audit enable row level security;
revoke all on public.g3_assist_budget_settings_audit from public,anon,authenticated;
grant select on public.g3_assist_budget_settings_audit to authenticated;
drop policy if exists budget_settings_admin_read on public.g3_assist_budget_settings_audit;
create policy budget_settings_admin_read on public.g3_assist_budget_settings_audit for select to authenticated using(public.is_admin());
create or replace function public.get_g3_assist_budget_status() returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare policy public.g3_assist_budget_policy; period date; spent bigint; held bigint; unresolved bigint;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Admin required' using errcode='42501'; end if;
 select * into policy from public.g3_assist_budget_policy where id=true;
 if not found then raise exception 'Budget unavailable'; end if;
 period:=date_trunc('month',clock_timestamp() at time zone 'UTC')::date;
 select coalesce(sum(actual_microusd) filter(where state='settled' and period_start=period),0),
 coalesce(sum(reserved_microusd) filter(where state in ('dispatched','uncertain') or
   (state='reserved' and period_start=period and dispatch_by>clock_timestamp())),0),
 count(*) filter(where state='uncertain' or (state='dispatched' and dispatched_at<clock_timestamp()-interval '1 minute'))
 into spent,held,unresolved from public.g3_assist_budget_attempts;
 return jsonb_build_object('currency','USD','limitMicrousd',policy.monthly_limit_microusd,'spentMicrousd',spent,
 'reservedMicrousd',held,'remainingMicrousd',greatest(0,policy.monthly_limit_microusd-spent-held),
 'enabled',policy.enabled,'activationApproved',policy.activation_approved,'unresolvedAttempts',unresolved,
 'safeguards',jsonb_build_object('teamDay',to_jsonb(policy)->'daily_team_microusd','memberDay',to_jsonb(policy)->'daily_member_microusd','purposeMonth',to_jsonb(policy)->'monthly_scope_microusd'),
 'resetAt',((period+interval '1 month') at time zone 'UTC'),
 'warning',case when spent+held>=policy.monthly_limit_microusd then 'exhausted'
 when (spent+held)*100>=policy.monthly_limit_microusd*95 then 'critical'
 when (spent+held)*100>=policy.monthly_limit_microusd*80 then 'warning' else 'normal' end);
end; $$;
create or replace function public.update_g3_assist_budget(p_limit_microusd bigint,p_paused boolean) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare policy public.g3_assist_budget_policy;
begin
 if not coalesce(public.is_admin(),false) then raise exception 'Admin required' using errcode='42501'; end if;
 if p_limit_microusd is null or p_limit_microusd not between 0 and 25000000 or p_paused is null then raise exception 'Invalid budget settings'; end if;
 select * into policy from public.g3_assist_budget_policy where id=true for update;
 if not found then raise exception 'Budget unavailable'; end if;
 if not p_paused and not policy.activation_approved then raise exception 'Paid pilot activation has not been approved'; end if;
 update public.g3_assist_budget_policy set monthly_limit_microusd=p_limit_microusd,enabled=not p_paused,updated_at=clock_timestamp() where id=true;
 insert into public.g3_assist_budget_settings_audit(actor_id,previous_limit,new_limit,previous_enabled,new_enabled)
 values(auth.uid(),policy.monthly_limit_microusd,p_limit_microusd,policy.enabled,not p_paused);
 return public.get_g3_assist_budget_status();
end; $$;
revoke all on function public.get_g3_assist_budget_status(),public.update_g3_assist_budget(bigint,boolean) from public,anon;
grant execute on function public.get_g3_assist_budget_status(),public.update_g3_assist_budget(bigint,boolean) to authenticated;
commit;

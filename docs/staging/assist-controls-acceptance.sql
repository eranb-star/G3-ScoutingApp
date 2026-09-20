-- Isolated QA cyooubycafubbnkjcqlw only. No provider calls. All mutations roll back.
begin;
-- Isolate original monthly-limit tests from newer, separately tested sublimits.
update public.g3_assist_budget_policy set daily_team_microusd=25000000,daily_member_microusd=25000000,monthly_scope_microusd=25000000,execution_microusd=25000000;
create temp table qa_actors as select id,email from public.team_members where email in ('admin@g3-qa.invalid','mentor@g3-qa.invalid','mentor2@g3-qa.invalid');
grant select on qa_actors to authenticated,service_role;
do $$begin if (select count(*) from qa_actors)<>3 then raise exception 'Missing synthetic actors'; end if;
if exists(select 1 from public.g3_assist_budget_policy where enabled or activation_approved or monthly_limit_microusd<>25000000) then raise exception 'QA baseline must be disabled and $25'; end if; end$$;
select set_config('request.jwt.claim.sub',id::text,true) from qa_actors where email='mentor@g3-qa.invalid';
set local role authenticated;
do $$begin
begin perform public.get_g3_assist_budget_status(); raise exception 'Mentor read admin budget'; exception when insufficient_privilege then null; end;
end$$;
reset role;
select set_config('request.jwt.claim.sub',id::text,true) from qa_actors where email='admin@g3-qa.invalid';
set local role authenticated;
do $$begin
if (public.get_g3_assist_budget_status()->>'activationApproved')::boolean then raise exception 'Unexpected activation'; end if;
begin perform public.update_g3_assist_budget(25000000,false); raise exception 'Activation bypass'; exception when others then if sqlerrm not like '%not been approved%' then raise; end if; end;
perform public.update_g3_assist_budget(20000000,true);
if not exists(select 1 from public.g3_assist_budget_settings_audit where actor_id=auth.uid()) then raise exception 'Missing audit'; end if;
end$$;
reset role;
-- Transaction-only synthetic activation to exercise ledger; rolled back below.
update public.g3_assist_budget_policy set enabled=true,activation_approved=true,monthly_limit_microusd=25000000;
set local role service_role;
do $$declare member uuid; claimed jsonb; attempt jsonb; begin
select id into member from qa_actors where email='mentor@g3-qa.invalid';
claimed:=public.claim_g3_assist_execution(member,'94000000-0000-4000-8000-000000000001',repeat('a',64));
if not (claimed->>'claimed')::boolean then raise exception 'Claim failed'; end if;
claimed:=public.claim_g3_assist_execution(member,'94000000-0000-4000-8000-000000000001',repeat('a',64));
if (claimed->>'claimed')::boolean then raise exception 'Duplicate claim'; end if;
attempt:=to_jsonb(public.reserve_g3_assist_budget(member,'94000000-0000-4000-8000-000000000001','scope:0',repeat('a',64),'qa-only','gemini','synthetic',20000000));
if not public.dispatch_g3_assist_budget((attempt->>'id')::uuid) then raise exception 'Dispatch denied'; end if;
end$$;
reset role;
select set_config('request.jwt.claim.sub',id::text,true) from qa_actors where email='mentor2@g3-qa.invalid';
set local role authenticated;
do $$begin if exists(select 1 from public.g3_assist_executions) then raise exception 'Cross-owner execution exposure'; end if; end$$;
reset role;
select set_config('request.jwt.claim.sub',id::text,true) from qa_actors where email='mentor@g3-qa.invalid';
set local role authenticated;
do $$begin if public.cancel_g3_assist_execution('94000000-0000-4000-8000-000000000001')<>'cancelled' then raise exception 'Cancellation failed'; end if; end$$;
reset role;
select set_config('request.jwt.claim.sub',id::text,true) from qa_actors where email='admin@g3-qa.invalid';
set local role authenticated;
do $$declare status jsonb; begin status:=public.get_g3_assist_budget_status();
if status->>'warning'<>'warning' or (status->>'reservedMicrousd')::bigint<>20000000 or (status->>'unresolvedAttempts')::int<>1 then raise exception 'Uncertain charge was not retained: %',status; end if;
end$$;
reset role;
rollback;
select 'PASS: hosted admin isolation, activation lock, audit, claim deduplication, owner isolation, cancellation and uncertain-charge warning; all mutations rolled back' as result,
 enabled,activation_approved,monthly_limit_microusd from public.g3_assist_budget_policy;

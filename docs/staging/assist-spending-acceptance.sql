-- Isolated QA only. Provider-free rollback test of the new daily guard.
begin;
update public.g3_assist_budget_policy set enabled=true,activation_approved=true;
do $$declare actor uuid; request uuid:=gen_random_uuid(); begin
select id into actor from public.team_members where email='mentor@g3-qa.invalid';
if actor is null then raise exception 'Missing QA mentor'; end if;
perform public.claim_g3_assist_execution(actor,request,repeat('a',64));
begin
perform public.reserve_g3_assist_budget(actor,request,'scope:0',repeat('a',64),'qa','gemini','synthetic',1000001);
raise exception 'Member daily cap bypassed';
exception when others then if sqlerrm not like '%MEMBER_DAILY_BUDGET_EXHAUSTED%' then raise; end if; end;
end$$;
rollback;
select 'PASS: member daily guard rejected excess reservation; test rolled back' as result,enabled,activation_approved,daily_team_microusd,daily_member_microusd,monthly_scope_microusd from public.g3_assist_budget_policy;

-- Existing synthetic accounts in G3 Release QA ONLY. All writes roll back.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','1ded448a-3fe7-42c2-8a94-a94876c7a5d9',true);
do $$declare p jsonb;begin
 if public.can_use_engineering_plans() is not true then raise exception 'QA admin lacks planner permission';end if;
 p:=public.save_engineering_plan(null,'QA rollback plan','{"schema":1,"draft":{"status":"unverified-planning-draft","route":[{},{}]},"candidates":[]}',0,false);
 perform set_config('test.plan_id',p->>'id',true);
 perform public.save_engineering_plan((p->>'id')::uuid,'QA rollback plan','{"schema":1,"draft":{"status":"unverified-planning-draft","route":[{},{}]},"candidates":[]}',1,false);
 begin perform public.save_engineering_plan((p->>'id')::uuid,'QA stale save','{"schema":1,"draft":{"status":"unverified-planning-draft","route":[{},{}]},"candidates":[]}',1,false);raise exception 'Stale update accepted';exception when serialization_failure then null;end;
end$$;
select set_config('request.jwt.claim.sub','1708dbda-a520-4b20-8b48-46d7e9edfc42',true);
do $$begin
 if exists(select 1 from public.engineering_plans where id=current_setting('test.plan_id')::uuid) then raise exception 'Private plan leaked';end if;
 if exists(select 1 from public.engineering_plan_versions where plan_id=current_setting('test.plan_id')::uuid) then raise exception 'Private revisions leaked';end if;
 begin perform public.save_engineering_plan(current_setting('test.plan_id')::uuid,'QA forbidden save','{"schema":1,"draft":{"status":"unverified-planning-draft","route":[{},{}]},"candidates":[]}',2,false);raise exception 'Non-owner update accepted';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','1ded448a-3fe7-42c2-8a94-a94876c7a5d9',true);
select public.save_engineering_plan(current_setting('test.plan_id')::uuid,'QA shared plan','{"schema":1,"draft":{"status":"unverified-planning-draft","route":[{},{}]},"candidates":[]}',2,true);
select set_config('request.jwt.claim.sub','1708dbda-a520-4b20-8b48-46d7e9edfc42',true);
do $$begin
 if public.can_use_engineering_plans() is not false then raise exception 'QA mentor unexpectedly gained field access';end if;
 if exists(select 1 from public.engineering_plan_versions where plan_id=current_setting('test.plan_id')::uuid) then raise exception 'Shared plan bypassed field access';end if;
end$$;
select set_config('request.jwt.claim.sub','1ded448a-3fe7-42c2-8a94-a94876c7a5d9',true);
do $$begin if (select count(*) from public.engineering_plan_versions where plan_id=current_setting('test.plan_id')::uuid)<>3 then raise exception 'Owner revision read failed';end if;end$$;
rollback;
select 'PASS: hosted QA private/shared field-access enforcement, revision history, owner enforcement and optimistic conflict; writes rolled back' as result;

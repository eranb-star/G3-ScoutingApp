-- Append to migration with its final COMMIT removed. Everything rolls back.
do $$
declare a uuid;b uuid;d jsonb;cid uuid:=gen_random_uuid();req uuid:=gen_random_uuid();n integer;
begin
 select id into a from team_members where active order by id limit 1;
 select id into b from team_members where active and id<>a order by id limit 1;
 if a is null or b is null then raise exception 'Two active identities needed for rollback QA';end if;
 perform set_config('qa.mechanical_a',a::text,true);perform set_config('qa.mechanical_b',b::text,true);perform set_config('qa.mechanical_id',cid::text,true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 d:='{"engine":"g3-drive-1","title":"Rollback QA","shared":false,"assembly":"","notes":"private first version","input":{"kind":"belt","pitch":5,"n1":24,"n2":48,"mode":"length","center":250,"count":136,"round":"nearest","even":true,"adjustment":0}}';
 n:=save_mechanical_calculation(cid,0,d,req);if n<>1 then raise exception 'Initial save';end if;
 if save_mechanical_calculation(cid,0,d,req)<>1 then raise exception 'Retry duplicate';end if;
 begin perform save_mechanical_calculation(cid,0,d,gen_random_uuid());raise exception 'FAIL stale revision accepted';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 begin perform save_mechanical_calculation(cid,1,d,gen_random_uuid());raise exception 'FAIL nonowner edit';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 perform set_config('request.jwt.claim.sub',a::text,true);
 begin perform save_mechanical_calculation(gen_random_uuid(),0,jsonb_set(d,'{assembly}',to_jsonb(gen_random_uuid()::text)),gen_random_uuid());raise exception 'FAIL invalid assembly';exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.mechanical_b'),true);
do $$begin
 if exists(select 1 from mechanical_calculations where id=current_setting('qa.mechanical_id')::uuid) then raise exception 'Private calculation exposed';end if;
 if exists(select 1 from mechanical_calculation_versions where calculation_id=current_setting('qa.mechanical_id')::uuid) then raise exception 'Private history exposed';end if;
end$$;
reset role;
do $$declare d jsonb;begin
 perform set_config('request.jwt.claim.sub',current_setting('qa.mechanical_a'),true);
 select document into d from mechanical_calculations where id=current_setting('qa.mechanical_id')::uuid;
 perform save_mechanical_calculation(current_setting('qa.mechanical_id')::uuid,1,d||'{"shared":true,"notes":"shared second version"}',gen_random_uuid());
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('qa.mechanical_b'),true);
do $$begin
 if (select count(*) from mechanical_calculations where id=current_setting('qa.mechanical_id')::uuid)<>1 then raise exception 'Shared calculation hidden';end if;
 if (select count(*) from mechanical_calculation_versions where calculation_id=current_setting('qa.mechanical_id')::uuid)<>1 then raise exception 'Private historical version exposed or shared version hidden';end if;
end$$;
reset role;
select 'Mechanical save, retry, conflict, owner, assembly and version privacy checks passed; rolled back' as result;
rollback;

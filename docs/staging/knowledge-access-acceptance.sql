-- Isolated QA ONLY: cyooubycafubbnkjcqlw. All test mutations roll back.
-- Run after g3_assist_permission_20260920.sql. No provider requests.
begin;
create temporary table qa_assist_actor(id uuid);
insert into qa_assist_actor select id from public.team_members where email='student@g3-qa.invalid';
do $$begin
  if (select count(*) from qa_assist_actor)<>1 then raise exception 'Missing unique synthetic QA student'; end if;
end$$;
grant select on qa_assist_actor to authenticated;
select set_config('request.jwt.claim.sub',id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',id,'role','authenticated')::text,true) from qa_assist_actor;
update public.team_members set role='member',active=true where id in(select id from qa_assist_actor);
set local role authenticated;
do $$begin
  if public.has_permission('use_g3_assist') then raise exception 'Member allowed unexpectedly'; end if;
  begin
    insert into public.g3_assist_permission_audit(role,allowed) values('member',true);
    raise exception 'Audit forgery accepted';
  exception when insufficient_privilege then null; end;
end$$;
reset role;
update public.team_members set role='team_leader' where id in(select id from qa_assist_actor);
set local role authenticated;
do $$begin if public.has_permission('use_g3_assist') then raise exception 'Leader allowed unexpectedly'; end if; end$$;
reset role;
update public.team_members set role='mentor' where id in(select id from qa_assist_actor);
set local role authenticated;
do $$begin if not public.has_permission('use_g3_assist') then raise exception 'Mentor denied'; end if; end$$;
reset role;
update public.role_permissions set allowed=false where role='mentor' and permission_key='use_g3_assist';
set local role authenticated;
do $$begin
  if public.has_permission('use_g3_assist') then raise exception 'Revoked mentor allowed'; end if;
  if exists(select 1 from public.g3_assist_permission_audit) then raise exception 'Mentor can read admin audit'; end if;
end$$;
reset role;
update public.team_members set role='admin' where id in(select id from qa_assist_actor);
set local role authenticated;
do $$begin
  if not public.has_permission('use_g3_assist') then raise exception 'Admin denied'; end if;
  if not exists(select 1 from public.g3_assist_permission_audit where role='mentor' and previous_allowed and not allowed and actor_id=auth.uid()) then raise exception 'Missing attributed audit'; end if;
end$$;
reset role;
update public.team_members set active=false where id in(select id from qa_assist_actor);
set local role authenticated;
do $$begin if public.has_permission('use_g3_assist') then raise exception 'Inactive admin allowed'; end if; end$$;
reset role;
rollback;
select 'PASS: authenticated four-role defaults, revocation, inactive denial, audit attribution and isolation; synthetic changes rolled back' as result;

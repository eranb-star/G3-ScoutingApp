-- ISOLATED QA ONLY. Synthetic data; every write is rolled back.
begin;
create temporary table qa_assist_context(admin_id uuid,student_id uuid,project_id uuid,conversation_id uuid,message_id uuid,request_id uuid,task_id uuid);
insert into qa_assist_context(admin_id,student_id,request_id)
select (select id from team_members where email='admin@g3-qa.invalid' and active and role='admin'),
       (select id from team_members where email='student@g3-qa.invalid' and active and role='member'),gen_random_uuid();
do $$declare c qa_assist_context;p uuid;v uuid;m uuid;begin
 select * into c from qa_assist_context;
 if c.admin_id is null or c.student_id is null then raise exception 'Isolated QA accounts required';end if;
 insert into team_projects(name,subteam,status,owner_id,created_by)values('QA decision handoff rollback','mechanical','planning',c.admin_id,c.admin_id)returning id into p;
 insert into ai_conversations(member_id,title)values(c.admin_id,'Synthetic engineering recommendation')returning id into v;
 insert into ai_messages(member_id,conversation_id,role,content,created_at)values(c.admin_id,v,'user','Compare simple and complex climbers',now()-interval '1 second');
 insert into ai_messages(member_id,conversation_id,role,content,citations)values(c.admin_id,v,'assistant','Propose a measured repeatability test. This is not a completed test.','[{"title":"Synthetic manual reference","url":"https://example.org/manual","version":"synthetic-v1"}]')returning id into m;
 update qa_assist_context set project_id=p,conversation_id=v,message_id=m;
end$$;
grant select,update on qa_assist_context to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',admin_id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true) from qa_assist_context;
do $$declare c qa_assist_context;t uuid;again uuid;begin
 select * into c from qa_assist_context;
 t:=create_task_from_assist(c.message_id,c.request_id,c.project_id,'QA proposed climb test',c.student_id,null,'{}');
 again:=create_task_from_assist(c.message_id,c.request_id,c.project_id,'QA proposed climb test',c.student_id,null,'{}');
 if t<>again or not exists(select 1 from project_tasks where id=t and status='todo' and assignee_id=c.student_id) then raise exception 'Retry or ownership failed';end if;
 if not exists(select 1 from project_task_assist_context where task_id=t and question='Compare simple and complex climbers' and citations->0->>'version'='synthetic-v1')then raise exception 'Provenance missing';end if;
 update qa_assist_context set task_id=t;
end$$;
select set_config('request.jwt.claim.sub',student_id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',student_id,'role','authenticated')::text,true) from qa_assist_context;
do $$declare c qa_assist_context;denied boolean:=false;begin
 select * into c from qa_assist_context;
 if not exists(select 1 from project_task_assist_context where task_id=c.task_id)then raise exception 'Owner cannot read shared evidence';end if;
 begin perform create_task_from_assist(c.message_id,gen_random_uuid(),c.project_id,'Forbidden copy',c.student_id,null,'{}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Unauthorized answer copying allowed';end if;
end$$;
reset role;
rollback;
select 'PASS: hosted QA owned-answer handoff, existing owner permissions, immutable evidence snapshot, duplicate retry and student denial; all writes rolled back' result;

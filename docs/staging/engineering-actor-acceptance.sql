-- ISOLATED QA ONLY: cyooubycafubbnkjcqlw. Every synthetic write is rolled back.
begin;
create temporary table qa_engineering_context(
 admin_id uuid,student_id uuid,mentor_id uuid,project_id uuid,task_id uuid,child_id uuid,record_id uuid,submission_id uuid
);
insert into qa_engineering_context(admin_id,student_id,mentor_id)
select (select id from public.team_members where email='admin@g3-qa.invalid' and active and role='admin'),
       (select id from public.team_members where email='student@g3-qa.invalid' and active and role='member'),
       (select id from public.team_members where email='mentor@g3-qa.invalid' and active and role='mentor');
do $$begin if exists(select 1 from qa_engineering_context where admin_id is null or student_id is null or mentor_id is null) then raise exception 'Isolated synthetic QA accounts are required. Do not run on production';end if;end $$;
grant select,update on qa_engineering_context to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub',admin_id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true) from qa_engineering_context;
do $$declare c qa_engineering_context%rowtype;p uuid;t uuid;child uuid;r uuid;
begin
 select * into c from qa_engineering_context;
 if auth.uid()<>c.admin_id or not public.has_permission('assign_team_work','cad') then raise exception 'QA admin identity/permission failed';end if;
 insert into public.team_projects(name,subteam,status,owner_id,created_by)values('QA rollback engineering acceptance','cad','planning',auth.uid(),auth.uid())returning id into p;
 insert into public.project_tasks(project_id,title,status,assignee_id,created_by)values(p,'QA reviewed design','todo',c.student_id,auth.uid())returning id into t;
 insert into public.project_tasks(project_id,title,status,assignee_id,created_by)values(p,'QA dependent manufacturing','todo',c.student_id,auth.uid())returning id into child;
 perform public.configure_project_review(t,c.mentor_id,'Verify the exact synthetic design revision','QA acceptance setup');
 perform public.configure_project_review_stage(t,'concept_approved','Separate concept decision');
 insert into public.project_task_dependencies(task_id,prerequisite_id)values(child,t);
 r:=public.save_project_engineering_record(p,null,0,'requirement','QA load requirement',jsonb_build_object('description','Synthetic load requirement','owner_id',c.student_id,'allocation','CAD','acceptance','Verify fixed design geometry','method','inspection','critical',true),'Initial test requirement');
 perform public.bind_engineering_review(t,r,'Trace requirement to checkpoint');
 update qa_engineering_context set project_id=p,task_id=t,child_id=child,record_id=r;
end $$;
select set_config('request.jwt.claim.sub',student_id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',student_id,'role','authenticated')::text,true) from qa_engineering_context;
do $$declare c qa_engineering_context%rowtype;denied boolean:=false;
begin
 select * into c from qa_engineering_context;
 begin perform public.configure_project_review_stage(c.task_id,'competition_ready','Unauthorized stage attempt');exception when raise_exception then if sqlerrm like '%not permitted%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Student was able to configure a review stage';end if;
 perform public.submit_engineering_review(c.task_id,'QA-immutable-v1','[{"title":"Synthetic fixed CAD","revision":"v1","url":"https://example.com/qa/design/v1","artifact_type":"drawing","source_id":"qa-fixed-version-001"}]',null,'No external service is invoked');
 update qa_engineering_context set submission_id=(select current_submission from public.project_review_gates where task_id=c.task_id);
end $$;
select set_config('request.jwt.claim.sub',mentor_id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',mentor_id,'role','authenticated')::text,true) from qa_engineering_context;
do $$declare c qa_engineering_context%rowtype;denied boolean:=false;
begin
 select * into c from qa_engineering_context;
 begin perform public.decide_engineering_review(c.task_id,c.submission_id,'approved','Unverified artifact must block');exception when raise_exception then if sqlerrm like '%artifact%' or sqlerrm like '%evidence%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Unverified evidence was approved';end if;
 perform public.check_engineering_artifact(c.submission_id,0,'verified','Synthetic actor contract test; not an external-file availability test');
 perform public.decide_engineering_review(c.task_id,c.submission_id,'approved','Exact synthetic revision approved');
 if not exists(select 1 from public.project_tasks where id=c.task_id and status='done') then raise exception 'Approval failed to update source task';end if;
end $$;
select set_config('request.jwt.claim.sub',admin_id::text,true),set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true) from qa_engineering_context;
do $$declare c qa_engineering_context%rowtype;denied boolean:=false;context jsonb;content jsonb;
begin
 select * into c from qa_engineering_context;
 begin delete from public.project_tasks where id=c.task_id;exception when foreign_key_violation then denied:=true;end;
 if not denied then raise exception 'Reviewed task history was deleted';end if;
 update public.project_tasks set archived=true where id=c.task_id;
 if not exists(select 1 from public.project_review_submissions where id=c.submission_id) then raise exception 'Archive lost immutable evidence';end if;
 if not exists(select 1 from jsonb_array_elements(public.task_dependency_context()) d where d->>'task_id'=c.child_id::text and (d->>'waiting')::boolean) then raise exception 'Archived prerequisite did not block dependent work';end if;
 update public.project_tasks set archived=false where id=c.task_id;
 select v.content into content from public.project_engineering_revisions v where record_id=c.record_id and revision=1;
 perform public.save_project_engineering_record(c.project_id,c.record_id,1,'requirement','QA load requirement',content,'Changed engineering revision');
 context:=public.project_review_context(c.task_id);
 if coalesce((context->0->'submission'->>'valid_current')::boolean,true) then raise exception 'Changed engineering revision retained release validity';end if;
 if not exists(select 1 from jsonb_array_elements(public.task_change_impact()) d where d->>'task_id'=c.task_id::text) then raise exception 'Stale root approval is missing from impact visibility';end if;
 denied:=false;
 begin update public.project_tasks set status='in_progress' where id=c.child_id;exception when raise_exception then if sqlerrm like '%approval%' then denied:=true;else raise;end if;end;
 if not denied then raise exception 'Stale engineering approval unlocked dependent work';end if;
 update public.team_projects set status='archived' where id=c.project_id;
 update public.team_projects set status='planning' where id=c.project_id;
 if not exists(select 1 from public.team_projects where id=c.project_id and status='planning') then raise exception 'Project restore failed';end if;
end $$;
rollback;
select 'PASS: hosted QA actor permissions, artifact gate, source completion, protected deletion, archive/restore and stale dependency blocking; all writes rolled back' as result;

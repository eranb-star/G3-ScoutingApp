-- Read-only post-deploy contract checks. No identities, credentials or learner answers.
select 'lesson_count' check_name,count(*)::text result from public.training_lesson_packs
union all select 'assessment_count',count(*)::text from public.training_assessments where course_id in(select course_id from public.training_lesson_packs)
union all select 'question_count',sum(jsonb_array_length(questions))::text from public.training_assessments where course_id in(select course_id from public.training_lesson_packs)
union all select 'legacy_reliability_preserved',exists(select 1 from information_schema.columns where table_schema='public' and table_name='robot_test_runs' and column_name='performed_at')::text
union all select 'trial_rls',relrowsecurity::text from pg_class where oid='public.robot_trial_sessions'::regclass
union all select 'anon_submit_denied',(not has_function_privilege('anon','public.submit_learning_pack(uuid,uuid,jsonb,text,text)','execute'))::text
union all select 'anon_review_denied',(not has_function_privilege('anon','public.review_learning_practical(uuid,boolean,jsonb,text)','execute'))::text
union all select 'helper_direct_call_denied',(not has_function_privilege('authenticated','public.publish_learning_pack_assignments(uuid)','execute'))::text
union all select 'trial_overwrite_denied',(not has_table_privilege('authenticated','public.robot_trial_sessions','update') and not has_table_privilege('authenticated','public.robot_trial_sessions','delete'))::text;

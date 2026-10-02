"""Build a single transactional release, leaving existing enrollments unchanged."""
from pathlib import Path
root=Path(__file__).resolve().parents[2]
names=['team_learning_trials_20261002','practical_learning_workflow_20261002','practical_learning_pack_20261002']
sql='begin;\ncreate temporary table g3_enrollment_baseline on commit drop as select count(*) as n from public.training_enrollments;\n'
for name in names:
    part=(root/'backend/supabase'/f'{name}.sql').read_text(encoding='utf-8')
    sql+=part.replace('begin;\n','',1).rsplit('commit;',1)[0]+'\n'
sql+="""do $$ begin
 if (select count(*) from public.training_enrollments)<>(select n from g3_enrollment_baseline) then
 raise exception 'Publishing unexpectedly changed enrollments';end if;
end$$;
commit;
select (select count(*) from public.training_lesson_packs) lessons,
(select count(*) from public.training_assessments where course_id in (select course_id from public.training_lesson_packs)) assessments;
"""
(root/'docs/staging/team-learning-release.local.sql').write_text(sql,encoding='utf-8')
print('Built transactional learning release; no learner auto-enrollment.')

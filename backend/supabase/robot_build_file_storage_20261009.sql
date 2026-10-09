begin;
insert into storage.buckets(id,name,public,file_size_limit)values('robot-build-files','robot-build-files',false,20971520)on conflict(id)do nothing;
-- Only the manifest owner may upload, once. No browser read/update/delete policy.
drop policy if exists build_file_upload on storage.objects;
create policy build_file_upload on storage.objects for insert to authenticated with check(
 bucket_id='robot-build-files' and exists(select 1 from public.robot_build_files f
 join public.project_tasks t on t.id=f.task_id join public.team_projects p on p.id=t.project_id
 where storage.objects.name=f.created_by::text||'/'||f.id::text and f.created_by=auth.uid() and f.status='pending'
 and not t.archived and p.status not in ('archived','completed')
 and exists(select 1 from public.team_members where id=auth.uid() and active)
 and public.has_permission('assign_team_work',p.subteam)));
commit;

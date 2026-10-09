-- Immutable uploaded work files. Existing engineering approval remains authoritative.
begin;
create table if not exists public.robot_build_files(
 id uuid primary key,task_id uuid not null references public.project_tasks(id) on delete restrict,
 created_by uuid not null references public.team_members(id),name text not null,
 revision text not null,source_version text not null,format text not null,units text not null,
 shared_with_workers boolean not null default false,status text not null default 'pending' check(status in ('pending','ready')),
 sha256 text,byte_size integer,created_at timestamptz not null default now(),
 check(length(name) between 1 and 160),check(length(revision) between 1 and 120),check(length(source_version) between 3 and 240),
 check(format in ('pdf','dxf','step','stl','png','jpg')),check(format in ('pdf','png','jpg') or units<>'not_applicable'),check(units in ('mm','in','not_applicable')),
 check(status='pending' or (sha256 is not null and byte_size is not null and sha256 ~ '^[a-f0-9]{64}$' and byte_size between 1 and 20971520))
);
alter table public.robot_build_files enable row level security;
revoke all on public.robot_build_files from public,anon,authenticated;
grant select on public.robot_build_files to authenticated;
grant select on public.robot_build_files to service_role;
create or replace function public.robot_build_file_can_read(p_file uuid)returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.robot_build_files f join public.project_tasks t on t.id=f.task_id
 join public.team_projects p on p.id=t.project_id
 where f.id=p_file and exists(select 1 from public.team_members where id=auth.uid() and active)
 and (f.created_by=auth.uid() or (not t.archived and p.status not in ('archived','completed') and (
 public.has_permission('assign_team_work',p.subteam) or t.assignee_id=auth.uid()
 or exists(select 1 from public.project_review_gates g left join public.project_review_submissions s on s.id=g.current_submission
 where g.task_id=t.id and g.enabled and (g.reviewer_id=auth.uid() or s.required_reviewers @> jsonb_build_array(auth.uid())))
 or (f.shared_with_workers and f.status='ready' and exists(
 select 1 from public.robot_build_jobs j join public.project_tasks w on w.id=j.task_id
 join public.project_review_gates g on g.task_id=j.release_task_id
 join public.project_review_submissions s on s.id=j.release_submission_id
 where j.release_task_id=t.id and w.assignee_id=auth.uid() and not w.archived
 and g.current_submission=s.id and public.project_review_passed(t.id)
 and exists(select 1 from jsonb_array_elements(s.evidence_items) e where e->>'source_id'='build-file:'||f.id::text and e->>'sha256'=f.sha256 and e->>'revision'=f.revision)
 ))))));
$$;
revoke all on function public.robot_build_file_can_read(uuid) from public,anon;
grant execute on function public.robot_build_file_can_read(uuid) to authenticated;
drop policy if exists build_files_read on public.robot_build_files;
create policy build_files_read on public.robot_build_files for select to authenticated using(public.robot_build_file_can_read(id));

create or replace function public.prepare_robot_build_file(p_task uuid,p_name text,p_revision text,p_source text,p_format text,p_units text,p_share boolean,p_request uuid)returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.robot_build_files%rowtype;t public.project_tasks%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into t from public.project_tasks where id=p_task;
 if t.id is null or t.archived or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam)) then raise exception 'Active project leader required';end if;
 if not exists(select 1 from public.project_review_gates where task_id=t.id and enabled and decision_type='released_for_manufacturing') then raise exception 'Choose a manufacturing release checkpoint';end if;
 select * into f from public.robot_build_files where id=p_request;
 if f.id is not null then
 if f.created_by=auth.uid() and f.task_id=p_task and f.name=trim(p_name) and f.revision=trim(p_revision) and f.source_version=trim(p_source) and f.format=p_format and f.units=p_units and f.shared_with_workers=p_share then return f.id;end if;
 raise exception 'Request identity already used with different file details';end if;
 if p_request is null or p_share is null or p_name ~ '[/\\]' or p_name ~ '[[:cntrl:]]' then raise exception 'Choose a file and explicit access scope';end if;
 insert into public.robot_build_files(id,task_id,created_by,name,revision,source_version,format,units,shared_with_workers)
 values(p_request,p_task,auth.uid(),trim(p_name),trim(p_revision),trim(p_source),p_format,p_units,p_share);
 return p_request;
end$$;
revoke all on function public.prepare_robot_build_file(uuid,text,text,text,text,text,boolean,uuid) from public,anon;
grant execute on function public.prepare_robot_build_file(uuid,text,text,text,text,text,boolean,uuid) to authenticated;

create or replace function public.finalize_robot_build_file(p_file uuid,p_actor uuid,p_hash text,p_size integer)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.robot_build_files%rowtype;
begin
 select * into f from public.robot_build_files where id=p_file for update;
 if f.id is null or f.created_by<>p_actor or not exists(select 1 from public.team_members where id=p_actor and active) then raise exception 'File owner unavailable';end if;
 if f.status='ready' then
 if f.sha256=p_hash and f.byte_size=p_size then return;end if;
 raise exception 'Finalized file is immutable';end if;
 update public.robot_build_files set status='ready',sha256=p_hash,byte_size=p_size where id=f.id;
end$$;
revoke all on function public.finalize_robot_build_file(uuid,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.finalize_robot_build_file(uuid,uuid,text,integer) to service_role;

create or replace function public.guard_robot_build_file_evidence()returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
declare e jsonb;s public.project_review_submissions%rowtype;
begin
 select * into s from public.project_review_submissions where id=new.id;
 for e in select value from jsonb_array_elements(s.evidence_items) loop
 if e->>'url' like '%/robot-build/file?%' and coalesce(e->>'source_id','') not like 'build-file:%' then raise exception 'Select the verified work file from the evidence picker';end if;
 if e->>'source_id' like 'build-file:%' and not exists(select 1 from public.robot_build_files f where 'build-file:'||f.id::text=e->>'source_id' and f.task_id=s.task_id and f.status='ready' and f.revision=s.revision and f.revision=e->>'revision' and f.sha256=e->>'sha256' and e->>'url'='https://g3-6740.com/robot-build/file?id='||f.id::text) then raise exception 'Work file must be finalized and match this checkpoint, revision and fingerprint';end if;
 end loop;
 return new;
end$$;
drop trigger if exists guard_build_file_evidence on public.project_review_submissions;
create constraint trigger guard_build_file_evidence after insert or update on public.project_review_submissions deferrable initially deferred for each row execute function public.guard_robot_build_file_evidence();
revoke all on function public.guard_robot_build_file_evidence() from public,anon,authenticated;
commit;

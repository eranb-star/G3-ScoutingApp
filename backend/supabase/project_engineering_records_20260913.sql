begin;
-- Versioned engineering records extend projects; work/status remain in project_tasks.
create table if not exists public.project_engineering_records(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.team_projects(id) on delete restrict,
 kind text not null check(kind in ('requirement','interface','decision')),
 title text not null check(length(trim(title)) between 3 and 160),
 current_revision integer not null default 1,created_by uuid not null default auth.uid(),created_at timestamptz not null default now()
);
create table if not exists public.project_engineering_revisions(
 record_id uuid not null references public.project_engineering_records(id) on delete restrict,
 revision integer not null check(revision>0),content jsonb not null check(jsonb_typeof(content)='object'),
 reason text not null check(length(trim(reason)) between 3 and 2000),created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),
 primary key(record_id,revision)
);
create table if not exists public.project_engineering_links(
 source_id uuid not null references public.project_engineering_records(id) on delete restrict,
 target_id uuid not null references public.project_engineering_records(id) on delete restrict,
 relation text not null check(relation in ('parent','depends_on','conflicts_with')),
 dimensions text[] not null default array['all'],created_by uuid not null default auth.uid(),created_at timestamptz not null default now(),
 resolved_by uuid,resolved_at timestamptz,resolution text,
 primary key(source_id,target_id,relation),check(source_id<>target_id)
);
alter table public.project_review_gates add column if not exists engineering_record_id uuid references public.project_engineering_records(id) on delete restrict;
alter table public.project_review_submissions add column if not exists engineering_snapshot jsonb;
alter table public.project_engineering_records enable row level security;
alter table public.project_engineering_revisions enable row level security;
alter table public.project_engineering_links enable row level security;
drop policy if exists engineering_record_read on public.project_engineering_records;
drop policy if exists engineering_revision_read on public.project_engineering_revisions;
drop policy if exists engineering_link_read on public.project_engineering_links;
create policy engineering_record_read on public.project_engineering_records for select to authenticated using(exists(select 1 from public.team_projects where id=project_id));
create policy engineering_revision_read on public.project_engineering_revisions for select to authenticated using(exists(select 1 from public.project_engineering_records where id=record_id));
create policy engineering_link_read on public.project_engineering_links for select to authenticated using(
 exists(select 1 from public.project_engineering_records where id=source_id) and exists(select 1 from public.project_engineering_records where id=target_id));
revoke all on public.project_engineering_records,public.project_engineering_revisions,public.project_engineering_links from public,anon,authenticated;
grant select on public.project_engineering_records,public.project_engineering_revisions,public.project_engineering_links to authenticated;

create or replace function public.save_project_engineering_record(p_project uuid,p_record uuid,p_expected_revision integer,p_kind text,p_title text,p_content jsonb,p_reason text)
returns uuid language plpgsql security definer set search_path=public as $$
declare existing public.project_engineering_records%rowtype; result uuid; next_revision integer;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_projects where id=p_project and status not in ('archived','completed') and public.has_permission('assign_team_work',subteam))
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Engineering record editing is not permitted';end if;
 if p_kind not in ('requirement','interface','decision') or p_kind is null or p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>16000
 then raise exception 'Choose a record type and bounded structured content';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 2000 or length(trim(coalesce(p_title,''))) not between 3 and 160 then raise exception 'Title and change reason are required';end if;
 if coalesce(length(trim(p_content->>'description')),0)<3 then raise exception 'Describe the engineering requirement or agreement';end if;
 if not exists(select 1 from public.team_members where id::text=p_content->>'owner_id' and active) then raise exception 'Choose an active accountable owner';end if;
 if p_kind='requirement' then
  if coalesce(p_content->>'method','') not in ('test','inspection','analysis','demonstration')
   or coalesce(length(trim(p_content->>'acceptance')),0)<3 or coalesce(length(trim(p_content->>'allocation')),0)<2
   or jsonb_typeof(p_content->'critical') is distinct from 'boolean' then raise exception 'Requirement needs allocation, acceptance, method and criticality';end if;
 elsif p_kind='interface' then
  if coalesce(length(trim(p_content->>'provider')),0)<2 or coalesce(length(trim(p_content->>'consumer')),0)<2 or coalesce(length(trim(p_content->>'contract')),0)<3
  then raise exception 'Interface needs provider, consumer and technical contract';end if;
 elsif p_kind='decision' then
  if coalesce(length(trim(p_content->>'alternatives')),0)<3 or coalesce(length(trim(p_content->>'rationale')),0)<3 then raise exception 'Record alternatives and decision rationale';end if;
 end if;
 if p_record is null then
  if p_expected_revision is distinct from 0 then raise exception 'New records start at revision zero';end if;
  insert into public.project_engineering_records(project_id,kind,title)values(p_project,p_kind,trim(p_title))returning id into result;next_revision:=1;
 else
  select * into existing from public.project_engineering_records where id=p_record for update;
  if existing.id is null or existing.project_id<>p_project or existing.kind<>p_kind then raise exception 'Record does not belong to this project/type';end if;
  if existing.current_revision is distinct from p_expected_revision then raise exception 'Record changed. Refresh before saving';end if;
  result:=existing.id;next_revision:=existing.current_revision+1;
  update public.project_engineering_records set title=trim(p_title),current_revision=next_revision where id=result;
 end if;
 insert into public.project_engineering_revisions(record_id,revision,content,reason)values(result,next_revision,p_content,trim(p_reason));
 return result;
end $$;
revoke all on function public.save_project_engineering_record(uuid,uuid,integer,text,text,jsonb,text) from public,anon;
grant execute on function public.save_project_engineering_record(uuid,uuid,integer,text,text,jsonb,text) to authenticated;

create or replace function public.link_project_engineering_record(p_source uuid,p_target uuid,p_relation text,p_dimensions text[] default array['all'])
returns void language plpgsql security definer set search_path=public as $$
declare source_kind text;target_kind text;
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.project_engineering_records r join public.team_projects p on p.id=r.project_id where r.id=p_source and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam))
 or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Link editing is not permitted';end if;
 -- Require target management permission too, preventing arbitrary cross-team references.
 if not exists(select 1 from public.project_engineering_records r join public.team_projects p on p.id=r.project_id where r.id=p_target and public.has_permission('assign_team_work',p.subteam)) then raise exception 'Target access is not permitted';end if;
 if p_source=p_target or p_relation is null or p_relation not in ('parent','depends_on','conflicts_with') then raise exception 'Choose two different records and a relation';end if;
 if cardinality(p_dimensions) not between 1 and 9 or p_dimensions is null or not p_dimensions<@array['all','geometry','mass_material','interface','electrical','software','vision','rule','manufacturing'] then raise exception 'Choose supported impact dimensions';end if;
 select kind into source_kind from public.project_engineering_records where id=p_source;
 select kind into target_kind from public.project_engineering_records where id=p_target;
 if p_relation='parent' and (source_kind<>'requirement' or target_kind<>'requirement') then raise exception 'Hierarchy is only for requirements';end if;
 if p_relation in ('parent','depends_on') and exists(with recursive ancestry(id) as(
 select p_target union select l.target_id from public.project_engineering_links l join ancestry a on a.id=l.source_id where l.relation in ('parent','depends_on'))select 1 from ancestry where id=p_source)
 then raise exception 'Engineering links cannot create a cycle';end if;
 insert into public.project_engineering_links(source_id,target_id,relation,dimensions)values(p_source,p_target,p_relation,p_dimensions)on conflict do nothing;
end $$;
revoke all on function public.link_project_engineering_record(uuid,uuid,text,text[]) from public,anon;
grant execute on function public.link_project_engineering_record(uuid,uuid,text,text[]) to authenticated;

create or replace function public.bind_engineering_review(p_task uuid,p_record uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
declare project uuid;
begin
 perform pg_advisory_xact_lock(6740,911);
 select t.project_id into project from public.project_tasks t join public.team_projects p on p.id=t.project_id
 where t.id=p_task and not t.archived and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam);
 if project is null or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Checkpoint linking is not permitted';end if;
 if not exists(select 1 from public.project_engineering_records where id=p_record and project_id=project) then raise exception 'Select a record in this project';end if;
 if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Explain the checkpoint link';end if;
 if not exists(select 1 from public.project_review_gates where task_id=p_task and enabled) then raise exception 'Configure the review checkpoint first';end if;
 update public.project_review_gates set engineering_record_id=p_record,current_submission=null where task_id=p_task;
 update public.project_tasks set status='in_progress',completed_at=null where id=p_task;
 insert into public.project_review_audit(task_id,action,actor_id,note)values(p_task,'engineering_record_linked',auth.uid(),p_record::text||' | '||p_reason);
end $$;
revoke all on function public.bind_engineering_review(uuid,uuid,text) from public,anon;
grant execute on function public.bind_engineering_review(uuid,uuid,text) to authenticated;

create or replace function public.snapshot_engineering_record() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select jsonb_build_object('id',r.id,'revision',r.current_revision,'kind',r.kind,'title',r.title,'content',v.content)
 into new.engineering_snapshot from public.project_review_gates g join public.project_engineering_records r on r.id=g.engineering_record_id
 join public.project_engineering_revisions v on v.record_id=r.id and v.revision=r.current_revision where g.task_id=new.task_id;
 return new;
end $$;
drop trigger if exists snapshot_engineering_record on public.project_review_submissions;
create trigger snapshot_engineering_record before insert on public.project_review_submissions for each row execute function public.snapshot_engineering_record();
create or replace function public.engineering_snapshot_current(p_snapshot jsonb) returns boolean language sql stable security definer set search_path=public as $$
 select p_snapshot is null or (exists(select 1 from public.project_engineering_records where id::text=p_snapshot->>'id' and current_revision::text=p_snapshot->>'revision')
 and not exists(select 1 from public.project_engineering_links where relation='conflicts_with' and resolved_at is null and (source_id::text=p_snapshot->>'id' or target_id::text=p_snapshot->>'id')));
$$;
create or replace function public.guard_engineering_revision() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('approved','overridden') and new.status is distinct from old.status and not public.engineering_snapshot_current(new.engineering_snapshot)
 then raise exception 'Engineering record changed. Submit the current revision for review';end if;
 return new;
end $$;
drop trigger if exists guard_engineering_revision on public.project_review_submissions;
create trigger guard_engineering_revision before update of status on public.project_review_submissions for each row execute function public.guard_engineering_revision();
create or replace function public.project_review_passed(p_task uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission and s.task_id=g.task_id
 where g.task_id=p_task and g.enabled and s.status in ('approved','overridden')
 and public.requirement_results_pass(s.requirements,s.requirement_results,s.status='overridden') and public.engineering_snapshot_current(s.engineering_snapshot));
$$;
create or replace function public.resolve_engineering_conflict(p_source uuid,p_target uuid,p_reason text) returns void
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(6740,911);
 if not exists(select 1 from public.team_members where id=auth.uid() and active) or
 exists(select 1 from unnest(array[p_source,p_target]) x(id) where not exists(
 select 1 from public.project_engineering_records r join public.team_projects p on p.id=r.project_id where r.id=x.id and public.has_permission('assign_team_work',p.subteam))) then raise exception 'Conflict resolution requires access to both records';end if;
 if length(trim(coalesce(p_reason,''))) not between 3 and 2000 then raise exception 'Explain how the conflict was resolved';end if;
 update public.project_engineering_links set resolved_by=auth.uid(),resolved_at=now(),resolution=trim(p_reason)
 where source_id=p_source and target_id=p_target and relation='conflicts_with' and resolved_at is null;
 if not found then raise exception 'No unresolved conflict at this link';end if;
end $$;
revoke all on function public.resolve_engineering_conflict(uuid,uuid,text) from public,anon;
grant execute on function public.resolve_engineering_conflict(uuid,uuid,text) to authenticated;
commit;

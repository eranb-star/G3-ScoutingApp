-- Teaching approval is separate from source verification and student qualification.
begin;
create table if not exists public.training_source_reviews(
 id uuid primary key default gen_random_uuid(),course_id uuid not null references public.training_courses(id) on delete cascade,
 source_url text not null,document_id uuid not null references public.frc_knowledge_documents(id),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),note text not null check(length(trim(note)) between 3 and 4000),
 reviewed_by uuid not null references public.team_members(id),reviewed_at timestamptz not null default now()
);
alter table public.training_source_reviews enable row level security;
drop policy if exists academy_source_review_read on public.training_source_reviews;
create policy academy_source_review_read on public.training_source_reviews for select to authenticated
 using(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
grant select on public.training_source_reviews to authenticated;
-- Resolve references at read time so removing/changing a course source cannot leave an active stale dependency.
create or replace function public.training_source_links(p_course uuid)
returns table(source_url text,title text) language sql stable security definer set search_path=public as $$
 select distinct split_part(r.url,'#',1),r.title from training_course_resources cr join training_resources r on r.id=cr.resource_id
 where cr.course_id=p_course and r.status='approved'
 union
 select distinct split_part(s->>1,'#',1),s->>0 from training_lesson_packs p cross join lateral jsonb_array_elements(p.content->'sources') s where p.course_id=p_course
$$;
revoke all on function public.training_source_links(uuid) from public,anon,authenticated;
create or replace function public.training_source_impact(p_course uuid)
returns table(source_url text,title text,document_id uuid,current_sha text,reviewed_sha text,checked_at timestamptz,state text)
language plpgsql stable security definer set search_path=public as $$
begin
 if not exists(select 1 from training_courses c where c.id=p_course and public.has_permission('manage_training',c.target_subteam)) then raise exception 'Course management permission required';end if;
 return query select l.source_url,l.title,d.id,d.sha256,r.sha256,d.checked_at,
 case when d.id is null then 'unmonitored' when r.id is null then 'needs_review' when r.sha256<>d.sha256 then 'changed' else 'current' end
 from training_source_links(p_course) l
 left join lateral(select x.* from frc_knowledge_documents x where x.url=l.source_url order by x.checked_at desc,x.id limit 1) d on true
 left join lateral(select x.* from training_source_reviews x where x.course_id=p_course and x.source_url=l.source_url and x.document_id=d.id order by x.reviewed_at desc,x.id desc limit 1) r on true;
end $$;
create or replace function public.review_training_source(p_course uuid,p_url text,p_document uuid,p_sha text,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare result uuid;doc public.frc_knowledge_documents;
begin
 if not exists(select 1 from training_courses c where c.id=p_course and public.has_permission('manage_training',c.target_subteam)) then raise exception 'Course management permission required';end if;
 if not exists(select 1 from training_source_links(p_course) l where l.source_url=p_url) then raise exception 'Source is no longer attached to this course';end if;
 select * into doc from frc_knowledge_documents where id=p_document for share;
 if doc.id is null or doc.url<>p_url or doc.sha256<>p_sha then raise exception 'Source changed. Refresh and review the current revision.';end if;
 insert into training_source_reviews(course_id,source_url,document_id,sha256,note,reviewed_by) values(p_course,p_url,p_document,p_sha,p_note,auth.uid()) returning id into result;
 return result;
end $$;
revoke all on function public.training_source_impact(uuid),public.review_training_source(uuid,text,uuid,text,text) from public,anon;
grant execute on function public.training_source_impact(uuid),public.review_training_source(uuid,text,uuid,text,text) to authenticated;
commit;

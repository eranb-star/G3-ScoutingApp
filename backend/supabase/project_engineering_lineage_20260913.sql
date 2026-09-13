begin;
create or replace function public.engineering_lineage(p_record uuid) returns jsonb language sql stable security definer set search_path=public as $$
 with recursive upstream(id,dimensions) as (
 select target_id,dimensions from public.project_engineering_links where source_id=p_record and relation in ('parent','depends_on')
 union select l.target_id,l.dimensions from public.project_engineering_links l join upstream u on l.source_id=u.id where l.relation in ('parent','depends_on')
 ), flattened as (select u.id,unnest(u.dimensions) dimension from upstream u), collected as(
 select id,array_agg(distinct dimension order by dimension) dimensions from flattened group by id)
 select coalesce(jsonb_agg(jsonb_build_object('id',r.id,'revision',r.current_revision,'dimensions',c.dimensions) order by r.id),'[]'::jsonb)
 from collected c join public.project_engineering_records r on r.id=c.id;
$$;
revoke all on function public.engineering_lineage(uuid) from public,anon,authenticated;

create or replace function public.snapshot_engineering_record() returns trigger language plpgsql security definer set search_path=public as $$
begin
 select jsonb_build_object('id',r.id,'revision',r.current_revision,'kind',r.kind,'title',r.title,'content',v.content,'lineage',public.engineering_lineage(r.id))
 into new.engineering_snapshot from public.project_review_gates g join public.project_engineering_records r on r.id=g.engineering_record_id
 join public.project_engineering_revisions v on v.record_id=r.id and v.revision=r.current_revision where g.task_id=new.task_id;
 return new;
end $$;

create or replace function public.engineering_snapshot_current(p_snapshot jsonb) returns boolean language plpgsql stable security definer set search_path=public as $$
declare source uuid; pinned jsonb; current_links jsonb; old_shape jsonb; new_shape jsonb;
begin
 if p_snapshot is null then return true;end if;
 source:=(p_snapshot->>'id')::uuid;
 if not exists(select 1 from public.project_engineering_records where id=source and current_revision::text=p_snapshot->>'revision') then return false;end if;
 if exists(select 1 from public.project_engineering_links where relation='conflicts_with' and resolved_at is null and (source_id=source or target_id=source)) then return false;end if;
 current_links:=public.engineering_lineage(source);
 select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','dimensions',x->'dimensions') order by x->>'id'),'[]') into old_shape from jsonb_array_elements(coalesce(p_snapshot->'lineage','[]')) x;
 select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','dimensions',x->'dimensions') order by x->>'id'),'[]') into new_shape from jsonb_array_elements(current_links) x;
 if old_shape<>new_shape then return false;end if;
 for pinned in select value from jsonb_array_elements(current_links) loop
  if exists(select 1 from public.project_engineering_links where relation='conflicts_with' and resolved_at is null and (source_id::text=pinned->>'id' or target_id::text=pinned->>'id')) then return false;end if;
 end loop;
 for pinned in select value from jsonb_array_elements(coalesce(p_snapshot->'lineage','[]')) loop
  if exists(select 1 from public.project_engineering_revisions v where v.record_id::text=pinned->>'id' and v.revision>(pinned->>'revision')::integer
   and (coalesce(v.content->>'change_dimension','all')='all' or pinned->'dimensions' ? 'all' or pinned->'dimensions' ? (v.content->>'change_dimension'))) then return false;end if;
 end loop;
 return true;
end $$;

create or replace function public.validate_engineering_dimension() returns trigger language plpgsql set search_path=public as $$
begin
 if new.content ? 'change_dimension' and coalesce(new.content->>'change_dimension','') not in ('all','geometry','mass_material','interface','electrical','software','vision','rule','manufacturing','documentation') then raise exception 'Choose a supported change category';end if;
 return new;
end $$;
drop trigger if exists validate_engineering_dimension on public.project_engineering_revisions;
create trigger validate_engineering_dimension before insert on public.project_engineering_revisions for each row execute function public.validate_engineering_dimension();
commit;

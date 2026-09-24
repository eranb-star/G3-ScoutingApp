begin;
-- Prefer actual scoring tables over generic overview prose; keep adjacent table continuations.
create or replace function public.search_frc_official(p_season integer,p_query text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp set statement_timeout='5s' as $$
declare q tsquery;
begin
 if not public.can_read_frc_research() then raise exception 'Evidence access required' using errcode='42501';end if;
 if p_season not between 1992 and 2100 or p_query is null or length(p_query)>200 then raise exception 'Invalid official search';end if;
 q:=websearch_to_tsquery('english',p_query);
 return (with available as (
 select c.id,c.url,s.title,p.body,s.version_hash version,s.seasons,s.scope,s.source_class,s.id source,c.hash,c.locator,
 case when s.url ~* '/manual/' then 'manual' else 'supplement' end kind,
 case when s.url ~* '/manual/' and p_query ~* 'scor|point|ranking|traversal' and p.body ~* 'point[[:space:]]+values|ranking[[:space:]]+point[^.]{0,100}threshold' then 1000 else 0 end + (select count(*) from unnest(tsvector_to_array(to_tsvector('english',p_query))) term where p.search@@plainto_tsquery('english',term))*100 + ts_rank_cd(p.search,q) rank
 from public.frc_corpus_sources s join public.frc_corpus_generations g on g.id=s.generation and g.status='active'
 join public.frc_knowledge_documents d on d.url=s.url and d.season=p_season and d.indexed_sha256=s.version_hash and d.sha256=d.indexed_sha256
 join public.frc_corpus_citations c on c.generation=s.generation and c.source=s.id
 join public.frc_corpus_passages p on p.generation=c.generation and p.hash=c.hash
 where not s.retired and s.metadata->>'extractor'='official-text-v1' and c.id>=1000000
 and s.title !~* '(French|Spanish|Turkish|Chinese|Portuguese|Hebrew|Translation)'
 and (s.url !~* '/manual/' or s.url ~* '/Manual/(HTML/)?[0-9]{4}GameManual\.(pdf|html?)($|[?#])')
 ), matched as (select distinct on(hash) * from available where rank>0 order by hash,rank desc,id),
 ranked as (select *,row_number() over(partition by kind order by rank desc,id) position from matched),
 -- Keep table continuations with their anchor page; duplicate publisher URLs must not consume the context.
 expanded as (
 select a.*,r.position priority,case when a.id=r.id then 0 else 1 end neighbor
 from ranked r join available a on a.source=r.source and
 (a.id=r.id or (r.kind='manual' and r.position<=2 and
 a.locator->>'page' ~ '^[0-9]+$' and r.locator->>'page' ~ '^[0-9]+$' and
 abs((a.locator->>'page')::integer-(r.locator->>'page')::integer)<=1))
 where r.position<=case when r.kind='manual' then 5 else 2 end
 ), unique_passages as (select distinct on(hash) * from expanded order by hash,priority,neighbor,id),
 numbered as (select *,row_number() over(partition by kind order by priority,neighbor,id) chosen from unique_passages),
 selected as (select * from numbered where chosen<=case when kind='manual' then 6 else 2 end)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'url',url,'title',title,'body',body,'version',version,'seasons',seasons,'scope',scope,'source_class',source_class) order by kind,priority,neighbor,id),'[]'::jsonb) from selected);
end$$;
revoke all on function public.search_frc_official(integer,text) from public,anon;
grant execute on function public.search_frc_official(integer,text) to authenticated;
commit;

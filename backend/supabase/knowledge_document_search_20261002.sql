begin;
-- Group complete result sets before pagination; never break evidence citation IDs.
create or replace function public.search_frc_documents(
 p_query text default '',p_topics text[] default '{}',p_seasons integer[] default '{}',
 p_mode text default 'all',p_page integer default 0,p_source text default '',p_teams integer[] default '{}'
) returns jsonb language plpgsql stable security definer set search_path=public,pg_temp set statement_timeout='8s' as $$
declare generation_row public.frc_corpus_generations; result jsonb; query_text tsquery; topic_query tsquery;
begin
 if not public.can_read_frc_research() then raise exception 'Evidence access required' using errcode='42501';end if;
 if p_query is null or length(p_query)>200 or p_page is null or p_page<0 or p_page>10000 or p_mode not in ('all','any') or p_source not in ('','official','team','other') or cardinality(p_topics)>50 or cardinality(p_seasons)>50 or cardinality(p_teams)>50 then raise exception 'Invalid search filters';end if;
 if exists(select 1 from unnest(p_topics) x where not exists(select 1 from public.frc_research_topics t where t.id=x and t.active)) then raise exception 'Selected topic is unavailable';end if;
 select * into generation_row from public.frc_corpus_generations where status='active';
 if not found then raise exception 'Source index is not yet available';end if;
 query_text:=websearch_to_tsquery('english',p_query);
 -- Compile the current taxonomy into indexable tsqueries. New aliases take effect
 -- immediately, without relabelling a source as a reviewed robot fact.
 select string_agg('('||q::text||')',case when p_mode='all' then ' & ' else ' | ' end)::tsquery into topic_query
 from (select t.id,string_agg('('||phraseto_tsquery('english',term)::text||')',' | ')::tsquery q
 from public.frc_research_topics t cross join lateral unnest(array[t.name,t.name_he]||t.synonyms) term
 where t.id=any(p_topics) and numnode(phraseto_tsquery('english',term))>0 group by t.id) topics;
 with matched as materialized (
 select c.id,c.url,c.source,p.body,d.title,d.seasons,d.teams,d.source_class,d.scope,d.version_hash,
 case when numnode(query_text)=0 then 0 else ts_rank_cd(p.search,query_text) end rank
 from public.frc_corpus_passages p join public.frc_corpus_citations c on c.generation=p.generation and c.hash=p.hash
 join public.frc_corpus_sources d on d.generation=c.generation and d.id=c.source
 where p.generation=generation_row.id and not d.retired
 and (p_query='' or p.search@@query_text) and (topic_query is null or p.search@@topic_query)
 and (cardinality(p_seasons)=0 or d.seasons&&p_seasons)
 and (cardinality(p_teams)=0 or d.teams&&p_teams)
 and (p_source='' or d.source_class=p_source)
 ), documents as (
 select source,max(rank) rank,count(*) matched_count from matched group by source
 ), chosen as (
 select * from documents order by rank desc,source limit 10 offset p_page*10
 ), passages as (
 select m.*,d.matched_count,d.rank document_rank,row_number() over(partition by m.source order by m.rank desc,m.id) source_position
 from matched m join chosen d on d.source=m.source
 ), page as (select * from passages where source_position<=3)
 select jsonb_build_object('generation',generation_row.id,'indexedAt',generation_row.created_at,
 'sourceCount',(select count(*) from public.frc_corpus_sources where generation=generation_row.id and not retired),
 'count',(select count(*) from matched),'documentCount',(select count(*) from documents),'page',p_page,
 'rows',coalesce((select jsonb_agg(jsonb_build_object(
 'id',id,'sourceId',source,'matchedCount',matched_count,'url',url,'body',case when p_query='' then left(body,1400) else ts_headline('english',body,query_text,'StartSel=[, StopSel=], MaxWords=100, MinWords=40, MaxFragments=2') end,
 'title',title,'seasons',seasons,'teams',teams,'source_class',source_class,'scope',scope,'version',version_hash)
 order by document_rank desc,source,source_position) from page),'[]'::jsonb)) into result;
 return result;
end$$;
revoke all on function public.search_frc_documents(text,text[],integer[],text,integer,text,integer[]) from public,anon;
grant execute on function public.search_frc_documents(text,text[],integer[],text,integer,text,integer[]) to authenticated;

commit;


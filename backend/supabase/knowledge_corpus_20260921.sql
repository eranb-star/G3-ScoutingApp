begin;
-- Canonical imported text is separate from reviewed assertions. A generation only
-- becomes searchable after its source, passage and occurrence counts reconcile.
create table if not exists public.frc_corpus_generations(
 id text primary key, created_at timestamptz not null default now(),
 status text not null default 'loading' check(status in ('loading','active','retired')),
 expected_sources integer not null, expected_passages integer not null, expected_citations integer not null,
 manifest jsonb not null default '{}'
);
create unique index if not exists frc_corpus_one_active on public.frc_corpus_generations(status) where status='active';
create table if not exists public.frc_corpus_sources(
 generation text not null references public.frc_corpus_generations,id integer not null,
 url text not null check(url ~ '^https://'), version_hash text not null,
 title text not null, seasons integer[] not null default '{}', teams integer[] not null default '{}',
 source_class text not null check(source_class in ('official','team','other')),
 scope text, metadata jsonb not null, retired boolean not null default false,
 primary key(generation,id),unique(generation,url,version_hash)
);
create table if not exists public.frc_corpus_passages(
 generation text not null references public.frc_corpus_generations,hash text not null,
 body text not null,search tsvector generated always as(to_tsvector('english',body)) stored,
 primary key(generation,hash)
);
create table if not exists public.frc_corpus_citations(
 generation text not null,id integer not null,source integer not null,hash text not null,
 url text not null check(url ~ '^https://'),locator jsonb not null,
 primary key(generation,id),
 foreign key(generation,source) references public.frc_corpus_sources(generation,id),
 foreign key(generation,hash) references public.frc_corpus_passages(generation,hash)
);
create index if not exists frc_corpus_lexical on public.frc_corpus_passages using gin(search);
create index if not exists frc_corpus_citation_hash on public.frc_corpus_citations(generation,hash);
create index if not exists frc_corpus_citation_source on public.frc_corpus_citations(generation,source);
create index if not exists frc_corpus_source_seasons on public.frc_corpus_sources using gin(seasons);
create index if not exists frc_corpus_source_teams on public.frc_corpus_sources using gin(teams);
alter table public.frc_corpus_generations enable row level security;
alter table public.frc_corpus_sources enable row level security;
alter table public.frc_corpus_passages enable row level security;
alter table public.frc_corpus_citations enable row level security;
revoke all on public.frc_corpus_generations,public.frc_corpus_sources,public.frc_corpus_passages,public.frc_corpus_citations from anon,authenticated;
-- Access only through bounded functions. No corpus-wide browser download.
create or replace function public.search_frc_corpus(
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
 ), diverse as (
 select *,row_number() over(partition by source order by rank desc,id) source_position from matched
 ), page as (
 select * from diverse order by source_position,rank desc,id limit 10 offset p_page*10
 ) select jsonb_build_object('generation',generation_row.id,'indexedAt',generation_row.created_at,
 'sourceCount',(select count(*) from public.frc_corpus_sources where generation=generation_row.id and not retired),
 'count',(select count(*) from matched),'page',p_page,'rows',coalesce((select jsonb_agg(jsonb_build_object(
 'id',id,'url',url,'body',case when p_query='' then left(body,1400) else ts_headline('english',body,query_text,'StartSel=[, StopSel=], MaxWords=100, MinWords=40, MaxFragments=2') end,
 'title',title,'seasons',seasons,'teams',teams,'source_class',source_class,'scope',scope,'version',version_hash)
 order by source_position,rank desc,id) from page),'[]'::jsonb)) into result;
 return result;
end$$;
revoke all on function public.search_frc_corpus(text,text[],integer[],text,integer,text,integer[]) from public,anon;
grant execute on function public.search_frc_corpus(text,text[],integer[],text,integer,text,integer[]) to authenticated;

create or replace function public.resolve_frc_corpus(p_generation text,p_ids integer[]) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.can_read_frc_research() then raise exception 'Evidence access required' using errcode='42501';end if;
 if cardinality(p_ids)>6 then raise exception 'Select at most six passages';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'url',c.url,'title',s.title,'body',left(p.body,3500),'version',s.version_hash,'seasons',s.seasons,'scope',s.scope,'source_class',s.source_class))
 from public.frc_corpus_citations c join public.frc_corpus_sources s on s.generation=c.generation and s.id=c.source
 join public.frc_corpus_passages p on p.generation=c.generation and p.hash=c.hash
 join public.frc_corpus_generations g on g.id=c.generation and g.status='active'
 where c.generation=p_generation and c.id=any(p_ids) and not s.retired),'[]'::jsonb);
end$$;
revoke all on function public.resolve_frc_corpus(text,integer[]) from public,anon;
grant execute on function public.resolve_frc_corpus(text,integer[]) to authenticated;

create or replace function public.activate_frc_corpus(p_generation text) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare g public.frc_corpus_generations;
begin
 select * into g from public.frc_corpus_generations where id=p_generation for update;
 if not found then raise exception 'Unknown generation';end if;
 if g.expected_sources<>(select count(*) from public.frc_corpus_sources where generation=g.id)
 or g.expected_passages<>(select count(*) from public.frc_corpus_passages where generation=g.id)
 or g.expected_citations<>(select count(*) from public.frc_corpus_citations where generation=g.id) then raise exception 'Incomplete corpus import';end if;
 update public.frc_corpus_generations set status='retired' where status='active' and id<>g.id;
 update public.frc_corpus_generations set status='active' where id=g.id;
end$$;
revoke all on function public.activate_frc_corpus(text) from public,anon,authenticated;
grant execute on function public.activate_frc_corpus(text) to service_role;
commit;

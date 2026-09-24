begin;
alter table public.frc_knowledge_documents add column if not exists indexed_sha256 text;
alter table public.frc_knowledge_documents add column if not exists indexed_at timestamptz;
alter table public.frc_knowledge_documents add column if not exists ingestion_note text;
alter table public.frc_knowledge_documents add column if not exists passage_count integer not null default 0;
alter table public.frc_knowledge_document_versions add column if not exists extraction jsonb;
alter table public.frc_knowledge_check_items add column if not exists ingestion_state jsonb;
alter table public.frc_knowledge_check_items add column if not exists temp_object boolean not null default false;
create table if not exists public.frc_document_text_staging(
 item_id uuid not null references public.frc_knowledge_check_items(id),start_page integer not null,chunks jsonb not null,
 primary key(item_id,start_page)
);
alter table public.frc_document_text_staging enable row level security;
revoke all on public.frc_document_text_staging from public,anon,authenticated;
grant all on public.frc_document_text_staging to service_role;
-- Private temporary publisher bytes. Only the service worker has object access.
-- Removal happens after publication/failure; interrupted jobs are cleaned on later checks.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('frc-ingestion-temp','frc-ingestion-temp',false,25165824,array['application/pdf']) on conflict(id) do nothing;

create or replace function public.stage_frc_document_batch(p_check uuid,p_lease uuid,p_item uuid,p_expected integer,p_state jsonb,p_chunks jsonb)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare run public.frc_knowledge_checks; item public.frc_knowledge_check_items;
begin
 select * into run from public.frc_knowledge_checks where id=p_check for update;
 if not found or run.status<>'running' or run.lease_token is distinct from p_lease or run.lease_until<now() then return false;end if;
 select * into item from public.frc_knowledge_check_items where id=p_item and check_id=p_check and status='pending' for update;
 if not found or coalesce((item.ingestion_state->>'cursor')::integer,0)<>p_expected then return false;end if;
 if p_expected=0 then
  update public.frc_corpus_sources set retired=true where url=item.url and version_hash<>p_state->>'sha';
  update public.frc_knowledge_documents set indexed_sha256=null,ingestion_note='New revision is being indexed.' where season=run.season and url=item.url and sha256<>p_state->>'sha';
 end if;
 if jsonb_typeof(p_chunks)<>'array' or jsonb_array_length(p_chunks)>200 or octet_length(p_chunks::text)>500000 then raise exception 'Invalid batch';end if;
 if p_expected>0 then insert into public.frc_document_text_staging values(p_item,p_expected,p_chunks) on conflict(item_id,start_page) do update set chunks=excluded.chunks where jsonb_array_length(excluded.chunks)>0;end if;
 update public.frc_knowledge_check_items set ingestion_state=p_state,note='Indexing pages: '||coalesce(p_state->>'cursor','1')||' / '||coalesce(p_state->>'pages','pending'),bytes=coalesce(bytes,(p_state->>'bytes')::bigint) where id=p_item;
 return true;
end$$;
revoke all on function public.stage_frc_document_batch(uuid,uuid,uuid,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.stage_frc_document_batch(uuid,uuid,uuid,integer,jsonb,jsonb) to service_role;
create sequence if not exists public.frc_ingestion_source_id start 1000000;
create sequence if not exists public.frc_ingestion_citation_id start 1000000;
revoke all on sequence public.frc_ingestion_source_id,public.frc_ingestion_citation_id from public,anon,authenticated;

-- Fingerprint, retirement and complete publication form one transaction under the job lease.
-- Extracted text is searchable evidence, never an automatically reviewed claim.
create or replace function public.finish_frc_document_ingestion(
 p_check uuid,p_lease uuid,p_item uuid,p_sha text,p_bytes bigint,p_etag text,p_modified text,
 p_chunks jsonb,p_extraction jsonb,p_error text default null
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare item public.frc_knowledge_check_items; run public.frc_knowledge_checks; doc public.frc_knowledge_documents;
 gen text; sid integer; row jsonb; body_hash text; destination text; count_chunks integer; publication_note text; needs_extraction boolean;
begin
 select * into run from public.frc_knowledge_checks where id=p_check for update;
 if not found or run.status<>'running' or run.lease_token is distinct from p_lease or run.lease_until<now() then return false;end if;
 select * into item from public.frc_knowledge_check_items where id=p_item and check_id=p_check and kind='document' and status='pending' for update;
 if not found then return false;end if;
 if item.url !~ ('^https://firstfrc\.blob\.core\.windows\.net/frc'||run.season||'/') then raise exception 'Unapproved document address';end if;
 if not public.finish_frc_check_item(p_check,p_lease,p_item,'fetched','Extracted official source',p_sha,p_bytes,p_etag,p_modified) then return false;end if;
 select * into doc from public.frc_knowledge_documents where season=run.season and url=item.url for update;
 select id into gen from public.frc_corpus_generations where status='active' for update;
 if gen is null then raise exception 'Active source index required';end if;
 -- Also retire older pre-collected copies of this exact URL, not only this importer’s versions.
 update public.frc_corpus_sources set retired=true where generation=gen and url=item.url;
 if p_error is not null then
  update public.frc_knowledge_documents set indexed_sha256=null,indexed_at=null,passage_count=0,ingestion_note=left(p_error,500) where id=doc.id;
  update public.frc_knowledge_check_items set status='failed',note=left(p_error,500) where id=p_item;
  delete from public.frc_document_text_staging where item_id=p_item;
  update public.frc_knowledge_check_items set ingestion_state=null where id=p_item;
  return true;
 end if;
 if jsonb_typeof(p_chunks) is distinct from 'array' or jsonb_array_length(p_chunks) not between 1 and 1500 then raise exception 'Invalid extracted passage count';end if;
 if octet_length(p_chunks::text)>4000000 then raise exception 'Extracted document exceeds publication limit';end if;
 count_chunks:=jsonb_array_length(p_chunks);
 select id,metadata->>'extractor' is distinct from 'official-text-v1' into sid,needs_extraction from public.frc_corpus_sources where generation=gen and url=item.url and version_hash=p_sha;
 if sid is null then
  sid:=nextval('public.frc_ingestion_source_id');
  insert into public.frc_corpus_sources(generation,id,url,version_hash,title,seasons,teams,source_class,scope,metadata)
  values(gen,sid,item.url,p_sha,item.title,array[run.season],'{}','official',
   'Extracted publisher text, not reviewed interpretation. Tables/diagrams must be checked in the original.',
   jsonb_build_object('document_id',doc.id,'extractor','official-text-v1','extraction',p_extraction));
  needs_extraction:=true;
 end if;
 if needs_extraction then
  for row in select value from jsonb_array_elements(p_chunks) loop
   if jsonb_typeof(row->'body') is distinct from 'string' or length(row->>'body') not between 20 and 3000 then raise exception 'Invalid passage text';end if;
   if row#>>'{locator,page}' is not null then
    if (row#>>'{locator,page}')::integer not between 1 and 250 then raise exception 'Invalid page locator';end if;
    destination:=item.url||'#page='||(row#>>'{locator,page}');
   else
    destination:=item.url;
    if row#>>'{locator,anchor}' ~ '^[A-Za-z0-9_.:-]{1,150}$' then destination:=destination||'#'||(row#>>'{locator,anchor}');end if;
   end if;
   body_hash:=encode(sha256(convert_to(row->>'body','UTF8')),'hex');
   insert into public.frc_corpus_passages(generation,hash,body) values(gen,body_hash,row->>'body') on conflict do nothing;
   insert into public.frc_corpus_citations(generation,id,source,hash,url,locator)
   values(gen,nextval('public.frc_ingestion_citation_id'),sid,body_hash,destination,row->'locator');
  end loop;
  update public.frc_corpus_sources set metadata=metadata||jsonb_build_object('extractor','official-text-v1','extraction',p_extraction) where generation=gen and id=sid;
 end if;
 update public.frc_corpus_sources set retired=false where generation=gen and id=sid;
 publication_note:='Indexed '||count_chunks||' passages. Available in search and G3 Assist; extracted text is not a reviewed interpretation.';
 update public.frc_knowledge_documents set indexed_sha256=p_sha,indexed_at=now(),passage_count=count_chunks,ingestion_note=publication_note where id=doc.id;
 update public.frc_knowledge_document_versions set extraction=p_extraction||jsonb_build_object('passages',count_chunks,'indexed_at',now()) where document_id=doc.id and sha256=p_sha;
 update public.frc_knowledge_check_items set note=publication_note where id=p_item;
 delete from public.frc_document_text_staging where item_id=p_item;
 update public.frc_knowledge_check_items set ingestion_state=null where id=p_item;
 -- Keep the existing generation reconciliation contract true for subsequent activation checks.
 update public.frc_corpus_generations set expected_sources=(select count(*) from public.frc_corpus_sources where generation=gen),
 expected_passages=(select count(*) from public.frc_corpus_passages where generation=gen),
 expected_citations=(select count(*) from public.frc_corpus_citations where generation=gen) where id=gen;
 return true;
end$$;
revoke all on function public.finish_frc_document_ingestion(uuid,uuid,uuid,text,bigint,text,text,jsonb,jsonb,text) from public,anon,authenticated;
grant execute on function public.finish_frc_document_ingestion(uuid,uuid,uuid,text,bigint,text,text,jsonb,jsonb,text) to service_role;

update public.frc_knowledge_documents d set indexed_sha256=null,ingestion_note='Existing source requires page-linked extraction on the next check.' where indexed_sha256 is not null and not exists(select 1 from public.frc_corpus_sources s where s.url=d.url and s.version_hash=d.indexed_sha256 and s.metadata->>'extractor'='official-text-v1');

create or replace function public.search_frc_official(p_season integer,p_query text) returns jsonb
language plpgsql stable security definer set search_path=public,pg_temp set statement_timeout='5s' as $$
declare q tsquery;
begin
 if not public.can_read_frc_research() then raise exception 'Evidence access required' using errcode='42501';end if;
 if p_season not between 1992 and 2100 or p_query is null or length(p_query)>200 then raise exception 'Invalid official search';end if;
 q:=websearch_to_tsquery('english',p_query);
 return (with available as (
 select c.id,c.url,s.title,p.body,s.version_hash version,s.seasons,s.scope,s.source_class,s.id source,c.hash,c.locator,
 case when s.url ~* '/manual/' then 'manual' else 'supplement' end kind,(select count(*) from unnest(tsvector_to_array(to_tsvector('english',p_query))) term where p.search@@plainto_tsquery('english',term))*100 + ts_rank_cd(p.search,q) rank
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

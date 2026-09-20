begin;
-- Search runs with caller privileges: existing article/issue RLS remains authoritative.
create index if not exists frc_articles_search_idx on public.frc_knowledge_articles using gin
 (to_tsvector('simple',coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content,''))) where not archived;
create index if not exists robot_issues_knowledge_search_idx on public.robot_issues using gin
 (to_tsvector('simple',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(resolution,''))) where not archived and status='resolved';
create or replace function public.search_frc_team_knowledge(p_query text,p_limit integer default 6)
returns jsonb language plpgsql stable security invoker set search_path=public,pg_temp as $$
declare q tsquery;
begin
 if not public.can_read_frc_research() then raise exception 'Evidence access required' using errcode='42501';end if;
 if p_query is null or length(p_query)>200 or p_limit is null or p_limit<1 or p_limit>12 then raise exception 'Invalid query';end if;
 q:=websearch_to_tsquery('simple',p_query);
 if numnode(q)=0 then return '[]'::jsonb;end if;
 return (with matches as (
 select id::text,'article'::text kind,title,left(coalesce(nullif(summary,''),content),1800) body,subsystem,verified,
 ts_rank_cd(to_tsvector('simple',coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content,'')),q) rank
 from public.frc_knowledge_articles where not archived and to_tsvector('simple',coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content,''))@@q
 union all
 select id::text,'issue','G3-'||issue_number||': '||title,left(coalesce(resolution,''),1800),subsystem,false,
 ts_rank_cd(to_tsvector('simple',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(resolution,'')),q)
 from public.robot_issues where not archived and status='resolved' and to_tsvector('simple',coalesce(title,'')||' '||coalesce(description,'')||' '||coalesce(resolution,''))@@q
 ), page as(select * from matches order by rank desc,id limit p_limit)
 select coalesce(jsonb_agg(to_jsonb(page)-'rank' order by rank desc,id),'[]'::jsonb) from page);
end$$;
revoke all on function public.search_frc_team_knowledge(text,integer) from public,anon;
grant execute on function public.search_frc_team_knowledge(text,integer) to authenticated;
commit;

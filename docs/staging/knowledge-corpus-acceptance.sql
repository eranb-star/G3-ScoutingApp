-- Only run after the complete data transfer. No paid/model calls.
do $$begin
 if exists(select 1 from public.frc_corpus_passages where generation='corpus-535d2f0a0f012cdade6e' and hash<>encode(sha256(convert_to(body,'UTF8')),'hex')) then raise exception 'Passage integrity mismatch';end if;
 if (select encode(sha256(convert_to(string_agg(id||':'||source||':'||hash||':'||url,E'\n' order by id),'UTF8')),'hex') from public.frc_corpus_citations where generation='corpus-535d2f0a0f012cdade6e') is distinct from 'e087bef647185e0b21b3acbd966771c007b4cba5d0e3417b9f53b5632be312aa' then raise exception 'Citation mapping mismatch';end if;
 perform public.activate_frc_corpus('corpus-535d2f0a0f012cdade6e');
end$$;
analyze public.frc_corpus_sources;analyze public.frc_corpus_passages;analyze public.frc_corpus_citations;
select g.id,g.status,
 (select count(*) from public.frc_corpus_sources where generation=g.id) sources,
 (select count(*) from public.frc_corpus_passages where generation=g.id) passages,
 (select count(*) from public.frc_corpus_citations where generation=g.id) citations,
 (select sum(pg_total_relation_size(c.oid)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('frc_corpus_generations','frc_corpus_sources','frc_corpus_passages','frc_corpus_citations')) corpus_bytes,
 (select bool_and(relrowsecurity) from pg_class where oid in ('public.frc_corpus_generations'::regclass,'public.frc_corpus_sources'::regclass,'public.frc_corpus_passages'::regclass,'public.frc_corpus_citations'::regclass)) all_rls_enabled
 from public.frc_corpus_generations g where status='active';

begin;
-- Preserve the deployed routines and their existing grants. A missing/inactive
-- membership returns NULL, which must not bypass these PL/pgSQL IF guards.
do $$
declare f record;definition text;corrected text;
begin
 for f in select p.oid,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in('resolve_scouting_conflict','review_pit_scouting_report','review_absence_request') and p.prosecdef loop
  definition:=pg_get_functiondef(f.oid);
  corrected:=replace(definition,'if public.current_team_role() not in','if coalesce(public.current_team_role(),'''') not in');
  if corrected=definition and position('coalesce(public.current_team_role(),'''') not in' in definition)=0 then raise exception 'Unexpected authorization definition: %',f.proname;end if;
  if corrected<>definition then execute corrected;end if;
 end loop;
end$$;
commit;

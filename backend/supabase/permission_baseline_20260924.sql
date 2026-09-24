-- Tighten existing execution grants; do not create roles or expand access.
begin;
do $$declare f record; signature text; had_member boolean; had_service boolean;
begin
 for f in select p.oid,p.proname,p.prorettype,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef loop
  signature:=f.oid::regprocedure::text;
  -- Trigger bodies and service helpers are never browser RPCs. Definer callers retain execution as their owner.
  if f.prorettype='trigger'::regtype or f.proname in('sync_team_action','close_stale_workshop_sessions','rpc_upsert_event_teams','rpc_upsert_event_matches') then
   execute format('revoke execute on function %s from public,anon,authenticated',signature);
   if f.prorettype<>'trigger'::regtype then execute format('grant execute on function %s to service_role',signature);end if;
  elsif has_function_privilege('anon',f.oid,'EXECUTE') and f.proname not in('verify_guest_code','is_admin','has_permission','current_team_role','current_member_has_team','current_member_leads_team','can_access_team_channel','can_control_competition','can_manage_shared_inventory','is_training_editor','engineering_snapshot_current') then
   had_member:=has_function_privilege('authenticated',f.oid,'EXECUTE');had_service:=has_function_privilege('service_role',f.oid,'EXECUTE');
   execute format('revoke execute on function %s from public,anon',signature);
   if had_member then execute format('grant execute on function %s to authenticated',signature);end if;
   if had_service then execute format('grant execute on function %s to service_role',signature);end if;
  end if;
  if f.proname in('rpc_upsert_event_teams','rpc_upsert_event_matches') then execute format('alter function %s set search_path=public,pg_temp',signature);end if;
 end loop;
end$$;
commit;

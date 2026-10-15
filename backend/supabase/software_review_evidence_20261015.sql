begin;
alter table public.ai_messages add column if not exists software_evidence jsonb;
alter table public.ai_messages add constraint software_evidence_shape check(software_evidence is null or (jsonb_typeof(software_evidence)='object' and octet_length(software_evidence::text)<=150000));
create function public.guard_software_evidence() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='UPDATE' and new.software_evidence is distinct from old.software_evidence then raise exception 'Saved review evidence is immutable';end if;
 if tg_op='INSERT' and new.software_evidence is not null and current_user in ('authenticated','anon') then raise exception 'Only the review service can record source evidence';end if;
 return new;
end$$;
create trigger software_evidence_guard before insert or update on public.ai_messages for each row execute function public.guard_software_evidence();
create policy private_review_permission on public.ai_conversations as restrictive for select to authenticated using(
 lower(coalesce(software_context->>'repository','')) not in ('gluegunandglitter/offseason_2026','gluegunandglitter/rebuilt_practise','gluegunandglitter/rebuilt_2026')
 or public.has_permission('use_private_robot_code',null));
create policy private_review_message_permission on public.ai_messages as restrictive for select to authenticated using(exists(select 1 from public.ai_conversations c where c.id=conversation_id));
create policy private_review_recovery_permission on public.g3_assist_executions as restrictive for select to authenticated using(
 lower(coalesce(result#>>'{body,softwareContext,repository}','')) not in ('gluegunandglitter/offseason_2026','gluegunandglitter/rebuilt_practise','gluegunandglitter/rebuilt_2026')
 or public.has_permission('use_private_robot_code',null));
commit;

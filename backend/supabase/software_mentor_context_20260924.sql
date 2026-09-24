begin;
-- Conversation ownership RLS remains unchanged. The Edge reader independently
-- validates every supplied/stored repository, revision and path before access.
alter table public.ai_conversations add column if not exists software_context jsonb;
alter table public.ai_conversations drop constraint if exists ai_conversation_software_context_size;
alter table public.ai_conversations add constraint ai_conversation_software_context_size
 check (software_context is null or (jsonb_typeof(software_context)='object' and octet_length(software_context::text)<=4000));
commit;

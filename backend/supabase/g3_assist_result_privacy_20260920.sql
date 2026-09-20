-- Preserve financial metadata while honoring deletion of conversation content.
begin;
create index if not exists assist_execution_conversation_result on public.g3_assist_executions((result#>>'{body,conversationId}')) where result is not null;
create or replace function public.finish_g3_assist_execution(p_member uuid,p_request uuid,p_result jsonb,p_failed boolean) returns boolean
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 if p_result is null or p_failed is null or octet_length(p_result::text)>100000 then raise exception 'INVALID_EXECUTION_RESULT'; end if;
 if p_result#>>'{body,answer}' is not null and not exists(
 select 1 from public.ai_conversations where id::text=p_result#>>'{body,conversationId}' and member_id=p_member
 ) then
  update public.g3_assist_executions set state='failed',result=null,updated_at=clock_timestamp()
  where member_id=p_member and request_id=p_request and state='running';
  return false;
 end if;
 update public.g3_assist_executions set state=case when p_failed then 'failed' else 'completed' end,result=p_result,updated_at=clock_timestamp()
 where member_id=p_member and request_id=p_request and state='running' and deadline>clock_timestamp();
 return found;
end; $$;
create or replace function public.clear_deleted_assist_result() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 perform 1 from public.g3_assist_budget_policy where id=true for update;
 update public.g3_assist_executions set result=null,updated_at=clock_timestamp()
 where member_id=OLD.member_id and result#>>'{body,conversationId}'=OLD.id::text;
 return OLD;
end; $$;
drop trigger if exists clear_deleted_assist_result on public.ai_conversations;
create trigger clear_deleted_assist_result before delete on public.ai_conversations for each row execute function public.clear_deleted_assist_result();
revoke all on function public.clear_deleted_assist_result() from public,anon,authenticated;
commit;

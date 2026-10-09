begin;
-- Reuse task assignment and task-context storage. Never copy a private AI answer/code.
create or replace function public.create_reviewed_software_task(p_message uuid,p_request uuid,p_project uuid,p_title text,p_owner uuid,p_due timestamptz,p_members uuid[],p_summary text,p_criterion text) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare m public.ai_messages;c public.ai_conversations;result uuid;team text;body text;
begin
 select subteam into team from public.team_projects where id=p_project and status not in('archived','completed');
 if not found or not coalesce(public.has_permission('assign_team_work',team),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Not authorized to create this task' using errcode='42501';end if;
 if p_request is null or length(trim(coalesce(p_summary,''))) not between 3 and 2000 or length(trim(coalesce(p_criterion,''))) not between 3 and 1000 then raise exception 'Reviewed summary and measurable criterion required';end if;
 select * into m from public.ai_messages where id=p_message and member_id=auth.uid() and role='assistant';
 if not found then raise exception 'Saved answer unavailable or not owned by you' using errcode='42501';end if;
 select * into c from public.ai_conversations where id=m.conversation_id and member_id=auth.uid();
 if not found then raise exception 'Conversation unavailable' using errcode='42501';end if;
 if c.software_context is not null and not coalesce(public.has_permission('use_private_robot_code',null),false) then raise exception 'Private robot code permission required' using errcode='42501';end if;
 body:=trim(p_summary)||E'\n\n'||trim(p_criterion);
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));
 select task_id into result from public.project_task_assist_context where created_by=auth.uid() and request_id=p_request;
 if found then
  if not exists(select 1 from public.project_task_assist_context x join public.project_tasks t on t.id=x.task_id where x.task_id=result and x.source_message=p_message and x.answer=body and x.software_context->>'kind'='reviewed-followup' and t.project_id=p_project and t.title=trim(p_title) and t.assignee_id=p_owner and t.due_at is not distinct from p_due)
   or array(select member_id::text from public.project_task_collaborators where task_id=result order by member_id::text)<>array(select distinct u.member_id::text from unnest(coalesce(p_members,'{}'::uuid[])) u(member_id) where u.member_id<>p_owner order by u.member_id::text)
  then raise exception 'Request already used with different inputs';end if;
  return result;
 end if;
 result:=public.create_task_with_collaborators(p_project,p_title,p_owner,p_due,p_members);
 insert into public.project_task_assist_context(task_id,created_by,request_id,source_message,question,answer,citations,software_context)
 values(result,auth.uid(),p_request,m.id,trim(p_title),body,'[]',jsonb_build_object('kind','reviewed-followup','conversationId',c.id,'sourceOwner',auth.uid(),'criterion',trim(p_criterion)));
 return result;
end$$;
revoke all on function public.create_reviewed_software_task(uuid,uuid,uuid,text,uuid,timestamptz,uuid[],text,text) from public,anon;
grant execute on function public.create_reviewed_software_task(uuid,uuid,uuid,text,uuid,timestamptz,uuid[],text,text) to authenticated;
commit;

begin;
CREATE OR REPLACE FUNCTION public.create_task_from_assist(p_message uuid, p_request uuid, p_project uuid, p_title text, p_owner uuid, p_due timestamp with time zone, p_members uuid[])
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare m public.ai_messages;c public.ai_conversations;question text;result uuid;team text;
begin
 select subteam into team from public.team_projects where id=p_project and status not in('archived','completed');
 if not found or not coalesce(public.has_permission('assign_team_work',team),false) or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Not authorized to create this task' using errcode='42501';end if;
 if p_request is null then raise exception 'Request identity required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request::text,0));
 select task_id into result from public.project_task_assist_context where created_by=auth.uid() and request_id=p_request;
 if found then
  if not exists(select 1 from public.project_task_assist_context x join public.project_tasks t on t.id=x.task_id where x.task_id=result and x.source_message=p_message and t.project_id=p_project and t.title=trim(p_title) and t.assignee_id=p_owner and t.due_at is not distinct from p_due)
   or array(select member_id::text from public.project_task_collaborators where task_id=result order by member_id::text)
      <>array(select distinct selected_member.member_id::text from unnest(coalesce(p_members,'{}'::uuid[])) selected_member(member_id) where selected_member.member_id<>p_owner order by selected_member.member_id::text)
  then raise exception 'This request was already used for a different task or changed inputs. Check the existing task before retrying.';end if;
  return result;
 end if;
 select * into m from public.ai_messages where id=p_message and member_id=auth.uid() and role='assistant';
 if not found then raise exception 'Saved answer unavailable or not owned by you' using errcode='42501';end if;
 select * into c from public.ai_conversations where id=m.conversation_id and member_id=auth.uid();
 if not found then raise exception 'Conversation unavailable' using errcode='42501';end if;
 if c.software_context is not null then raise exception 'Use the reviewed software follow-up flow; private code is not copied into team tasks.' using errcode='42501';end if;
 select content into question from public.ai_messages where conversation_id=m.conversation_id and role='user' and created_at<=m.created_at order by created_at desc limit 1;
 result:=public.create_task_with_collaborators(p_project,p_title,p_owner,p_due,p_members);
 insert into public.project_task_assist_context(task_id,created_by,request_id,source_message,question,answer,citations,software_context)
 values(result,auth.uid(),p_request,m.id,coalesce(question,c.title),m.content,coalesce(m.citations,'[]'),c.software_context);
 return result;
end$function$
;
commit;

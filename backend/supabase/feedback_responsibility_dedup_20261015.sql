begin;
alter table public.team_actions add column if not exists merged_into_action_id uuid references public.team_actions(id);
-- Keep the reviewer item when its recipient is also the submitter. Preserve the
-- most recently selected personal state instead of resetting a deferred item.
create or replace function public.merge_feedback_responsibilities(p_report uuid)
returns void language plpgsql security definer set search_path=public as $$
declare reviewer uuid; submitter uuid; duplicate uuid; previous_reviewer uuid;
begin
 select submitted_by into submitter from public.feedback_reports where id=p_report;
 select a.id into reviewer from public.feedback_reports r
 join public.feedback_review_recipients f on f.report_id=r.id and f.member_id=r.submitted_by
 join public.team_actions a on a.source_table='feedback_reviews' and a.source_id=f.id and not a.cancelled
 where r.id=p_report;
 if reviewer is null then
  -- Demotion/deactivation must not strand the author's own update in a merged item.
  select id,merged_into_action_id into duplicate,previous_reviewer from public.team_actions
  where source_table='feedback_reports' and source_id=p_report and target_value=submitter::text;
  if previous_reviewer is not null then
   insert into public.team_action_states(action_id,member_id,status,snoozed_until,acknowledged_at,completed_at,updated_at)
   select duplicate,member_id,status,snoozed_until,acknowledged_at,completed_at,updated_at from public.team_action_states where action_id=previous_reviewer and member_id=submitter
   on conflict(action_id,member_id) do update set status=excluded.status,snoozed_until=excluded.snoozed_until,acknowledged_at=excluded.acknowledged_at,completed_at=excluded.completed_at,updated_at=excluded.updated_at
   where excluded.updated_at>team_action_states.updated_at;
   update public.team_actions set merged_into_action_id=null,cancelled=(select status in ('resolved','closed') from public.feedback_reports where id=p_report) where id=duplicate;
  end if;
  return;
 end if;
 select id into duplicate from public.team_actions where source_table='feedback_reports' and source_id=p_report and target_type='member' and target_value=submitter::text;
 if duplicate is null then return;end if;
 insert into public.team_action_states(action_id,member_id,status,snoozed_until,acknowledged_at,completed_at,updated_at)
 select reviewer,member_id,status,snoozed_until,acknowledged_at,completed_at,updated_at from public.team_action_states where action_id=duplicate and member_id=submitter
 on conflict(action_id,member_id) do update set status=excluded.status,snoozed_until=excluded.snoozed_until,acknowledged_at=excluded.acknowledged_at,completed_at=excluded.completed_at,updated_at=excluded.updated_at
 where excluded.updated_at>team_action_states.updated_at;
 update public.team_actions set cancelled=true,merged_into_action_id=reviewer where id=duplicate;
end$$;
revoke all on function public.merge_feedback_responsibilities(uuid) from public,anon,authenticated;
create or replace function public.refresh_feedback_review_membership()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record;
begin
 if tg_op='INSERT' or new.role='admin' or old.role='admin' then
  for r in select id from public.feedback_reports where status not in ('resolved','closed') loop
   perform public.sync_feedback_reviews(r.id);
   perform public.merge_feedback_responsibilities(r.id);
  end loop;
 end if;
 return new;
end$$;
create or replace function public.feedback_report_notifications()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 perform public.sync_feedback_reviews(new.id);
 if tg_op='UPDATE' then
  if old.status in ('resolved','closed') and new.status not in ('resolved','closed') then
   update public.team_action_states s set status='new',snoozed_until=null,acknowledged_at=null,completed_at=null,updated_at=now()
   from public.team_actions a,public.feedback_review_recipients f
   where s.action_id=a.id and a.source_table='feedback_reviews' and a.source_id=f.id and f.report_id=new.id;
  end if;
  if new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to then
   perform public.sync_team_action('feedback_reports',new.id,'Feedback update: '||new.title,
    'Status: '||replace(new.status,'_',' ')||case when new.resolution is null then '' else '. '||new.resolution end,
    'other','member',new.submitted_by::text,null,case when new.severity in ('high','critical') then 'high' else 'normal' end,
    '/feedback?report='||new.id,coalesce(new.assigned_to,new.submitted_by),new.status in ('resolved','closed'));
  end if;
 end if;
 perform public.merge_feedback_responsibilities(new.id);
 return new;
end$$;
-- Resolve current duplicate delivery items only; source reports remain intact.
do $$declare r record;begin
 for r in select id from public.feedback_reports loop perform public.merge_feedback_responsibilities(r.id);end loop;
end$$;
commit;

begin;
-- Expose delivery identifiers only to the request owner or authorized reviewer.
-- Do not expose reviewers' action details through the student's RLS context.
create or replace function public.absence_notification_action_ids(p_request uuid)
returns table(action_id uuid) language sql security definer set search_path=public as $$
 select a.id from public.team_actions a join public.absence_requests r on r.id=a.source_id
 where r.id=p_request and not a.cancelled
 and (a.source_table='absence_request_status' or left(a.source_table,15)='absence_review_')
 and exists(select 1 from public.team_members m where m.id=auth.uid() and m.active and (r.member_id=m.id or m.role in ('admin','mentor')));
$$;
revoke all on function public.absence_notification_action_ids(uuid) from public,anon;
grant execute on function public.absence_notification_action_ids(uuid) to authenticated;
commit;

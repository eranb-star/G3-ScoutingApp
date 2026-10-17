begin;
create function public.attendance_student_directory()
returns table(id uuid,display_name text,subteam text,subteams text[],active boolean,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select m.id,m.display_name,m.subteam,m.subteams,m.active,m.created_at from public.team_members m
 where m.role in ('member','team_leader') and not exists(select 1 from public.qa_test_accounts q where q.member_id=m.id)
 and exists(select 1 from public.team_members caller where caller.id=auth.uid() and caller.active)
 and (m.id=auth.uid() or public.current_team_role() in ('admin','mentor') or public.has_permission('view_team_reports',m.subteam) or public.has_permission('correct_attendance'))
 order by m.display_name,m.id;
$$;
revoke all on function public.attendance_student_directory() from public,anon;
grant execute on function public.attendance_student_directory() to authenticated;
create function public.absence_decision_reviewers()
returns table(request_id uuid,reviewer_name text) language sql stable security definer set search_path=public as $$
 select a.id,m.display_name from public.absence_requests a join public.team_members m on m.id=a.reviewed_by
 where exists(select 1 from public.team_members caller where caller.id=auth.uid() and caller.active)
 and (a.member_id=auth.uid() or public.current_team_role() in ('admin','mentor'));
$$;
revoke all on function public.absence_decision_reviewers() from public,anon;
grant execute on function public.absence_decision_reviewers() to authenticated;
commit;

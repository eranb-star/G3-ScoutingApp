-- Archive legacy feedback announcements only when their replacement review exists.
-- The original trigger inserted the announcement in the feedback transaction;
-- both created_at defaults are now(), so they have the same exact timestamp.
-- Never match by title alone. Ambiguous matches are left untouched.
begin;
with matched as (
  select a.id
  from public.announcements a
  join public.feedback_reports r on r.created_at=a.created_at
    and r.submitted_by=a.created_by
    and a.title=(case when r.report_type='bug' then 'New bug report: ' else 'New improvement idea: ' end)||r.title
  where not a.archived and a.audience='admins'
    and right(a.body,length(' submitted feedback for '||r.area||'. Open Feedback Center to review it.'))=
      ' submitted feedback for '||r.area||'. Open Feedback Center to review it.'
    and exists (
      select 1 from public.feedback_review_recipients f
      join public.team_actions t on t.source_table='feedback_reviews' and t.source_id=f.id
      where f.report_id=r.id and not t.cancelled
    )
  group by a.id having count(distinct r.id)=1
), archived as (
  update public.announcements a set archived=true from matched m
  where a.id=m.id returning a.id
), cancelled as (
  update public.team_actions t set cancelled=true from archived a
  where t.source_table='announcements' and t.source_id=a.id returning t.id
)
select (select count(*) from archived) as legacy_announcements_archived,
       (select count(*) from cancelled) as legacy_actions_cancelled;
commit;

-- Administrator feedback queue. Apply after team_media_feedback_center_20260906.sql.
-- Existing reports are preserved; open reports receive review items, without push.
begin;

create table if not exists public.feedback_review_recipients (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  unique(report_id,member_id)
);
alter table public.feedback_review_recipients enable row level security;
revoke all on public.feedback_review_recipients from anon,authenticated;

create or replace function public.sync_feedback_reviews(report uuid)
returns void language plpgsql security definer set search_path=public as $$
declare r public.feedback_reports%rowtype; recipient record;
begin
  select * into r from public.feedback_reports where id=report;
  if not found then return; end if;
  insert into public.feedback_review_recipients(report_id,member_id)
  select r.id,id from public.team_members where role='admin' and active
  on conflict(report_id,member_id) do nothing;
  for recipient in
    select f.id,f.member_id,m.role,m.active from public.feedback_review_recipients f
    join public.team_members m on m.id=f.member_id where f.report_id=r.id
  loop
    perform public.sync_team_action('feedback_reviews',recipient.id,
      'Review feedback: '||r.title,'Feedback Center · '||r.area||' · '||replace(r.status,'_',' '),
      'other','member',recipient.member_id::text,null,
      case when r.severity in ('high','critical') then 'high' else 'normal' end,
      '/feedback?report='||r.id,null,
      r.status in ('resolved','closed') or recipient.role<>'admin' or not recipient.active);
    -- Ownership lets the report submitter request delivery through send-action-push.
    update public.team_actions set created_by=r.submitted_by
    where source_table='feedback_reviews' and source_id=recipient.id;
  end loop;
end$$;
revoke all on function public.sync_feedback_reviews(uuid) from public,anon,authenticated;

create or replace function public.feedback_report_notifications()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.sync_feedback_reviews(new.id);
  if tg_op='UPDATE' then
    if old.status in ('resolved','closed') and new.status not in ('resolved','closed') then
      -- Reopening is a fresh review; preserve the action itself and its identity.
      update public.team_action_states s set status='new',snoozed_until=null,
        acknowledged_at=null,completed_at=null,updated_at=now()
      from public.team_actions a,public.feedback_review_recipients f
      where s.action_id=a.id and a.source_table='feedback_reviews' and a.source_id=f.id and f.report_id=new.id;
    end if;
    if new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to then
      perform public.sync_team_action('feedback_reports',new.id,'Feedback update: '||new.title,
        'Status: '||replace(new.status,'_',' ')||case when new.resolution is null then '' else '. '||new.resolution end,
        'other','member',new.submitted_by::text,null,
        case when new.severity in ('high','critical') then 'high' else 'normal' end,
        '/feedback?report='||new.id,coalesce(new.assigned_to,new.submitted_by),new.status in ('resolved','closed'));
    end if;
  end if;
  return new;
end$$;
drop trigger if exists feedback_report_notify on public.feedback_reports;
create trigger feedback_report_notify after insert or update of status,assigned_to,resolution,title,area,severity
on public.feedback_reports for each row execute function public.feedback_report_notifications();

create or replace function public.cancel_deleted_feedback_review()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  update public.team_actions set cancelled=true where source_table='feedback_reviews' and source_id=old.id;
  return old;
end$$;
drop trigger if exists feedback_review_recipient_deleted on public.feedback_review_recipients;
create trigger feedback_review_recipient_deleted before delete on public.feedback_review_recipients
for each row execute function public.cancel_deleted_feedback_review();

create or replace function public.refresh_feedback_review_membership()
returns trigger language plpgsql security definer set search_path=public as $$
declare r record;
begin
  if tg_op='INSERT' or new.role='admin' or old.role='admin' then
    for r in select id from public.feedback_reports where status not in ('resolved','closed') loop
      perform public.sync_feedback_reviews(r.id);
    end loop;
  end if;
  return new;
end$$;
drop trigger if exists feedback_admin_membership on public.team_members;
create trigger feedback_admin_membership after insert or update of role,active on public.team_members
for each row execute function public.refresh_feedback_review_membership();

create or replace function public.feedback_review_notification_ids(report uuid)
returns table(action_id uuid) language sql security definer set search_path=public as $$
  select a.id from public.team_actions a
  join public.feedback_review_recipients f on a.source_table='feedback_reviews' and a.source_id=f.id
  join public.feedback_reports r on r.id=f.report_id
  where r.id=report and not a.cancelled
    and exists(select 1 from public.team_members m where m.id=auth.uid() and m.active)
    and (r.submitted_by=auth.uid() or public.is_admin());
$$;
revoke all on function public.feedback_review_notification_ids(uuid) from public,anon;
grant execute on function public.feedback_review_notification_ids(uuid) to authenticated;

do $$ declare r record; begin
  for r in select id from public.feedback_reports where status not in ('resolved','closed') loop
    perform public.sync_feedback_reviews(r.id);
  end loop;
end $$;
commit;

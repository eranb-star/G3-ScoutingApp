-- G3 Team Media + Feedback Center.
-- Idempotent shared storage, privacy boundaries and feedback notifications.
begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values
  ('team-media','team-media',false,15728640,array['image/jpeg','image/png','image/webp','image/gif','application/pdf']),
  ('feedback-attachments','feedback-attachments',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.team_media (
  id uuid primary key default gen_random_uuid(),
  title text not null check(length(trim(title)) between 2 and 140),
  caption text,
  category text not null check(category in ('robot','cad','workshop','event','team')),
  media_kind text not null check(media_kind in ('image','drawing','document')),
  storage_path text not null unique,
  mime_type text not null,
  file_name text not null,
  event_date date,
  tags text[] not null default '{}',
  uploaded_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_media_category_date_idx on public.team_media(category,event_date desc,created_at desc);
alter table public.team_media enable row level security;
drop policy if exists "members view team media" on public.team_media;
create policy "members view team media" on public.team_media for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "members upload team media" on public.team_media;
create policy "members upload team media" on public.team_media for insert to authenticated with check(uploaded_by=auth.uid() and public.current_team_role() is not null);
drop policy if exists "owners and leaders update team media" on public.team_media;
create policy "owners and leaders update team media" on public.team_media for update to authenticated using(uploaded_by=auth.uid() or public.current_team_role() in ('admin','mentor')) with check(uploaded_by=auth.uid() or public.current_team_role() in ('admin','mentor'));
drop policy if exists "owners and leaders delete team media" on public.team_media;
create policy "owners and leaders delete team media" on public.team_media for delete to authenticated using(uploaded_by=auth.uid() or public.current_team_role() in ('admin','mentor'));

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null check(report_type in ('idea','bug')),
  title text not null check(length(trim(title)) between 3 and 160),
  details text not null check(length(trim(details)) between 10 and 5000),
  area text not null,
  severity text not null default 'normal' check(severity in ('low','normal','high','critical')),
  status text not null default 'new' check(status in ('new','reviewing','planned','in_progress','resolved','closed')),
  screenshot_path text,
  screenshot_name text,
  submitted_by uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  assigned_to uuid references public.team_members(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists feedback_reports_status_idx on public.feedback_reports(status,severity,created_at desc);
create index if not exists feedback_reports_submitter_idx on public.feedback_reports(submitted_by,created_at desc);
alter table public.feedback_reports enable row level security;
drop policy if exists "submitters and leaders view feedback" on public.feedback_reports;
create policy "submitters and leaders view feedback" on public.feedback_reports for select to authenticated using(submitted_by=auth.uid() or public.current_team_role() in ('admin','mentor'));
drop policy if exists "members submit feedback" on public.feedback_reports;
create policy "members submit feedback" on public.feedback_reports for insert to authenticated with check(submitted_by=auth.uid() and status='new' and assigned_to is null and resolution is null and public.current_team_role() is not null);
drop policy if exists "leaders triage feedback" on public.feedback_reports;
create policy "leaders triage feedback" on public.feedback_reports for update to authenticated using(public.current_team_role() in ('admin','mentor')) with check(public.current_team_role() in ('admin','mentor'));
drop policy if exists "admins delete feedback" on public.feedback_reports;
create policy "admins delete feedback" on public.feedback_reports for delete to authenticated using(public.is_admin());

create table if not exists public.feedback_comments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.feedback_reports(id) on delete cascade,
  body text not null check(length(trim(body)) between 1 and 2000),
  author_id uuid not null references public.team_members(id) on delete restrict default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists feedback_comments_report_idx on public.feedback_comments(report_id,created_at);
alter table public.feedback_comments enable row level security;
drop policy if exists "participants view feedback comments" on public.feedback_comments;
create policy "participants view feedback comments" on public.feedback_comments for select to authenticated using(exists(select 1 from public.feedback_reports r where r.id=report_id and (r.submitted_by=auth.uid() or public.current_team_role() in ('admin','mentor'))));
drop policy if exists "participants add feedback comments" on public.feedback_comments;
create policy "participants add feedback comments" on public.feedback_comments for insert to authenticated with check(author_id=auth.uid() and exists(select 1 from public.feedback_reports r where r.id=report_id and (r.submitted_by=auth.uid() or public.current_team_role() in ('admin','mentor'))));

drop policy if exists "members read team media files" on storage.objects;
create policy "members read team media files" on storage.objects for select to authenticated using(bucket_id='team-media' and public.current_team_role() is not null);
drop policy if exists "members upload own team media files" on storage.objects;
create policy "members upload own team media files" on storage.objects for insert to authenticated with check(bucket_id='team-media' and (storage.foldername(name))[1]=auth.uid()::text and public.current_team_role() is not null);
drop policy if exists "owners and leaders manage team media files" on storage.objects;
create policy "owners and leaders manage team media files" on storage.objects for delete to authenticated using(bucket_id='team-media' and ((storage.foldername(name))[1]=auth.uid()::text or public.current_team_role() in ('admin','mentor')));
drop policy if exists "feedback participants read attachments" on storage.objects;
create policy "feedback participants read attachments" on storage.objects for select to authenticated using(bucket_id='feedback-attachments' and exists(select 1 from public.feedback_reports r where r.screenshot_path=name and (r.submitted_by=auth.uid() or public.current_team_role() in ('admin','mentor'))));
drop policy if exists "members upload own feedback attachments" on storage.objects;
create policy "members upload own feedback attachments" on storage.objects for insert to authenticated with check(bucket_id='feedback-attachments' and (storage.foldername(name))[1]=auth.uid()::text and public.current_team_role() is not null);
drop policy if exists "owners and admins delete feedback attachments" on storage.objects;
create policy "owners and admins delete feedback attachments" on storage.objects for delete to authenticated using(bucket_id='feedback-attachments' and ((storage.foldername(name))[1]=auth.uid()::text or public.is_admin()));

create or replace function public.feedback_report_notifications() returns trigger language plpgsql security definer set search_path=public as $$
declare submitter_name text;
begin
  if tg_op='INSERT' then
    select display_name into submitter_name from public.team_members where id=new.submitted_by;
    insert into public.announcements(title,body,audience,priority,created_by)
    values(case when new.report_type='bug' then 'New bug report: ' else 'New improvement idea: ' end||new.title,
      coalesce(submitter_name,'A team member')||' submitted feedback for '||new.area||'. Open Feedback Center to review it.',
      'admins',case when new.severity in ('high','critical') then 'important' else 'normal' end,new.submitted_by);
  elsif new.status is distinct from old.status or new.assigned_to is distinct from old.assigned_to then
    perform public.sync_team_action('feedback_reports',new.id,'Feedback update: '||new.title,
      'Status: '||replace(new.status,'_',' ')||case when new.resolution is null then '' else '. '||new.resolution end,
      'other','member',new.submitted_by::text,null,case when new.severity in ('high','critical') then 'high' else 'normal' end,
      '/feedback?report='||new.id,coalesce(new.assigned_to,new.submitted_by),new.status in ('resolved','closed'));
  end if;
  return new;
end$$;
drop trigger if exists feedback_report_notify on public.feedback_reports;
create trigger feedback_report_notify after insert or update of status,assigned_to,resolution on public.feedback_reports for each row execute function public.feedback_report_notifications();

commit;

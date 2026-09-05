-- G3 Skills Academy: assignments, tests, submissions and instructor review.
-- Safe to run repeatedly.
begin;

create table if not exists public.training_assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.training_courses(id) on delete cascade,
  module_id uuid references public.training_modules(id) on delete set null,
  title text not null,
  instructions text not null,
  assessment_type text not null default 'assignment' check (assessment_type in ('assignment','quiz','practical','reflection')),
  questions jsonb not null default '[]'::jsonb,
  required boolean not null default true,
  graded boolean not null default false,
  max_score numeric(7,2), passing_score numeric(7,2),
  sort_order integer not null default 100,
  active boolean not null default true,
  created_by uuid references public.team_members(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (max_score is null or max_score > 0),
  check (passing_score is null or (max_score is not null and passing_score between 0 and max_score))
);

create table if not exists public.training_assessment_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.training_assessments(id) on delete cascade,
  enrollment_id uuid not null references public.training_enrollments(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  response text not null default '', answers jsonb not null default '{}'::jsonb, resource_url text,
  status text not null default 'draft' check (status in ('draft','submitted','reviewed','changes_requested')),
  score numeric(7,2), feedback text, submitted_at timestamptz,
  reviewed_by uuid references public.team_members(id) on delete set null, reviewed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (assessment_id,enrollment_id), check (score is null or score >= 0)
);

create index if not exists training_assessments_course_idx on public.training_assessments(course_id,active,sort_order);
create index if not exists training_assessment_submissions_member_idx on public.training_assessment_submissions(member_id,status,updated_at desc);
create index if not exists training_assessment_submissions_review_idx on public.training_assessment_submissions(status,submitted_at) where status in ('submitted','changes_requested');
alter table public.training_assessments enable row level security;
alter table public.training_assessment_submissions enable row level security;

drop policy if exists "members view assessments" on public.training_assessments;
create policy "members view assessments" on public.training_assessments for select to authenticated using(public.current_team_role() is not null);
drop policy if exists "authorized create assessments" on public.training_assessments;
create policy "authorized create assessments" on public.training_assessments for insert to authenticated with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "authorized update assessments" on public.training_assessments;
create policy "authorized update assessments" on public.training_assessments for update to authenticated using(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam))) with check(exists(select 1 from public.training_courses c where c.id=course_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "admins delete assessments" on public.training_assessments;
create policy "admins delete assessments" on public.training_assessments for delete to authenticated using(public.is_admin());

drop policy if exists "members view relevant assessment submissions" on public.training_assessment_submissions;
create policy "members view relevant assessment submissions" on public.training_assessment_submissions for select to authenticated using(member_id=auth.uid() or public.has_permission('validate_training') or exists(select 1 from public.training_assessments a join public.training_courses c on c.id=a.course_id where a.id=assessment_id and public.has_permission('manage_training',c.target_subteam)));
drop policy if exists "members create own assessment submissions" on public.training_assessment_submissions;
create policy "members create own assessment submissions" on public.training_assessment_submissions for insert to authenticated with check(member_id=auth.uid() and exists(select 1 from public.training_enrollments e where e.id=enrollment_id and e.member_id=auth.uid()));
drop policy if exists "members update own draft assessment submissions" on public.training_assessment_submissions;
create policy "members update own draft assessment submissions" on public.training_assessment_submissions for update to authenticated using((member_id=auth.uid() and status in ('draft','changes_requested')) or public.has_permission('validate_training')) with check(member_id=auth.uid() or public.has_permission('validate_training'));

commit;

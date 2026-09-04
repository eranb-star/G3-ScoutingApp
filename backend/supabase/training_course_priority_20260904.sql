alter table public.training_courses
  add column if not exists sort_order integer not null default 100;

with ordered as (
  select id, row_number() over (order by created_at, id) * 10 as position
  from public.training_courses
)
update public.training_courses course
set sort_order = ordered.position
from ordered
where course.id = ordered.id
  and course.sort_order = 100;

create index if not exists training_courses_active_sort_order_idx
  on public.training_courses(active, sort_order, created_at);

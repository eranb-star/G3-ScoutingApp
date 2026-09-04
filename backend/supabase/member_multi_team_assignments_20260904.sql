alter table public.team_members
  add column if not exists subteams text[] not null default '{}';

update public.team_members
set subteams=array[subteam]
where subteam is not null
  and trim(subteam)<>''
  and cardinality(subteams)=0;

create index if not exists team_members_subteams_gin_idx
  on public.team_members using gin(subteams);

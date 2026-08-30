-- G3 communication phase: replies already use parent_message_id; this adds pins and mentions.
begin;
alter table public.channel_messages add column if not exists pinned boolean not null default false;
alter table public.channel_messages add column if not exists pinned_by uuid references public.team_members(id) on delete set null;
alter table public.channel_messages add column if not exists pinned_at timestamptz;
create table if not exists public.channel_message_mentions(
  message_id uuid not null references public.channel_messages(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(message_id,member_id)
);
alter table public.channel_message_mentions enable row level security;
drop policy if exists "members view own mentions" on public.channel_message_mentions;
create policy "members view own mentions" on public.channel_message_mentions for select to authenticated using(member_id=auth.uid() or public.is_admin());
drop policy if exists "message authors create mentions" on public.channel_message_mentions;
create policy "message authors create mentions" on public.channel_message_mentions for insert to authenticated with check(exists(select 1 from public.channel_messages m where m.id=message_id and m.author_id=auth.uid()));
create index if not exists channel_mentions_member_idx on public.channel_message_mentions(member_id,created_at desc);
create index if not exists channel_messages_pinned_idx on public.channel_messages(channel_id,pinned,pinned_at desc);
commit;

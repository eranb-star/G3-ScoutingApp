begin;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.team_members(id) on delete cascade default auth.uid(),
  title text not null default 'New FRC question' check (char_length(title) between 1 and 120),
  language text not null default 'en' check (language in ('en','he')),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  member_id uuid not null references public.team_members(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  attachment_name text,
  attachment_kind text check (attachment_kind is null or attachment_kind in ('screenshot','robot_photo')),
  input_tokens integer not null default 0 check (input_tokens >= 0),
  output_tokens integer not null default 0 check (output_tokens >= 0),
  model text,
  created_at timestamptz not null default now()
);

create index if not exists ai_conversations_member_updated_idx on public.ai_conversations(member_id, updated_at desc);
create index if not exists ai_messages_conversation_created_idx on public.ai_messages(conversation_id, created_at);
create index if not exists ai_messages_member_created_idx on public.ai_messages(member_id, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

drop policy if exists "members manage own ai conversations" on public.ai_conversations;
create policy "members manage own ai conversations" on public.ai_conversations
  for all to authenticated using (member_id=auth.uid()) with check (member_id=auth.uid());

drop policy if exists "members view own ai messages" on public.ai_messages;
create policy "members view own ai messages" on public.ai_messages
  for select to authenticated using (member_id=auth.uid());

drop policy if exists "service writes ai messages" on public.ai_messages;
create policy "service writes ai messages" on public.ai_messages
  for all to service_role using (true) with check (true);

commit;

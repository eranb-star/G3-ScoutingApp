-- Stabilize every mutable channel-message action behind one validated server operation.
begin;

create or replace function public.manage_channel_message(
  target_message uuid,
  requested_action text,
  new_body text default null
)
returns public.channel_messages
language plpgsql
security definer
set search_path=public
as $$
declare
  actor public.team_members;
  existing public.channel_messages;
  changed public.channel_messages;
begin
  select * into actor from public.team_members where id=auth.uid() and active=true;
  if actor.id is null then raise exception 'Active team membership required' using errcode='42501'; end if;
  select * into existing from public.channel_messages where id=target_message;
  if existing.id is null then raise exception 'Message not found' using errcode='P0002'; end if;
  if existing.author_id<>auth.uid() and actor.role<>'admin' then
    raise exception 'Only the author or an administrator can manage this message' using errcode='42501';
  end if;
  if requested_action='edit' then
    if char_length(trim(coalesce(new_body,''))) not between 1 and 5000 then raise exception 'Message must contain 1 to 5000 characters'; end if;
    update public.channel_messages set body=trim(new_body),edited_at=now() where id=target_message returning * into changed;
  elsif requested_action='archive' then
    update public.channel_messages set archived=true,edited_at=now() where id=target_message returning * into changed;
  elsif requested_action='pin' then
    update public.channel_messages set pinned=true,pinned_by=auth.uid(),pinned_at=now() where id=target_message returning * into changed;
  elsif requested_action='unpin' then
    update public.channel_messages set pinned=false,pinned_by=null,pinned_at=null where id=target_message returning * into changed;
  else
    raise exception 'Unsupported message action';
  end if;
  return changed;
end;
$$;

revoke all on function public.manage_channel_message(uuid,text,text) from public;
grant execute on function public.manage_channel_message(uuid,text,text) to authenticated;

-- Keep direct updates available only for the immutable ownership check. The app uses the RPC above.
drop policy if exists "authors and admins update channel messages" on public.channel_messages;
create policy "authors and admins update channel messages" on public.channel_messages
for update to authenticated
using (author_id=auth.uid() or public.is_admin())
with check (author_id=auth.uid() or public.is_admin());

commit;

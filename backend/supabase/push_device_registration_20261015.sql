begin;
-- A device token is a secret supplied by the native Firebase registration, not
-- an arbitrary member identifier. Switching accounts transfers this device only.
create or replace function public.register_push_device(p_token text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active and not must_change_password) then
  raise exception 'An active signed-in member is required' using errcode='42501';
 end if;
 if p_token is null or length(p_token)<32 or length(p_token)>4096 or p_token ~ '[[:space:]]' then raise exception 'Invalid device registration';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_token,1016));
 insert into public.push_tokens(token,member_id,platform,active,updated_at)
 values(p_token,auth.uid(),'android',true,now())
 on conflict(token) do update set member_id=auth.uid(),platform='android',active=true,updated_at=now();
end$$;
revoke all on function public.register_push_device(text) from public,anon;
grant execute on function public.register_push_device(text) to authenticated;
commit;

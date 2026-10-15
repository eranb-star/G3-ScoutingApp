begin;
create table public.software_review_drafts(member_id uuid primary key references public.team_members(id),draft jsonb not null,revision integer not null default 1,updated_at timestamptz not null default now(),check(octet_length(draft::text)<=60000));
alter table public.software_review_drafts enable row level security;
revoke all on public.software_review_drafts from public,anon,authenticated;
grant select on public.software_review_drafts to authenticated;
create policy "owner reads authorized review draft" on public.software_review_drafts for select to authenticated using(member_id=auth.uid() and exists(select 1 from public.team_members where id=auth.uid() and active) and (lower(draft->'selection'->>'repository') not in ('gluegunandglitter/offseason_2026','gluegunandglitter/rebuilt_practise','gluegunandglitter/rebuilt_2026') or public.has_permission('use_private_robot_code',null)));
create function public.save_software_review_draft(p_draft jsonb,p_revision integer)
returns integer language plpgsql security definer set search_path=public as $$
declare current_revision integer; result integer;
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active member required';end if;
 if p_draft is null or jsonb_typeof(p_draft)<>'object' or octet_length(p_draft::text)>60000 or length(coalesce(p_draft->>'question','')) not between 1 and 6000 or jsonb_typeof(p_draft->'selection') is distinct from 'object' or jsonb_typeof(p_draft->'selection'->'paths') is distinct from 'array' then raise exception 'Invalid review draft';end if;
 if jsonb_array_length(p_draft->'selection'->'paths') not between 1 and 12 or coalesce(p_draft->'selection'->>'revision','')!~'^[a-f0-9]{40}$' then raise exception 'Pin a valid source revision';end if;
 if lower(p_draft->'selection'->>'repository') in ('gluegunandglitter/offseason_2026','gluegunandglitter/rebuilt_practise','gluegunandglitter/rebuilt_2026') and not coalesce(public.has_permission('use_private_robot_code',null),false) then raise exception 'Private robot code permission required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1015));
 select revision into current_revision from public.software_review_drafts where member_id=auth.uid() for update;
 if coalesce(current_revision,0) is distinct from p_revision then raise exception 'Draft changed on another device. Reload before replacing it.';end if;
 result:=coalesce(current_revision,0)+1;
 insert into public.software_review_drafts(member_id,draft,revision) values(auth.uid(),p_draft,result) on conflict(member_id) do update set draft=excluded.draft,revision=excluded.revision,updated_at=now();
 return result;
end$$;
revoke all on function public.save_software_review_draft(jsonb,integer) from public,anon;
grant execute on function public.save_software_review_draft(jsonb,integer) to authenticated;
create function public.clear_software_review_draft(p_revision integer) returns boolean language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,1015));
 delete from public.software_review_drafts where member_id=auth.uid() and revision=p_revision;
 return found;
end$$;
revoke all on function public.clear_software_review_draft(integer) from public,anon;
grant execute on function public.clear_software_review_draft(integer) to authenticated;
commit;

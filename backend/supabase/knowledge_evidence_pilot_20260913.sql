begin;
-- Evidence index extends the existing shared knowledge library, not a second chatbot.
create table if not exists public.frc_evidence_sources(
 id text primary key,title text not null,season integer not null check(season between 1992 and 2100),
 authority text not null check(authority in ('manual','update','clarification','technical','team','community')),
 url text not null check(url ~ '^https://[^[:space:]]+$'),revision text not null,
 sha256 text check(sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
 checked_at timestamptz not null default now(),current boolean not null default true,
 rights text not null default 'Link only; source document is not rehosted.'
);
create table if not exists public.frc_evidence_claims(
 id uuid primary key default gen_random_uuid(),source_id text not null references public.frc_evidence_sources(id),
 article_id uuid references public.frc_knowledge_articles(id) on delete set null,
 title text not null check(length(title) between 3 and 180),body text not null check(length(body) between 3 and 1500),
 title_he text,body_he text,locator text not null check(length(locator) between 1 and 200),
 claim_kind text not null default 'fact' check(claim_kind in ('fact','inference','rule')),
 status text not null default 'draft' check(status in ('draft','published','conflicted','withdrawn')),
 revision integer not null default 1,created_by uuid default auth.uid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.frc_evidence_events(
 id bigint generated always as identity primary key,claim_id uuid references public.frc_evidence_claims(id),
 source_id text references public.frc_evidence_sources(id),actor_id uuid,action text not null,note text not null,snapshot jsonb,created_at timestamptz not null default now()
);
create index if not exists frc_evidence_fts on public.frc_evidence_claims using gin(to_tsvector('simple',title||' '||body||' '||coalesce(title_he,'')||' '||coalesce(body_he,'')));
alter table public.frc_evidence_sources enable row level security;
alter table public.frc_evidence_claims enable row level security;
alter table public.frc_evidence_events enable row level security;
drop policy if exists evidence_sources_read on public.frc_evidence_sources;
create policy evidence_sources_read on public.frc_evidence_sources for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active));
drop policy if exists evidence_claims_read on public.frc_evidence_claims;
create policy evidence_claims_read on public.frc_evidence_claims for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active) and (status in ('published','conflicted') or public.is_admin()));
drop policy if exists evidence_events_read on public.frc_evidence_events;
create policy evidence_events_read on public.frc_evidence_events for select to authenticated using(public.is_admin() and exists(select 1 from public.team_members where id=auth.uid() and active));
revoke all on public.frc_evidence_sources,public.frc_evidence_claims,public.frc_evidence_events from public,anon,authenticated;
grant select on public.frc_evidence_sources,public.frc_evidence_claims,public.frc_evidence_events to authenticated;

create or replace function public.curate_frc_evidence(p_id uuid,p_expected integer,p_source text,p_title text,p_body text,p_locator text,p_kind text,p_status text,p_note text)returns uuid
language plpgsql security definer set search_path=public as $$
declare result uuid;s public.frc_evidence_sources%rowtype;c public.frc_evidence_claims%rowtype;
begin
 if not public.is_admin() or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required' using errcode='42501';end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'A review note is required';end if;
 select * into s from public.frc_evidence_sources where id=p_source and current;
 if not found then raise exception 'Current source required';end if;
 if p_kind='rule' and s.authority not in ('manual','update') then raise exception 'Only manuals and official updates establish rules; Q&A clarifies';end if;
 if p_status='published' and s.sha256 is null and s.authority in ('manual','update') then raise exception 'Fingerprint the exact authoritative source before publishing';end if;
 if p_id is null then
  insert into public.frc_evidence_claims(source_id,title,body,locator,claim_kind,status)values(p_source,trim(p_title),trim(p_body),trim(p_locator),p_kind,p_status)returning id into result;
 else
  select * into c from public.frc_evidence_claims where id=p_id for update;
  if not found or c.revision<>p_expected then raise exception 'Evidence changed; refresh before saving';end if;
  insert into public.frc_evidence_events(claim_id,actor_id,action,note,snapshot)values(c.id,auth.uid(),'revision',trim(p_note),to_jsonb(c));
  update public.frc_evidence_claims set source_id=p_source,title=trim(p_title),body=trim(p_body),locator=trim(p_locator),claim_kind=p_kind,status=p_status,revision=revision+1,updated_at=now(),title_he=null,body_he=null where id=p_id returning id into result;
 end if;
 insert into public.frc_evidence_events(claim_id,actor_id,action,note)values(result,auth.uid(),p_status,trim(p_note));return result;
end$$;
create or replace function public.retire_frc_evidence_source(p_source text,p_note text)returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active administrator required';end if;
 if length(trim(coalesce(p_note,'')))<3 then raise exception 'A reason is required';end if;
 update public.frc_evidence_sources set current=false where id=p_source;
 insert into public.frc_evidence_events(source_id,actor_id,action,note)values(p_source,auth.uid(),'source_retired',trim(p_note));
end$$;
revoke all on function public.curate_frc_evidence(uuid,integer,text,text,text,text,text,text,text),public.retire_frc_evidence_source(text,text) from public,anon;
grant execute on function public.curate_frc_evidence(uuid,integer,text,text,text,text,text,text,text),public.retire_frc_evidence_source(text,text) to authenticated;
commit;

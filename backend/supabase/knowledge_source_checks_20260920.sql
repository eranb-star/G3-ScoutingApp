begin;
-- Extend the existing evidence library. No scheduler and no source-document rehosting.
create table if not exists public.frc_knowledge_seasons(
 season integer primary key check(season between 1992 and 2100),
 name text not null check(length(name) between 1 and 100),
 created_at timestamptz not null default now()
);
insert into public.frc_knowledge_seasons(season,name) values
 (2017,'FIRST STEAMWORKS'),(2018,'FIRST POWER UP'),(2019,'Destination: Deep Space'),
 (2020,'INFINITE RECHARGE'),(2021,'INFINITE RECHARGE / At Home'),(2022,'RAPID REACT'),
 (2023,'CHARGED UP'),(2024,'CRESCENDO'),(2025,'REEFSCAPE'),(2026,'REBUILT')
on conflict do nothing;
create table if not exists public.frc_knowledge_watches(
 id uuid primary key default gen_random_uuid(),season integer not null references public.frc_knowledge_seasons,
 title text not null check(length(title) between 1 and 180),url text not null,
 enabled boolean not null default true,
 unique(season,url),
 check(url ~ '^https://www\.firstinspires\.org/resources/library/frc/[a-z0-9/-]+$')
);
insert into public.frc_knowledge_watches(season,title,url) values
 (2026,'Season materials','https://www.firstinspires.org/resources/library/frc/season-materials'),
 (2026,'Playing field','https://www.firstinspires.org/resources/library/frc/playing-field') on conflict do nothing;
create table if not exists public.frc_knowledge_checks(
 id uuid primary key default gen_random_uuid(),season integer not null references public.frc_knowledge_seasons,
 status text not null default 'running' check(status in ('running','complete','attention','cancelled')),
 started_by uuid not null,started_at timestamptz not null default now(),finished_at timestamptz,
 lease_token uuid,lease_until timestamptz,updated_at timestamptz not null default now()
);
create unique index if not exists frc_one_active_check on public.frc_knowledge_checks(season) where status='running';
create table if not exists public.frc_knowledge_check_items(
 id uuid primary key default gen_random_uuid(),check_id uuid not null references public.frc_knowledge_checks,
 url text not null,title text not null,kind text not null check(kind in ('listing','document')),
 status text not null default 'pending' check(status in ('pending','new','updated','unchanged','checked','failed','skipped')),
 note text not null default '',sha256 text,bytes bigint,finished_at timestamptz,
 unique(check_id,url)
);
create table if not exists public.frc_knowledge_documents(
 id uuid primary key default gen_random_uuid(),season integer not null references public.frc_knowledge_seasons,
 url text not null,title text not null,sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes bigint not null,etag text,last_modified text,first_seen_at timestamptz not null default now(),checked_at timestamptz not null default now(),
 changed_at timestamptz not null default now(),unique(season,url)
);
create table if not exists public.frc_knowledge_document_versions(
 id uuid primary key default gen_random_uuid(),document_id uuid not null references public.frc_knowledge_documents,
 sha256 text not null,bytes bigint not null,check_id uuid not null references public.frc_knowledge_checks,
 detected_at timestamptz not null default now(),unique(document_id,sha256)
);
create index if not exists frc_check_items_pending on public.frc_knowledge_check_items(check_id,status);
create index if not exists frc_documents_season on public.frc_knowledge_documents(season,changed_at desc);

create or replace function public.can_manage_frc_sources() returns boolean
language sql stable security definer set search_path=public as $$
 select public.is_admin() and public.has_permission('view_evidence_search') and exists(select 1 from public.team_members where id=auth.uid() and active)
$$;
revoke all on function public.can_manage_frc_sources() from public,anon;
grant execute on function public.can_manage_frc_sources() to authenticated,service_role;

alter table public.frc_knowledge_seasons enable row level security;
alter table public.frc_knowledge_watches enable row level security;
alter table public.frc_knowledge_checks enable row level security;
alter table public.frc_knowledge_check_items enable row level security;
alter table public.frc_knowledge_documents enable row level security;
alter table public.frc_knowledge_document_versions enable row level security;
drop policy if exists knowledge_seasons_read on public.frc_knowledge_seasons;
create policy knowledge_seasons_read on public.frc_knowledge_seasons for select to authenticated using(public.has_permission('view_evidence_search'));
drop policy if exists knowledge_watches_read on public.frc_knowledge_watches;
create policy knowledge_watches_read on public.frc_knowledge_watches for select to authenticated using(public.has_permission('view_evidence_search'));
drop policy if exists knowledge_documents_read on public.frc_knowledge_documents;
create policy knowledge_documents_read on public.frc_knowledge_documents for select to authenticated using(public.has_permission('view_evidence_search'));
drop policy if exists knowledge_versions_read on public.frc_knowledge_document_versions;
create policy knowledge_versions_read on public.frc_knowledge_document_versions for select to authenticated using(public.has_permission('view_evidence_search'));
drop policy if exists knowledge_checks_admin on public.frc_knowledge_checks;
create policy knowledge_checks_admin on public.frc_knowledge_checks for select to authenticated using(public.can_manage_frc_sources());
drop policy if exists knowledge_items_admin on public.frc_knowledge_check_items;
create policy knowledge_items_admin on public.frc_knowledge_check_items for select to authenticated using(public.can_manage_frc_sources());
revoke all on public.frc_knowledge_seasons,public.frc_knowledge_watches,public.frc_knowledge_checks,public.frc_knowledge_check_items,public.frc_knowledge_documents,public.frc_knowledge_document_versions from public,anon,authenticated;
grant select on public.frc_knowledge_seasons,public.frc_knowledge_watches,public.frc_knowledge_checks,public.frc_knowledge_check_items,public.frc_knowledge_documents,public.frc_knowledge_document_versions to authenticated;
grant all on public.frc_knowledge_seasons,public.frc_knowledge_watches,public.frc_knowledge_checks,public.frc_knowledge_check_items,public.frc_knowledge_documents,public.frc_knowledge_document_versions to service_role;

create or replace function public.configure_frc_season(p_season integer,p_name text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 insert into public.frc_knowledge_seasons(season,name) values(p_season,trim(p_name)) on conflict(season) do update set name=excluded.name;
 -- Listings are stable discovery entry points, not guessed future file URLs.
 insert into public.frc_knowledge_watches(season,title,url) values
 (p_season,'Season materials','https://www.firstinspires.org/resources/library/frc/season-materials'),
 (p_season,'Playing field','https://www.firstinspires.org/resources/library/frc/playing-field') on conflict do nothing;
end$$;
create or replace function public.start_frc_source_check(p_season integer) returns uuid
language plpgsql security definer set search_path=public as $$
declare run_id uuid;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(674020,p_season);
 select id into run_id from public.frc_knowledge_checks where season=p_season and status='running';
 if found then return run_id;end if;
 if not exists(select 1 from public.frc_knowledge_watches where season=p_season and enabled) then raise exception 'Configure publication pages for this season first';end if;
 -- Avoid repeated completed checks from multiple tabs or rapid clicks.
 select id into run_id from public.frc_knowledge_checks where season=p_season and status in ('complete','attention') and started_at>now()-interval '1 minute' order by started_at desc limit 1;
 if found then return run_id;end if;
 insert into public.frc_knowledge_checks(season,started_by) values(p_season,auth.uid()) returning id into run_id;
 insert into public.frc_knowledge_check_items(check_id,url,title,kind)
 select run_id,url,title,'listing' from public.frc_knowledge_watches where season=p_season and enabled order by title;
 -- Rotate older discoveries even if removed from today's listing, reserving capacity for new links.
 insert into public.frc_knowledge_check_items(check_id,url,title,kind)
 select run_id,url,title,'document' from public.frc_knowledge_documents where season=p_season order by checked_at limit 20 on conflict do nothing;
 return run_id;
end$$;
create or replace function public.cancel_frc_source_check(p_check uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 update public.frc_knowledge_checks set status='cancelled',finished_at=now(),updated_at=now(),lease_token=null,lease_until=null where id=p_check and status='running';
end$$;
create or replace function public.retry_frc_source_check(p_check uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare run public.frc_knowledge_checks%rowtype; active_id uuid;
begin
 if not public.can_manage_frc_sources() then raise exception 'Active evidence administrator required' using errcode='42501';end if;
 select * into run from public.frc_knowledge_checks where id=p_check;
 if not found then raise exception 'Check not found';end if;
 perform pg_advisory_xact_lock(674020,run.season);
 select id into active_id from public.frc_knowledge_checks where season=run.season and status='running';
 if found then return active_id;end if;
 if not exists(select 1 from public.frc_knowledge_check_items where check_id=p_check and status='failed') then return p_check;end if;
 -- Only failed items are copied; successful source checks are not repeated.
 insert into public.frc_knowledge_checks(season,started_by) values(run.season,auth.uid()) returning id into active_id;
 insert into public.frc_knowledge_check_items(check_id,url,title,kind)
 select active_id,url,title,kind from public.frc_knowledge_check_items where check_id=p_check and status='failed';
 return active_id;
end$$;

-- Worker mutations are service-only; browsers cannot manufacture check results.
create or replace function public.lease_frc_source_check(p_check uuid,p_actor uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare token uuid:=gen_random_uuid();
begin
 if not exists(select 1 from public.team_members where id=p_actor and active) then return null;end if;
 update public.frc_knowledge_checks set lease_token=token,lease_until=now()+interval '90 seconds',updated_at=now()
 where id=p_check and status='running' and (lease_until is null or lease_until<now());
 if not found then return null;end if;return token;
end$$;
create or replace function public.finish_frc_check_item(p_check uuid,p_lease uuid,p_item uuid,p_status text,p_note text,p_sha text default null,p_bytes bigint default null,p_etag text default null,p_modified text default null) returns boolean
language plpgsql security definer set search_path=public as $$
declare item public.frc_knowledge_check_items%rowtype; run public.frc_knowledge_checks%rowtype; doc public.frc_knowledge_documents%rowtype; doc_id uuid; outcome text:=p_status; stale record;
begin
 select * into run from public.frc_knowledge_checks where id=p_check for update;
 if run.status<>'running' or run.lease_token is distinct from p_lease or run.lease_until<now() then return false;end if;
 select * into item from public.frc_knowledge_check_items where id=p_item and check_id=p_check and status='pending' for update;
 if not found then return false;end if;
 if p_status='not_modified' then
  select * into doc from public.frc_knowledge_documents where season=run.season and url=item.url for update;
  if not found then raise exception 'Cannot accept an unchanged response without a recorded document';end if;
  outcome:='unchanged';p_sha:=doc.sha256;p_bytes:=0;
  update public.frc_knowledge_documents set checked_at=now() where id=doc.id;
 elsif p_status='fetched' then
  if item.kind<>'document' or p_sha is null or p_sha !~ '^[a-f0-9]{64}$' or p_bytes is null or p_bytes<1 then raise exception 'Invalid document result';end if;
  select * into doc from public.frc_knowledge_documents where season=run.season and url=item.url;
  outcome:=case when doc.id is null then 'new' when doc.sha256=p_sha then 'unchanged' else 'updated' end;
  insert into public.frc_knowledge_documents(season,url,title,sha256,bytes,etag,last_modified) values(run.season,item.url,item.title,p_sha,p_bytes,p_etag,p_modified)
  on conflict(season,url) do update set title=excluded.title,sha256=excluded.sha256,bytes=excluded.bytes,etag=excluded.etag,last_modified=excluded.last_modified,checked_at=now(),changed_at=case when frc_knowledge_documents.sha256<>excluded.sha256 then now() else frc_knowledge_documents.changed_at end returning id into doc_id;
  insert into public.frc_knowledge_document_versions(document_id,sha256,bytes,check_id) values(doc_id,p_sha,p_bytes,p_check) on conflict do nothing;
  -- Existing reviewed claims keep their original identity and audit trail, but no longer imply current evidence.
  for stale in select id from public.frc_evidence_sources where season=run.season and url=item.url and current and sha256 is not null and sha256<>p_sha for update loop
   update public.frc_evidence_sources set current=false where id=stale.id;
   insert into public.frc_evidence_events(source_id,actor_id,action,note) values(stale.id,run.started_by,'source_changed','Source fingerprint changed; existing evidence needs review. Check '||p_check);
  end loop;
 end if;
 update public.frc_knowledge_check_items set status=outcome,note=left(coalesce(p_note,''),500),sha256=p_sha,bytes=p_bytes,finished_at=now() where id=p_item;
 update public.frc_knowledge_checks set updated_at=now() where id=p_check;
 return true;
end$$;
create or replace function public.release_frc_source_check(p_check uuid,p_lease uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 update public.frc_knowledge_checks r set lease_token=null,lease_until=null,updated_at=now(),
 status=case when exists(select 1 from public.frc_knowledge_check_items where check_id=r.id and status='pending') then 'running' when exists(select 1 from public.frc_knowledge_check_items where check_id=r.id and status in ('failed','skipped')) then 'attention' else 'complete' end,
 finished_at=case when not exists(select 1 from public.frc_knowledge_check_items where check_id=r.id and status='pending') then now() else null end
 where id=p_check and lease_token=p_lease and status='running';
end$$;
revoke all on function public.configure_frc_season(integer,text),public.start_frc_source_check(integer),public.cancel_frc_source_check(uuid),public.retry_frc_source_check(uuid) from public,anon;
grant execute on function public.configure_frc_season(integer,text),public.start_frc_source_check(integer),public.cancel_frc_source_check(uuid),public.retry_frc_source_check(uuid) to authenticated;
revoke all on function public.lease_frc_source_check(uuid,uuid),public.finish_frc_check_item(uuid,uuid,uuid,text,text,text,bigint,text,text),public.release_frc_source_check(uuid,uuid) from public,anon,authenticated;
grant execute on function public.lease_frc_source_check(uuid,uuid),public.finish_frc_check_item(uuid,uuid,uuid,text,text,text,bigint,text,text),public.release_frc_source_check(uuid,uuid) to service_role;
commit;

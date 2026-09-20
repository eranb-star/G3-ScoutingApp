-- Additive article revision and privileged review boundary. Apply before new UI.
begin;
insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order)
values('review_frc_knowledge','Engineering lab','Review team knowledge','אימות ידע קבוצתי','Verify a specific article revision after checking its evidence. Editing invalidates verification.',false,181)
on conflict(permission_key) do update set label=excluded.label,label_he=excluded.label_he,description=excluded.description;
insert into public.role_permissions(role,permission_key,allowed)
select role,'review_frc_knowledge',role in ('admin','mentor')
from (values('member'),('team_leader'),('mentor'),('admin')) r(role)
on conflict(role,permission_key) do nothing;

alter table public.frc_knowledge_articles add column if not exists revision integer not null default 1;
alter table public.frc_knowledge_articles add column if not exists reviewed_by uuid;
alter table public.frc_knowledge_articles add column if not exists reviewed_at timestamptz;

create table if not exists public.frc_article_revisions(
  article_id uuid not null references public.frc_knowledge_articles(id) on delete cascade, revision integer not null, snapshot jsonb not null,
  recorded_by uuid, recorded_at timestamptz not null default now(),
  legacy boolean not null default false, primary key(article_id,revision)
);
create table if not exists public.frc_article_review_events(
  id bigint generated always as identity primary key,
  article_id uuid not null references public.frc_knowledge_articles(id) on delete cascade, revision integer not null,
  decision text not null check(decision in ('verified','withdrawn','invalidated')),
  actor_id uuid, recorded_at timestamptz not null default now()
);
alter table public.frc_article_revisions enable row level security;
alter table public.frc_article_review_events enable row level security;
revoke all on public.frc_article_revisions,public.frc_article_review_events from anon,authenticated;
grant select on public.frc_article_revisions,public.frc_article_review_events to authenticated;
drop policy if exists readable_article_revisions on public.frc_article_revisions;
create policy readable_article_revisions on public.frc_article_revisions for select to authenticated
using(public.current_team_role() is not null and exists(select 1 from public.frc_knowledge_articles a where a.id=article_id and not a.archived));
drop policy if exists readable_article_reviews on public.frc_article_review_events;
create policy readable_article_reviews on public.frc_article_review_events for select to authenticated
using(public.current_team_role() is not null and exists(select 1 from public.frc_knowledge_articles a where a.id=article_id and not a.archived));

-- Preserve legacy labels as historical evidence, not a trusted review decision.
with captured as (
  insert into public.frc_article_revisions(article_id,revision,snapshot,legacy)
  select id,revision,to_jsonb(a),true from public.frc_knowledge_articles a
  on conflict do nothing returning article_id
)
update public.frc_knowledge_articles set verified=false,reviewed_by=null,reviewed_at=null
where id in(select article_id from captured);

create or replace function public.protect_frc_article_review()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare changed boolean;
begin
  if public.current_team_role() is null then raise exception 'Active membership required' using errcode='42501'; end if;
  if TG_OP='INSERT' then
    if NEW.verified then raise exception 'Save a draft before reviewing it' using errcode='42501'; end if;
    NEW.revision:=1; NEW.reviewed_by:=null; NEW.reviewed_at:=null;
    return NEW;
  end if;
  if NEW.id is distinct from OLD.id or NEW.created_by is distinct from OLD.created_by or NEW.created_at is distinct from OLD.created_at then
    raise exception 'Article identity is immutable' using errcode='42501';
  end if;
  changed:=row(NEW.title,NEW.content,NEW.summary,NEW.subsystem,NEW.source_type,NEW.source_url,NEW.related_issue_id,NEW.archived)
    is distinct from row(OLD.title,OLD.content,OLD.summary,OLD.subsystem,OLD.source_type,OLD.source_url,OLD.related_issue_id,OLD.archived);
  NEW.revision:=OLD.revision;
  NEW.reviewed_by:=OLD.reviewed_by; NEW.reviewed_at:=OLD.reviewed_at;
  if changed then
    NEW.revision:=OLD.revision+1;
    NEW.verified:=false; NEW.reviewed_by:=null; NEW.reviewed_at:=null;
    if OLD.verified then
      insert into public.frc_article_review_events(article_id,revision,decision,actor_id)
      values(OLD.id,OLD.revision,'invalidated',auth.uid());
    end if;
  elsif NEW.verified is distinct from OLD.verified then
    if not public.has_permission('review_frc_knowledge') then raise exception 'Knowledge review permission required' using errcode='42501'; end if;
    if NEW.archived then raise exception 'Archived articles cannot be reviewed'; end if;
    NEW.reviewed_by:=case when NEW.verified then auth.uid() else null end;
    NEW.reviewed_at:=case when NEW.verified then now() else null end;
    insert into public.frc_article_review_events(article_id,revision,decision,actor_id)
    values(NEW.id,NEW.revision,case when NEW.verified then 'verified' else 'withdrawn' end,auth.uid());
  end if;
  NEW.updated_at:=now();
  return NEW;
end;
$$;
create or replace function public.capture_frc_article_revision()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.frc_article_revisions(article_id,revision,snapshot,recorded_by)
  values(NEW.id,NEW.revision,to_jsonb(NEW),auth.uid()) on conflict do nothing;
  return NEW;
end;
$$;
revoke all on function public.protect_frc_article_review(),public.capture_frc_article_revision() from public;
drop trigger if exists protect_frc_article_review on public.frc_knowledge_articles;
create trigger protect_frc_article_review before insert or update on public.frc_knowledge_articles for each row execute function public.protect_frc_article_review();
drop trigger if exists capture_frc_article_revision on public.frc_knowledge_articles;
create trigger capture_frc_article_revision after insert or update on public.frc_knowledge_articles for each row execute function public.capture_frc_article_revision();

create or replace function public.review_frc_article(p_article uuid,p_revision integer,p_verified boolean)
returns public.frc_knowledge_articles language plpgsql security definer set search_path=public,pg_temp as $$
declare result public.frc_knowledge_articles;
begin
  if not public.has_permission('review_frc_knowledge') then raise exception 'Knowledge review permission required' using errcode='42501'; end if;
  if p_verified is null then raise exception 'Review decision required'; end if;
  select * into result from public.frc_knowledge_articles where id=p_article and not archived for update;
  if not found then raise exception 'Article not available'; end if;
  if result.revision is distinct from p_revision then raise exception 'Article changed. Reload and review the latest revision.' using errcode='40001'; end if;
  update public.frc_knowledge_articles set verified=p_verified where id=p_article returning * into result;
  return result;
end;
$$;
revoke all on function public.review_frc_article(uuid,integer,boolean) from public;
grant execute on function public.review_frc_article(uuid,integer,boolean) to authenticated;
-- Review goes through the revision-checked RPC; normal clients can edit content only.
revoke update on public.frc_knowledge_articles from public,anon,authenticated;
revoke update(verified,revision,reviewed_by,reviewed_at,id,created_by,created_at) on public.frc_knowledge_articles from public,anon,authenticated;
grant update(title,content,summary,subsystem,source_type,source_url,related_issue_id,archived,updated_at)
on public.frc_knowledge_articles to authenticated;
commit;

begin;
create table public.software_review_findings(
 id uuid primary key, message_id uuid not null references public.ai_messages(id) on delete cascade,
 title text not null check(length(title) between 3 and 180), severity text not null check(severity in ('low','medium','high')),
 source_id text not null, first_line integer not null, last_line integer not null,
 status text not null default 'open' check(status in ('open','addressed','verified','dismissed')),
 note text not null, tested_revision text, revision integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.software_finding_events(
 id uuid primary key,finding_id uuid not null references public.software_review_findings(id) on delete cascade,
 actor_id uuid not null references public.team_members(id),created_at timestamptz not null default now(),
 payload jsonb not null,before_values jsonb,after_values jsonb not null
);
alter table public.software_review_findings enable row level security;
alter table public.software_finding_events enable row level security;
revoke all on public.software_review_findings,public.software_finding_events from public,anon,authenticated;
grant select on public.software_review_findings,public.software_finding_events to authenticated;
create policy finding_owner_read on public.software_review_findings for select to authenticated using(exists(select 1 from public.ai_messages m where m.id=message_id and m.member_id=auth.uid()) and exists(select 1 from public.team_members where id=auth.uid() and active));
create policy finding_event_owner_read on public.software_finding_events for select to authenticated using(exists(select 1 from public.software_review_findings f where f.id=finding_id));
create function public.save_software_finding(p_id uuid,p_message uuid,p_revision integer,p_title text,p_severity text,p_source text,p_first integer,p_last integer,p_status text,p_note text,p_tested_revision text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare m public.ai_messages; f public.software_review_findings; prior public.software_finding_events; source jsonb; payload jsonb; before_values jsonb;
begin
 if not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Active member required';end if;
 select * into m from public.ai_messages where id=p_message and member_id=auth.uid() and role='assistant';
 if not found or m.software_evidence is null then raise exception 'Saved code review required';end if;
 if lower(m.software_evidence#>>'{selection,repository}') in ('gluegunandglitter/offseason_2026','gluegunandglitter/rebuilt_practise','gluegunandglitter/rebuilt_2026') and not coalesce(public.has_permission('use_private_robot_code',null),false) then raise exception 'Private code permission required';end if;
 if p_id is null or p_request is null or p_revision is null or p_title is null or length(trim(p_title)) not between 3 and 180 or p_severity is null or p_severity not in ('low','medium','high') or p_status is null or p_status not in ('open','addressed','verified','dismissed') or length(trim(coalesce(p_note,''))) not between 4 and 4000 then raise exception 'Enter a finding, severity and evidence or reason';end if;
 if p_status in ('addressed','verified') and coalesce(p_tested_revision,'')!~'^[a-f0-9]{40}$' then raise exception 'Enter the exact changed or tested commit';end if;
 select value into source from jsonb_array_elements(m.software_evidence->'rows') where value->>'id'=p_source;
 if source is null or p_first is null or p_last is null or p_first<1 or p_last<p_first or p_last>(source->>'lines')::integer or (source ? 'ranges' and not exists(select 1 from jsonb_array_elements(source->'ranges') r where p_first>=(r->>0)::integer and p_last<=(r->>1)::integer)) then raise exception 'Choose lines actually included in this review';end if;
 payload:=jsonb_build_object('id',p_id,'message',p_message,'revision',p_revision,'title',trim(p_title),'severity',p_severity,'source',p_source,'first',p_first,'last',p_last,'status',p_status,'note',trim(p_note),'tested_revision',nullif(trim(p_tested_revision),''));
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,1016));
 select * into prior from public.software_finding_events where id=p_request;
 if found then if prior.payload<>payload then raise exception 'Request already used for different values';end if;return p_id;end if;
 select * into f from public.software_review_findings where id=p_id for update;
 if found then
  if f.message_id<>p_message or f.revision<>p_revision then raise exception 'Finding changed. Refresh before saving.';end if;
  before_values:=to_jsonb(f);
 else
  if p_revision<>0 or p_status<>'open' then raise exception 'New findings must start open';end if;
 end if;
 insert into public.software_review_findings(id,message_id,title,severity,source_id,first_line,last_line,status,note,tested_revision)
 values(p_id,p_message,trim(p_title),p_severity,p_source,p_first,p_last,p_status,trim(p_note),nullif(trim(p_tested_revision),''))
 on conflict(id) do update set title=excluded.title,severity=excluded.severity,source_id=excluded.source_id,first_line=excluded.first_line,last_line=excluded.last_line,status=excluded.status,note=excluded.note,tested_revision=excluded.tested_revision,revision=software_review_findings.revision+1,updated_at=now()
 returning * into f;
 insert into public.software_finding_events values(p_request,p_id,auth.uid(),now(),payload,before_values,to_jsonb(f));
 return p_id;
end$$;
revoke all on function public.save_software_finding(uuid,uuid,integer,text,text,text,integer,integer,text,text,text,uuid) from public,anon;
grant execute on function public.save_software_finding(uuid,uuid,integer,text,text,text,integer,integer,text,text,text,uuid) to authenticated;
commit;

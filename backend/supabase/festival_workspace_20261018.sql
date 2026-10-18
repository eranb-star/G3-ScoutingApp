begin;
-- Additive workspace: JSON aggregates are changed only by the versioned RPC below.
create table public.festival_workspaces(
 project_id uuid primary key references public.team_projects(id),
 revision integer not null default 1,
 data jsonb not null default '{"events":[],"shifts":[],"availability":[],"checklist":[],"managers":[]}',
 updated_at timestamptz not null default now()
);
create table public.festival_audit(
 id bigint generated always as identity primary key,
 project_id uuid not null references public.festival_workspaces(project_id),
 actor_id uuid not null references public.team_members(id),
 action text not null, revision integer not null, detail jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.festival_workspaces enable row level security;
alter table public.festival_audit enable row level security;
revoke all on public.festival_workspaces,public.festival_audit from anon,authenticated;

create function public.festival_context(p_project uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare w public.festival_workspaces; actor public.team_members; manager boolean; d jsonb;
begin
 select * into actor from team_members where id=auth.uid() and active;
 if not found then raise exception 'Active account required'; end if;
 select * into w from festival_workspaces where project_id=p_project;
 if not found then return null; end if;
 manager:=actor.role in ('admin','team_leader') or (w.data->'managers') ? actor.id::text;
 d:=w.data;
 d:=jsonb_set(d,'{shifts}',coalesce((select jsonb_agg(jsonb_set(s,'{people}',coalesce((select jsonb_agg(a||jsonb_build_object('absence',(select ar.status from absence_requests ar where ar.calendar_event_id=(a->>'calendar')::uuid and ar.member_id=(a->>'member')::uuid))) from jsonb_array_elements(s->'people') a),'[]'))) from jsonb_array_elements(d->'shifts') s),'[]'));
 if not manager then
   d:=jsonb_set(d,'{shifts}',coalesce((select jsonb_agg(s) from jsonb_array_elements(d->'shifts') s where s->>'status'<>'draft' and exists(select 1 from jsonb_array_elements(s->'people') a where a->>'member'=actor.id::text)),'[]'));
   d:=jsonb_set(d,'{availability}',coalesce((select jsonb_agg(a) from jsonb_array_elements(d->'availability') a where a->>'member'=actor.id::text),'[]'));
   d:=jsonb_set(d,'{shifts}',coalesce((select jsonb_agg(jsonb_set(s,'{people}',coalesce((select jsonb_agg(a) from jsonb_array_elements(s->'people') a where a->>'member'=actor.id::text),'[]'))) from jsonb_array_elements(d->'shifts') s),'[]'));
 end if;
 return jsonb_build_object('revision',w.revision,'data',d,'manager',manager,'admin',actor.role='admin',
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',m.display_name,'student',m.role in ('member','team_leader'))) from team_members m where m.active and not exists(select 1 from qa_test_accounts q where q.member_id=m.id) and (manager or m.id=actor.id or exists(select 1 from jsonb_array_elements(d->'shifts') x where x->>'leader'=m.id::text)) and m.role in ('member','team_leader','admin','mentor','limited_mentor')),'[]'),
 'audit',case when manager then coalesce((select jsonb_agg(x) from (select a.action,a.revision,a.created_at,m.display_name as actor from festival_audit a join team_members m on m.id=a.actor_id where a.project_id=p_project order by a.id desc limit 30)x),'[]') else '[]'::jsonb end);
end$$;

create function public.festival_mutate(p_project uuid,p_revision integer,p_action text,p_value jsonb default '{}') returns jsonb
language plpgsql security definer set search_path=public as $$
declare w public.festival_workspaces; actor public.team_members; d jsonb; manager boolean;
 s jsonb; old_s jsonb; a jsonb; b jsonb; ev jsonb; arr jsonb; ppl jsonb; sid text; target text; start_time timestamptz; end_time timestamptz; first_event timestamptz; idx integer; cid uuid; actionid uuid; previous jsonb; notifications jsonb:='[]';
begin
 select * into actor from team_members where id=auth.uid() and active;
 if not found then raise exception 'Active account required'; end if;
 if p_action='initialize' then
   if actor.role<>'admin' then raise exception 'Administrator required'; end if;
   if not exists(select 1 from team_projects where id=p_project and status<>'archived') then raise exception 'Active project required'; end if;
   insert into festival_workspaces(project_id) values(p_project) on conflict do nothing;
   return festival_context(p_project);
 end if;
 select * into w from festival_workspaces where project_id=p_project for update;
 if not found then raise exception 'Festival not initialized'; end if;
 if w.revision<>p_revision then raise exception 'Changed by another person. Reload before saving; your draft is retained.'; end if;
 if exists(select 1 from team_projects where id=p_project and status='archived') then raise exception 'Project archived'; end if;
 d:=w.data; previous:=d;
 perform set_config('g3.festival_write','on',true);
 manager:=actor.role in ('admin','team_leader') or (d->'managers') ? actor.id::text;
 if p_action not in ('availability','acknowledge','request') and not manager then raise exception 'Festival scheduler required'; end if;
 if p_action='managers' then
   if actor.role<>'admin' then raise exception 'Administrator required for scheduler grants'; end if;
   if jsonb_typeof(p_value->'ids') is distinct from 'array' then raise exception 'Select managers'; end if;
   for target in select jsonb_array_elements_text(p_value->'ids') loop
    if not exists(select 1 from team_members m where m.id=target::uuid and m.active and not exists(select 1 from qa_test_accounts q where q.member_id=m.id)) then raise exception 'Invalid scheduler'; end if;
   end loop;
   d:=jsonb_set(d,'{managers}',p_value->'ids');
 elsif p_action='events' then
   if jsonb_typeof(p_value->'events') is distinct from 'array' or jsonb_array_length(p_value->'events')=0 then raise exception 'Nonempty reviewed schedule required'; end if;
   for ev in select * from jsonb_array_elements(p_value->'events') loop
    if coalesce(ev->>'street','')<>'החורש' or coalesce(ev->>'houseNumber','')<>'36' or coalesce(ev->>'point','') not in ('elementary','main') or coalesce(ev->>'date','') not in ('2026-10-29','2026-10-30','2026-10-31') or nullif(ev->>'title','') is null or coalesce((ev->>'duration')::integer,0)<=0 or coalesce(ev->>'id','') !~ '^[0-9]+$' or ev->>'starts' is null or (ev->>'url') is distinct from ('https://2026.hanadiv.org/event-page/'||(ev->>'id')) then raise exception 'Invalid school event'; end if;
    perform (ev->>'starts')::timestamptz;
    if ((ev->>'starts')::timestamptz at time zone 'Asia/Jerusalem')::date<>(ev->>'date')::date then raise exception 'Source date/time mismatch'; end if;
   end loop;
   if (select count(*)<>count(distinct e->>'id') from jsonb_array_elements(p_value->'events') e) then raise exception 'Duplicate source event'; end if;
   d:=jsonb_set(jsonb_set(d,'{events}',p_value->'events'),'{source_checked}',to_jsonb(now()));
 elsif p_action='availability' then
   if not exists(select 1 from team_members m where m.id=actor.id and m.role in ('member','team_leader') and not exists(select 1 from qa_test_accounts q where q.member_id=m.id)) then raise exception 'Student account required'; end if;
   start_time:=(p_value->>'start')::timestamptz; end_time:=(p_value->>'end')::timestamptz;
   if start_time is null or end_time is null or start_time>=end_time or end_time-start_time>interval '24 hours' or (start_time at time zone 'Asia/Jerusalem')::date not between '2026-10-29' and '2026-10-31' then raise exception 'Invalid availability time'; end if;
   arr:=coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'availability') x where not(x->>'member'=actor.id::text and x->>'id'=coalesce(p_value->>'id',''))),'[]');
   if not coalesce((p_value->>'remove')::boolean,false) then arr:=arr||jsonb_build_array(jsonb_build_object('id',coalesce(nullif(p_value->>'id',''),gen_random_uuid()::text),'member',actor.id,'start',start_time,'end',end_time,'note',left(coalesce(p_value->>'note',''),500))); end if;
   d:=jsonb_set(d,'{availability}',arr);
 elsif p_action='settings' then
   if coalesce((p_value->>'target_hours')::numeric,0) not between 0 and 40 then raise exception 'Participation target must be between 0 and 40 hours'; end if;
   d:=jsonb_set(d,'{target_hours}',to_jsonb(coalesce((p_value->>'target_hours')::numeric,0)));
 elsif p_action='checklist' then
   if jsonb_typeof(p_value->'items') is distinct from 'array' then raise exception 'Checklist required'; end if;
   d:=jsonb_set(d,'{checklist}',p_value->'items');
 elsif p_action='shift' then
   sid:=coalesce(nullif(p_value->>'id',''),gen_random_uuid()::text);
   select x into old_s from jsonb_array_elements(d->'shifts') x where x->>'id'=sid;
   start_time:=(p_value->>'start')::timestamptz; end_time:=(p_value->>'end')::timestamptz;
   if start_time is null or end_time is null or start_time>=end_time or end_time-start_time>interval '12 hours' or (start_time at time zone 'Asia/Jerusalem')::date not between '2026-10-29' and '2026-10-31' or coalesce(p_value->>'point','') not in ('elementary','main') or coalesce(p_value->>'kind','') not in ('setup','sales','closing') or coalesce((p_value->>'required')::integer,0) not between 1 and 100 or nullif(trim(p_value->>'title'),'') is null then raise exception 'Invalid shift'; end if;
   if exists(select 1 from jsonb_array_elements(coalesce(old_s->'people','[]')) x where x->>'in' is not null) then raise exception 'Attendance already recorded; preserve this shift and use correction'; end if;
   if jsonb_typeof(p_value->'people') is distinct from 'array' then raise exception 'Select participants'; end if;
   ppl:='[]';
   for a in select * from jsonb_array_elements(p_value->'people') loop
    target:=a->>'member';
    if not exists(select 1 from team_members m where m.id=target::uuid and m.active and not exists(select 1 from qa_test_accounts q where q.member_id=m.id)) then raise exception 'Invalid participant'; end if;
    if exists(select 1 from jsonb_array_elements(ppl) x where x->>'member'=target) then raise exception 'Duplicate participant'; end if;
    if exists(select 1 from jsonb_array_elements(d->'shifts') x cross join lateral jsonb_array_elements(x->'people') y where x->>'id'<>sid and x->>'status'<>'cancelled' and y->>'member'=target and (x->>'start')::timestamptz<end_time and (x->>'end')::timestamptz>start_time) then raise exception 'Student has an overlapping shift'; end if;
    select x into b from jsonb_array_elements(coalesce(old_s->'people','[]')) x where x->>'member'=target;
    ppl:=ppl||jsonb_build_array(jsonb_build_object('member',target,'role',left(coalesce(a->>'role',''),100),'calendar',coalesce(b->>'calendar',gen_random_uuid()::text),'ack',false,'request',b->>'request'));
   end loop;
   if nullif(p_value->>'leader','') is not null and not exists(select 1 from jsonb_array_elements(ppl) x where x->>'member'=p_value->>'leader') then raise exception 'Shift lead must be assigned'; end if;
   s:=jsonb_build_object('id',sid,'title',left(p_value->>'title',150),'point',p_value->>'point','kind',p_value->>'kind','start',start_time,'end',end_time,'required',(p_value->>'required')::integer,'leader',p_value->>'leader','people',ppl,'status','draft','notes',left(coalesce(p_value->>'notes',''),1000));
   -- Published edits require explicit republishing; cancel existing reminders/calendar until then.
   if old_s->>'status' in ('published','cancelled') then raise exception 'Cancel the published shift first, then create its replacement; students must be notified explicitly'; end if;
   d:=jsonb_set(d,'{shifts}',coalesce((select jsonb_agg(x) from jsonb_array_elements(d->'shifts') x where x->>'id'<>sid),'[]')||jsonb_build_array(s));
 elsif p_action in ('publish','cancel','acknowledge','request','resolve_request','attendance') then
   sid:=p_value->>'id'; select x into s from jsonb_array_elements(d->'shifts') x where x->>'id'=sid;
   if s is null then raise exception 'Shift not found'; end if;
   if p_action='publish' then
    if s->>'status'<>'draft' then raise exception 'Only a draft can be published'; end if;
    if jsonb_array_length(s->'people')<(s->>'required')::integer or nullif(s->>'leader','') is null then raise exception 'Fill staffing and choose a shift lead before publishing'; end if;
    if exists(select 1 from jsonb_array_elements(s->'people') x where not exists(select 1 from team_members m where m.id=(x->>'member')::uuid and active and not exists(select 1 from qa_test_accounts q where q.member_id=m.id))) then raise exception 'Assigned account is no longer active'; end if;
    select min((x->>'starts')::timestamptz) into first_event from jsonb_array_elements(d->'events') x where x->>'point'=s->>'point' and x->>'date'=to_char((s->>'start')::timestamptz at time zone 'Asia/Jerusalem','YYYY-MM-DD');
    if first_event is null then raise exception 'Import the reviewed schedule first'; end if;
    if not exists(select 1 from jsonb_array_elements(d->'shifts') x where x->>'kind'='setup' and x->>'point'=s->>'point' and (x->>'start')::timestamptz<=least(first_event,(s->>'start')::timestamptz)-case when s->>'kind'='setup' then interval '0' else interval '1 hour' end and ((x->>'start')::timestamptz at time zone 'Asia/Jerusalem')::date=(first_event at time zone 'Asia/Jerusalem')::date and jsonb_array_length(x->'people')>=(x->>'required')::integer and nullif(x->>'leader','') is not null and (x->>'status'='published' or x->>'id'=sid)) then raise exception 'Publish a staffed setup shift first'; end if;
    if s->>'kind'='setup' and (s->>'start')::timestamptz>first_event-interval '1 hour' then raise exception 'Setup must begin at least one hour before the first activity'; end if;
    s:=jsonb_set(s,'{status}','"published"');
   elsif p_action='cancel' then
    if length(trim(coalesce(p_value->>'reason','')))<3 then raise exception 'Cancellation reason required'; end if;
    if s->>'status'='cancelled' then raise exception 'Already cancelled'; end if;
    s:=jsonb_set(s,'{status}','"cancelled"');
   else
    if s->>'status'<>'published' then raise exception 'Published shift required'; end if;
    target:=case when p_action in ('attendance','resolve_request') then p_value->>'member' else actor.id::text end;
    select ordinality::integer-1 into idx from jsonb_array_elements(s->'people') with ordinality x(value,ordinality) where value->>'member'=target;
    if idx is null then raise exception 'Not assigned to this shift'; end if;
    a:=(s->'people')->idx;
    if p_action='acknowledge' then a:=jsonb_set(a,'{ack}','true');
    elsif p_action='request' then
     if length(trim(coalesce(p_value->>'note','')))<3 then raise exception 'Explain the requested change'; end if;
     a:=(a-'response'-'responded_at'-'responded_by')||jsonb_build_object('request',left(p_value->>'note',1000));
    elsif p_action='resolve_request' then
     if nullif(a->>'request','') is null or length(trim(coalesce(p_value->>'note','')))<3 then raise exception 'Request and response required'; end if;
     a:=a||jsonb_build_object('response',left(p_value->>'note',1000),'responded_at',now(),'responded_by',actor.id);
    else
     if length(trim(coalesce(p_value->>'reason','')))<3 then raise exception 'Attendance audit reason required'; end if;
     start_time:=nullif(p_value->>'in','')::timestamptz; end_time:=nullif(p_value->>'out','')::timestamptz;
     if start_time is null or start_time>now() or end_time>now() or end_time<start_time or (start_time at time zone 'Asia/Jerusalem')::date<>((s->>'start')::timestamptz at time zone 'Asia/Jerusalem')::date then raise exception 'Invalid actual attendance times'; end if;
     if exists(select 1 from jsonb_array_elements(d->'shifts') x cross join lateral jsonb_array_elements(x->'people') y where x->>'id'<>sid and y->>'member'=target and y->>'in' is not null and (y->>'in')::timestamptz<coalesce(end_time,'infinity'::timestamptz) and coalesce((y->>'out')::timestamptz,'infinity'::timestamptz)>start_time) then raise exception 'Actual attendance overlaps another festival shift'; end if;
     a:=a||jsonb_build_object('in',start_time,'out',end_time,'corrected_by',actor.id,'reason',p_value->>'reason');
    end if;
    s:=jsonb_set(s,array['people',idx::text],a);
   end if;
   if p_action in ('publish','cancel') then
    for a in select * from jsonb_array_elements(s->'people') loop
     cid:=(a->>'calendar')::uuid;
     if p_action='publish' then
      insert into team_calendar_events(id,title,description,event_type,starts_at,ends_at,location,target_type,target_value,mandatory,created_by)
      values(cid,'פסטיבל הנדיב · '||(s->>'title'),s->>'notes','fundraising',(s->>'start')::timestamptz,(s->>'end')::timestamptz,case when s->>'point'='elementary' then 'מתחם היסודי' else 'האודיטוריום הגדול' end,'member',a->>'member',true,actor.id);
     else
      update team_calendar_events set cancelled=true where id=cid;
      if found then perform sync_team_action('festival_cancellation',cid,'משמרת פסטיבל בוטלה: '||(s->>'title'),p_value->>'reason','announcement','member',a->>'member',now(),'high','/projects/festival?project='||p_project||'&shift='||sid,actor.id,false); end if;
     end if;
     -- Calendar already generates its canonical action; route it to the concrete festival shift.
     update team_actions set destination='/projects/festival?project='||p_project||'&shift='||sid where source_id=cid and source_table='team_calendar_events';
     select id into actionid from team_actions where source_id=cid and source_table=case when p_action='publish' then 'team_calendar_events' else 'festival_cancellation' end and not cancelled;
     if actionid is not null then notifications:=notifications||to_jsonb(actionid); end if;
    end loop;
   end if;
   d:=jsonb_set(d,'{shifts}',(select jsonb_agg(case when x->>'id'=sid then s else x end) from jsonb_array_elements(d->'shifts') x));
 else raise exception 'Unknown festival action'; end if;
 update festival_workspaces set data=d,revision=revision+1,updated_at=now() where project_id=p_project;
 insert into festival_audit(project_id,actor_id,action,revision,detail) values(p_project,actor.id,p_action,w.revision+1,jsonb_build_object('before',previous,'after',d,'reason',p_value->>'reason'));
 perform set_config('g3.festival_write','off',true);
 return festival_context(p_project)||jsonb_build_object('notification_ids',notifications);
end$$;
revoke all on function public.festival_context(uuid),public.festival_mutate(uuid,integer,text,jsonb) from public,anon;
grant execute on function public.festival_context(uuid),public.festival_mutate(uuid,integer,text,jsonb) to authenticated;

-- Keep calendar edits/cancellations consistent with their authoritative shift.
create function public.guard_festival_calendar() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if exists(select 1 from festival_workspaces w cross join lateral jsonb_array_elements(w.data->'shifts') s cross join lateral jsonb_array_elements(s->'people') a where a->>'calendar'=old.id::text)
 and current_setting('g3.festival_write',true) is distinct from 'on' then
  raise exception 'Manage this event in the festival workspace';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end$$;
create trigger festival_calendar_guard before update or delete on public.team_calendar_events for each row execute function public.guard_festival_calendar();
revoke all on function public.guard_festival_calendar() from public,anon,authenticated;

-- Archiving must not strand published responsibilities or unfinished draft shifts.
create function public.guard_festival_archive() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='archived' and old.status is distinct from new.status and exists(
  select 1 from festival_workspaces w cross join lateral jsonb_array_elements(w.data->'shifts') s
  where w.project_id=new.id and s->>'status'<>'cancelled' and (s->>'end')::timestamptz>now()
 ) then raise exception 'Cancel upcoming festival shifts before archiving the project'; end if;
 return new;
end$$;
create trigger festival_archive_guard before update on public.team_projects for each row execute function public.guard_festival_archive();
revoke all on function public.guard_festival_archive() from public,anon,authenticated;
commit;

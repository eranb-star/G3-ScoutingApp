-- All active members may opt in from inside; existing grant enforcement stays frozen.
begin;
create temporary table auto_scope_before on commit drop as select
 (select md5(coalesce(jsonb_agg(to_jsonb(a) order by id)::text,'')) from public.attendance_records a) as attendance_hash,
 (select md5(coalesce(jsonb_agg(to_jsonb(g) order by id)::text,'')) from public.attendance_auto_grants g) as grants_hash;
alter table auto_scope_before enable row level security;
alter table public.attendance_auto_policy drop constraint attendance_auto_policy_mode_check;
alter table public.attendance_auto_policy add constraint attendance_auto_policy_mode_check check(mode in ('off','observe','enforce','enforce_all'));
create or replace function public.attendance_auto_transition(p_action text,p_member uuid,p_grant uuid,p_data jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare g public.attendance_auto_grants; a public.attendance_records; w public.workshop_locations;
 policy public.attendance_auto_policy; result jsonb; distance double precision; acc double precision; lat double precision; lon double precision;
 n bigint; close_at timestamptz;
begin
 if not exists(select 1 from public.team_members where id=p_member and active and not coalesce(must_change_password,false)) then raise exception 'Active member required';end if;
 select * into policy from public.attendance_auto_policy where singleton for share;
 if p_action='prepare' then
   if policy.mode='off' then raise exception 'Automatic checkout disabled';end if;
   insert into public.attendance_auto_enrollment values(p_member,gen_random_uuid(),now()+interval '2 minutes',p_data->'publicKey')
   on conflict(member_id) do update set nonce=excluded.nonce,expires_at=excluded.expires_at,public_key=excluded.public_key;
   return (select jsonb_build_object('nonce',nonce) from public.attendance_auto_enrollment where member_id=p_member);
 end if;
 if p_action='arm' then
   delete from public.attendance_auto_enrollment where member_id=p_member and nonce=(p_data->>'nonce')::uuid and expires_at>now() and public_key=p_data->'publicKey';
   if not found then raise exception 'Fresh enrollment challenge required';end if;
   select * into a from public.attendance_records where id=(p_data->>'attendanceId')::uuid and member_id=p_member for update;
   if not found or a.checked_out_at is not null then raise exception 'Open attendance required';end if;
 else
   -- Read identity then lock attendance before grant, same order as enrollment.
   select * into g from public.attendance_auto_grants where id=p_grant and member_id=p_member;
   if not found then raise exception 'Unknown grant';end if;
   select * into a from public.attendance_records where id=g.attendance_id for update;
   select * into g from public.attendance_auto_grants where id=p_grant and member_id=p_member for update;
   n:=(p_data->>'sequence')::bigint;
   if n is null or n<1 then raise exception 'Sequence required';end if;
   if n=g.sequence then return g.last_result;end if;
   if n<g.sequence then raise exception 'Old request';end if;
   if p_action='revoke' then
     update public.attendance_auto_grants set state='revoked',sequence=n,last_result='{"state":"revoked"}' where id=g.id;
     return '{"state":"revoked"}'::jsonb;
   end if;
   if g.expires_at<=now() or g.state in ('closed','revoked','observed') then raise exception 'Grant no longer active';end if;
 end if;
 if policy.mode='off' then raise exception 'Automatic checkout disabled';end if;
 if a.checked_out_at is not null or (p_action<>'arm' and a.updated_at is distinct from g.attendance_version) then raise exception 'Attendance changed; automatic checkout cancelled';end if;
 select attendance_closes_at into close_at from public.team_meetings where id=a.meeting_id and status='open';
 if close_at is null or close_at<=now() then raise exception 'Workshop no longer open';end if;
 select * into w from public.workshop_locations where active;
 if not found or (p_action<>'arm' and (w.updated_at is distinct from g.location_version or w.latitude<>g.latitude or w.longitude<>g.longitude or w.radius_m+50<>g.radius_m)) then raise exception 'Workshop location changed';end if;
 if p_action='cancel' then
   result:='{"state":"armed"}'::jsonb;
   update public.attendance_auto_grants set state='armed',challenge=null,candidate_at=null,sequence=n,last_result=result where id=g.id;
   return result;
 end if;
 if p_action='status' then
   result:=jsonb_build_object('state',g.state);
   update public.attendance_auto_grants set sequence=n,last_result=result where id=g.id;
   return result;
 end if;
 lat:=(p_data->>'latitude')::double precision;lon:=(p_data->>'longitude')::double precision;acc:=(p_data->>'accuracy')::double precision;
 if lat is null or lon is null or acc is null or not(lat between -90 and 90) or not(lon between -180 and 180) or not(acc between 0 and 50) then raise exception 'Accurate location required';end if;
 if not coalesce((p_data->>'ageMs')::double precision between 0 and 60000,false) or coalesce((p_data->>'mock')::boolean,true) then raise exception 'Fresh non-mock location required';end if;
 distance:=6371000*2*asin(sqrt(least(1.0,power(sin(radians(lat-w.latitude)/2),2)+cos(radians(lat))*cos(radians(w.latitude))*power(sin(radians(lon-w.longitude)/2),2))));
 if p_action='arm' then
   if distance+acc>w.radius_m then raise exception 'Enrollment requires location inside workshop';end if;
   if p_data->'publicKey'->>'kty'<>'RSA' or length(coalesce(p_data->'publicKey'->>'n',''))<340 then raise exception 'Device key required';end if;
   update public.attendance_auto_grants set state='revoked' where attendance_id=a.id and state in ('armed','pending');
   insert into public.attendance_auto_grants(attendance_id,member_id,public_key,latitude,longitude,radius_m,location_version,attendance_version,expires_at,enforce)
   values(a.id,p_member,p_data->'publicKey',w.latitude,w.longitude,w.radius_m+50,w.updated_at,a.updated_at,least(close_at,now()+interval '12 hours'),(policy.mode='enforce_all' or (policy.mode='enforce' and p_member=any(policy.pilot_members)))) returning * into g;
   return jsonb_build_object('grantId',g.id,'state','armed','latitude',g.latitude,'longitude',g.longitude,'radius',g.radius_m,'expiresAt',g.expires_at,'expiresInMs',floor(extract(epoch from (g.expires_at-now()))*1000),'mode',case when (policy.mode='enforce_all' or (policy.mode='enforce' and p_member=any(policy.pilot_members))) then 'enforce' else 'observe' end);
 end if;
 if distance-acc<=g.radius_m then raise exception 'Location is not confidently outside';end if;
 if p_action='begin' and g.state='armed' then
   result:=jsonb_build_object('state','pending','challenge',gen_random_uuid());
   update public.attendance_auto_grants set state='pending',candidate_at=now(),challenge=(result->>'challenge')::uuid,sequence=n,last_result=result where id=g.id;
 elsif p_action='confirm' and g.state='pending' then
   if (p_data->>'challenge')::uuid is distinct from g.challenge or now()<g.candidate_at+interval '5 minutes' or now()>g.candidate_at+interval '15 minutes' then raise exception 'Exit confirmation expired or premature';end if;
   if g.enforce and (policy.mode='enforce_all' or (policy.mode='enforce' and p_member=any(policy.pilot_members))) then
     update public.attendance_records set checked_out_at=greatest(a.checked_in_at,g.candidate_at),check_out_method='geofence',check_out_distance_m=round(distance),check_out_accuracy_m=round(acc),updated_at=now() where id=a.id;
     result:=jsonb_build_object('state','closed','checkedOutAt',g.candidate_at);
   else result:=jsonb_build_object('state','observed','detectedAt',g.candidate_at);end if;
   insert into public.attendance_audit_log(attendance_id,actor_id,action,reason,previous_values,new_values)
   values(a.id,p_member,'geofence_'||(result->>'state'),'Verified device exit; server-time anchored',jsonb_build_object('checked_out_at',a.checked_out_at),result);
   update public.attendance_auto_grants set state=result->>'state',completed_at=now(),sequence=n,last_result=result where id=g.id;
 else raise exception 'Invalid transition';end if;
 return result;
end$$;
revoke all on function public.attendance_auto_transition(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.attendance_auto_transition(text,uuid,uuid,jsonb) to service_role;
do $$ begin
 if exists(select 1 from auto_scope_before b where b.attendance_hash is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(a) order by id)::text,'')) from public.attendance_records a) or b.grants_hash is distinct from (select md5(coalesce(jsonb_agg(to_jsonb(g) order by id)::text,'')) from public.attendance_auto_grants g)) then raise exception 'Existing attendance or grants changed'; end if;
end $$;
commit;

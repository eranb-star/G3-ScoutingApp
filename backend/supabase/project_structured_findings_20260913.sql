begin;
-- Extend the existing finding and audit; do not create a parallel test ledger.
create or replace function public.record_structured_requirement_result(
 p_submission uuid,p_requirement uuid,p_result text,p_evidence integer,p_note text,
 p_configuration_id uuid default null,p_expires_at timestamptz default null,p_measurement jsonb default null
) returns void language plpgsql security definer set search_path=public as $$
declare method text; sample_count numeric;
begin
 perform pg_advisory_xact_lock(6740,911);
 select r->>'method' into method from public.project_review_submissions s cross join lateral jsonb_array_elements(s.requirements) r
 where s.id=p_submission and r->>'id'=p_requirement::text;
 if method in ('test','demonstration') then
  if p_measurement is null or jsonb_typeof(p_measurement)<>'object'
   or jsonb_typeof(p_measurement->'value') is distinct from 'number'
   or jsonb_typeof(p_measurement->'samples') is distinct from 'number'
   or length(trim(coalesce(p_measurement->>'unit',''))) not between 1 and 40
   or length(trim(coalesce(p_measurement->>'instrument',''))) not between 2 and 200
   or length(trim(coalesce(p_measurement->>'conditions',''))) not between 3 and 2000
   or length(trim(coalesce(p_measurement->>'asset',''))) not between 2 and 200
   or length(trim(coalesce(p_measurement->>'calibration',''))) not between 2 and 500
  then raise exception 'Record measured value, unit, samples, instrument, calibration/reference, conditions and physical asset';end if;
  sample_count:=(p_measurement->>'samples')::numeric;
  if sample_count<1 or sample_count>1000000 or trunc(sample_count)<>sample_count then raise exception 'Sample count must be a whole number from 1 to 1000000';end if;
  if octet_length(p_measurement::text)>6000 then raise exception 'Measurement record is too large';end if;
 end if;
 -- Existing function owns permission, current revision, evidence, waiver and physical configuration checks.
 perform public.record_configured_requirement_result(p_submission,p_requirement,p_result,p_evidence,p_note,p_configuration_id,p_expires_at);
 if method in ('test','demonstration') then
  update public.project_review_submissions set requirement_results=jsonb_set(requirement_results,array[p_requirement::text,'measurement'],
   jsonb_build_object('value',(p_measurement->>'value')::numeric,'unit',trim(p_measurement->>'unit'),
    'samples',sample_count,'instrument',trim(p_measurement->>'instrument'),'calibration',trim(p_measurement->>'calibration'),
    'conditions',trim(p_measurement->>'conditions'),'asset',trim(p_measurement->>'asset'),'evidence_class','physical')) where id=p_submission;
  insert into public.project_review_audit(task_id,action,actor_id,note)
   select task_id,'physical_measurement_recorded',auth.uid(),p_requirement::text||' | '||p_measurement::text from public.project_review_submissions where id=p_submission;
 end if;
end $$;
revoke all on function public.record_structured_requirement_result(uuid,uuid,text,integer,text,uuid,timestamptz,jsonb) from public,anon;
grant execute on function public.record_structured_requirement_result(uuid,uuid,text,integer,text,uuid,timestamptz,jsonb) to authenticated;
commit;

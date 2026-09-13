begin;
create or replace function public.configure_engineering_requirements(p_task uuid,p_reviewer uuid,p_requirements jsonb,p_reason text default '') returns void
language plpgsql security definer set search_path=public as $$
declare r jsonb;rule jsonb;normalized jsonb:='[]';criteria text:='';n integer:=0;minimum numeric;maximum numeric;tolerance numeric;
begin
 perform pg_advisory_xact_lock(6740,911);
 if p_requirements is null or jsonb_typeof(p_requirements)<>'array' or jsonb_array_length(p_requirements) not between 1 and 10 then raise exception 'Add between 1 and 10 requirements';end if;
 for r in select value from jsonb_array_elements(p_requirements) loop
  if jsonb_typeof(r)<>'object' or length(trim(coalesce(r->>'requirement',''))) not between 3 and 160 or length(trim(coalesce(r->>'acceptance',''))) not between 3 and 600 or coalesce(r->>'method','') not in ('inspection','test','analysis','demonstration') then raise exception 'Each requirement needs its description, acceptance criterion and method';end if;
  rule:=null;
  if r->'numeric_rule' is not null and r->'numeric_rule'<>'null'::jsonb then
   if r->>'method' not in ('test','demonstration') then raise exception 'Measured numeric criteria require a test or demonstration method';end if;
   if jsonb_typeof(r->'numeric_rule')<>'object' or length(trim(coalesce(r->'numeric_rule'->>'unit',''))) not between 1 and 40 then raise exception 'Numeric criteria require a canonical unit';end if;
   if exists(select 1 from jsonb_each_text(r->'numeric_rule') x where key in ('minimum','maximum','tolerance') and value is not null and value<>'' and (length(value)>50 or value !~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$')) then raise exception 'Range boundaries and tolerance must be finite numbers';end if;
   minimum:=nullif(r->'numeric_rule'->>'minimum','')::numeric;maximum:=nullif(r->'numeric_rule'->>'maximum','')::numeric;tolerance:=coalesce(nullif(r->'numeric_rule'->>'tolerance','')::numeric,0);
   if (minimum is null and maximum is null) or minimum>maximum or tolerance<0 or abs(minimum)>1e12 or abs(maximum)>1e12 or tolerance>1e12 then raise exception 'Choose an ordered range with at least one boundary and nonnegative tolerance';end if;
   rule:=jsonb_build_object('unit',trim(r->'numeric_rule'->>'unit'),'minimum',minimum,'maximum',maximum,'tolerance',tolerance);
  end if;
  n:=n+1;
  normalized:=normalized||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'requirement',trim(r->>'requirement'),'acceptance',trim(r->>'acceptance'),'method',r->>'method','numeric_rule',rule));
  criteria:=criteria||case when n>1 then E'\n\n' else '' end||'R'||n||': '||trim(r->>'requirement')||E'\nAcceptance: '||trim(r->>'acceptance')||E'\nVerification: '||(r->>'method')||case when rule is null then '' else E'\nNumeric rule: '||rule::text end;
 end loop;
 if length(criteria)>4000 then raise exception 'Keep combined requirements within 4000 characters';end if;
 perform public.configure_project_review(p_task,p_reviewer,criteria,p_reason);
 update public.project_review_gates set requirements=normalized where task_id=p_task and requirements='[]'::jsonb;
end $$;
revoke all on function public.configure_engineering_requirements(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.configure_engineering_requirements(uuid,uuid,jsonb,text) to authenticated;
create or replace function public.guard_engineering_numeric_criteria()returns trigger language plpgsql set search_path=public as $$
declare r jsonb;rule jsonb;finding jsonb;value numeric;
begin
 if new.requirement_results is distinct from old.requirement_results or (new.status is distinct from old.status and new.status in ('approved','overridden')) then
  for r in select x.value from jsonb_array_elements(new.requirements) x loop
   rule:=r->'numeric_rule';finding:=new.requirement_results->(r->>'id');
   if rule is null or rule='null'::jsonb or finding->>'result'='waived' then continue;end if;
   if finding->>'result'='passed' then
    if finding->'measurement' is null and new.status='pending' then continue;end if;
    if finding->'measurement'->>'unit' is distinct from rule->>'unit' or jsonb_typeof(finding->'measurement'->'value') is distinct from 'number' then raise exception 'Numeric findings must use the criterion canonical unit and a measured value';end if;
    value:=(finding->'measurement'->>'value')::numeric;
    if value<(rule->>'minimum')::numeric-(rule->>'tolerance')::numeric or value>(rule->>'maximum')::numeric+(rule->>'tolerance')::numeric then raise exception 'A measured value outside the allowed range cannot pass; record failure or an authorized waiver';end if;
   end if;
  end loop;
 end if;
 return new;
end $$;
drop trigger if exists guard_engineering_numeric_criteria on public.project_review_submissions;
create trigger guard_engineering_numeric_criteria before update on public.project_review_submissions for each row execute function public.guard_engineering_numeric_criteria();
commit;

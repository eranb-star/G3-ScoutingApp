begin;
create table if not exists public.robot_build_change_decisions(
 id uuid primary key,sequence bigint generated always as identity unique,
 line_id uuid not null references public.robot_build_bom_lines(id),candidate_id uuid references public.robot_build_bom_lines(id),
 line_revision integer not null,candidate_revision integer,decision text not null check(decision in ('continue_old','adopt_unstarted','rework','quarantine','cancel_remaining','defer')),
 review_task_id uuid not null unique references public.project_tasks(id),review_submission_id uuid references public.project_review_submissions(id),
 scope_snapshot jsonb not null,proposed_by uuid not null references public.team_members(id),note text not null,
 created_at timestamptz not null default now(),activated_at timestamptz
);
alter table public.robot_build_change_decisions enable row level security;
revoke all on public.robot_build_change_decisions from public,anon,authenticated;
grant select on public.robot_build_change_decisions to authenticated;
drop policy if exists build_change_read on public.robot_build_change_decisions;
create policy build_change_read on public.robot_build_change_decisions for select to authenticated using(exists(select 1 from public.robot_build_bom_lines where id=line_id) and (candidate_id is null or exists(select 1 from public.robot_build_bom_lines where id=candidate_id)));

create or replace function public.propose_robot_build_change(p_line uuid,p_candidate uuid,p_expected integer,p_candidate_expected integer,p_decision text,p_review uuid,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.robot_build_bom_lines%rowtype;c public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;prior public.robot_build_change_decisions%rowtype;snapshot jsonb;
begin
 perform pg_advisory_xact_lock(6740,911);select * into l from public.robot_build_bom_lines where id=p_line;select * into b from public.robot_build_boms where id=l.bom_id;
 if l.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=b.project_id and public.has_permission('assign_team_work',subteam) and status not in ('archived','completed')) or not(b.shared_at is not null or b.owner_id=auth.uid()) then raise exception 'Active project leader with source access required';end if;
 select * into prior from public.robot_build_change_decisions where id=p_request;
 if prior.id is not null then
 if prior.line_id=p_line and prior.candidate_id is not distinct from p_candidate and prior.line_revision=p_expected and prior.candidate_revision is not distinct from p_candidate_expected and prior.decision=p_decision and prior.review_task_id=p_review and prior.proposed_by=auth.uid() and prior.note=trim(p_note) then return prior.id;end if;raise exception 'Request identity already used';end if;
 if p_request is null or l.revision is distinct from p_expected or p_decision is null or p_decision not in ('continue_old','adopt_unstarted','rework','quarantine','cancel_remaining','defer') or length(trim(coalesce(p_note,''))) not between 5 and 4000 then raise exception 'Choose current requirement, disposition and engineering rationale';end if;
 if p_candidate is not null then
 select * into c from public.robot_build_bom_lines where id=p_candidate;
 if c.id is null or c.id=l.id or c.revision is distinct from p_candidate_expected or not exists(select 1 from public.robot_build_boms where id=c.bom_id and project_id=b.project_id and (shared_at is not null or owner_id=auth.uid())) then raise exception 'Choose an accessible candidate revision in this build';end if;
 elsif p_candidate_expected is not null or p_decision='adopt_unstarted' then raise exception 'Candidate required for adoption';end if;
 if not exists(select 1 from public.project_tasks t join public.project_review_gates g on g.task_id=t.id where t.id=p_review and t.project_id=b.project_id and not t.archived and t.status<>'done' and g.enabled and g.decision_type='design_review_passed' and g.current_submission is null and g.reviewer_id<>auth.uid())
 or exists(select 1 from public.robot_build_jobs where task_id=p_review or release_task_id=p_review) or exists(select 1 from public.robot_build_kits where task_id=p_review) or exists(select 1 from public.robot_build_substitutions where review_task_id=p_review) then raise exception 'Choose a separate unsubmitted independent design review';end if;
 if p_decision='adopt_unstarted' and (l.job_id is not null or exists(select 1 from public.robot_build_purchases where line_id=l.id) or exists(select 1 from public.robot_build_allocations where line_id=l.id and (reserved>0 or issued>0)) or exists(select 1 from public.robot_build_kit_requirements where line_id=l.id)) then raise exception 'Existing work or allocations need an explicit downstream disposition; this is not unstarted demand';end if;
 select jsonb_build_object('previous',to_jsonb(l),'candidate',case when c.id is null then null else to_jsonb(c) end,
 'allocation',(select to_jsonb(a) from public.robot_build_allocations a where line_id=l.id),
 'purchases',coalesce((select jsonb_agg(to_jsonb(p) order by p.purchase_id) from public.robot_build_purchases p where line_id=l.id),'[]'),
 'destinations',coalesce((select jsonb_agg(to_jsonb(r) order by r.kit_id) from public.robot_build_kit_requirements r where line_id=l.id),'[]'),
 'batches',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'quantity',x.quantity) order by x.id) from public.robot_build_batches x where x.job_id=l.job_id),'[]')) into snapshot;
 insert into public.robot_build_change_decisions(id,line_id,candidate_id,line_revision,candidate_revision,decision,review_task_id,scope_snapshot,proposed_by,note)
 values(p_request,l.id,c.id,l.revision,c.revision,p_decision,p_review,snapshot,auth.uid(),trim(p_note));
 return p_request;
end$$;

-- Independent disposition review must remain possible while the affected work is paused.
-- Check the shared approval plus explicit ancestral release holds, without recursing back
-- through the very CAD-change hold this review is intended to resolve.
create or replace function public.robot_build_change_review_valid(p_task uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 with recursive ancestors(id)as(select p_task union select d.prerequisite_id from public.project_task_dependencies d join ancestors a on a.id=d.task_id)
 select public.project_review_passed(p_task) and not exists(select 1 from public.robot_build_release_holds h join ancestors a on a.id=h.task_id where h.active);
$$;
revoke all on function public.robot_build_change_review_valid(uuid) from public,anon,authenticated;

-- A proposal pauses affected use immediately. Only the exact independent decision can permit
-- the old revision, and only for destinations captured when that decision was proposed.
create or replace function public.robot_build_change_allows(p_line uuid,p_kit uuid default null)returns boolean language plpgsql stable security definer set search_path=public,pg_temp as $$
declare d public.robot_build_change_decisions%rowtype;r public.robot_build_kit_requirements%rowtype;
begin
 select * into d from public.robot_build_change_decisions where line_id=p_line order by sequence desc limit 1;
 if d.id is null then return true;end if;
 if d.decision not in ('continue_old','defer') or d.review_submission_id is null
 or not exists(select 1 from public.robot_build_bom_lines where id=d.line_id and revision=d.line_revision)
 or (d.candidate_id is not null and not exists(select 1 from public.robot_build_bom_lines where id=d.candidate_id and revision=d.candidate_revision))
 or not exists(select 1 from public.project_review_gates g join public.project_review_submissions s on s.id=g.current_submission where g.task_id=d.review_task_id and g.enabled and g.decision_type='design_review_passed' and s.id=d.review_submission_id and s.revision='CHG-'||d.id::text and not(s.required_reviewers @> jsonb_build_array(d.proposed_by)) and public.robot_build_change_review_valid(g.task_id))
 or exists(select 1 from public.robot_build_release_holds where task_id=d.review_task_id and active) then return false;end if;
 if p_kit is not null then
 select * into r from public.robot_build_kit_requirements where kit_id=p_kit and line_id=p_line;
 return r.kit_id is not null and exists(select 1 from jsonb_array_elements(d.scope_snapshot->'destinations') x where x->>'kit_id'=p_kit::text and (x->>'quantity')::integer=r.quantity and (x->>'line_revision')::integer=r.line_revision);
 end if;
 return true;
end$$;

create or replace function public.activate_robot_build_change(p_id uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare d public.robot_build_change_decisions%rowtype;s public.project_review_submissions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into d from public.robot_build_change_decisions where id=p_id for update;
 if d.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.robot_build_bom_lines l join public.robot_build_boms b on b.id=l.bom_id join public.team_projects p on p.id=b.project_id where l.id=d.line_id and public.has_permission('assign_team_work',p.subteam) and p.status not in ('archived','completed')) then raise exception 'Active project leader required';end if;
 if exists(select 1 from public.robot_build_change_decisions where line_id=d.line_id and sequence>d.sequence) then raise exception 'A newer change proposal needs review';end if;
 select sub.* into s from public.project_review_gates g join public.project_review_submissions sub on sub.id=g.current_submission where g.task_id=d.review_task_id and g.enabled and g.decision_type='design_review_passed' and public.robot_build_change_review_valid(g.task_id);
 if s.id is null or s.revision is distinct from 'CHG-'||d.id::text or s.required_reviewers @> jsonb_build_array(d.proposed_by) or exists(select 1 from public.robot_build_release_holds where task_id=d.review_task_id and active) then raise exception 'Approve the exact change revision independently before applying it';end if;
 if not exists(select 1 from public.robot_build_bom_lines where id=d.line_id and revision=d.line_revision) or (d.candidate_id is not null and not exists(select 1 from public.robot_build_bom_lines where id=d.candidate_id and revision=d.candidate_revision)) then raise exception 'Requirement changed; propose a new disposition';end if;
 if d.review_submission_id is not null and d.review_submission_id<>s.id then raise exception 'Approval changed; propose a new disposition';end if;
 update public.robot_build_change_decisions set review_submission_id=s.id,activated_at=coalesce(activated_at,now()) where id=d.id;
end$$;

create or replace function public.robot_build_task_held(p_task uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 with recursive ancestors(id)as(select p_task union select d.prerequisite_id from public.project_task_dependencies d join ancestors a on a.id=d.task_id)
 select exists(select 1 from public.robot_build_release_holds h join ancestors a on a.id=h.task_id where h.active)
 or exists(select 1 from public.robot_build_jobs j join ancestors a on a.id in(j.task_id,j.release_task_id) join public.robot_build_bom_lines l on l.job_id=j.id where not public.robot_build_change_allows(l.id))
 or exists(select 1 from public.robot_build_kits k join ancestors a on a.id=k.task_id join public.robot_build_kit_requirements r on r.kit_id=k.id where not public.robot_build_change_allows(r.line_id,k.id));
$$;

-- Existing task-read policy permits active team members. Return only task IDs and a
-- boolean, never the private candidate, proposal rationale or CAD payload.
create or replace function public.robot_build_hold_context(p_project uuid)
returns table(task_id uuid,held boolean) language sql stable security definer set search_path=public,pg_temp as $$
 select t.id,public.robot_build_task_held(t.id) from public.project_tasks t join public.team_projects p on p.id=t.project_id
 where t.project_id=p_project and p.status<>'archived' and exists(select 1 from public.team_members where id=auth.uid() and active)
 order by t.id;
$$;
revoke all on function public.robot_build_hold_context(uuid) from public,anon;
grant execute on function public.robot_build_hold_context(uuid) to authenticated;

create or replace function public.guard_robot_build_changed_demand()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if tg_table_name='robot_build_allocations' then
 if (new.reserved>coalesce(old.reserved,0) or new.issued>coalesce(old.issued,0)) and not public.robot_build_change_allows(new.line_id) then raise exception 'CAD change disposition blocks new reservation or issue; open the part change review';end if;
 elsif tg_table_name='robot_build_purchases' then
 if not public.robot_build_change_allows(new.line_id) then raise exception 'CAD change disposition blocks new purchasing coverage; existing orders require explicit purchasing review';end if;
 elsif tg_table_name='robot_build_kit_items' then
 if new.quantity>coalesce(old.quantity,0) and new.line_id is not null and not public.robot_build_change_allows(new.line_id,new.kit_id) then raise exception 'CAD change disposition does not permit this destination';end if;
 end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_changed_allocation on public.robot_build_allocations;
create trigger guard_robot_build_changed_allocation before insert or update on public.robot_build_allocations for each row execute function public.guard_robot_build_changed_demand();
drop trigger if exists guard_robot_build_changed_purchase on public.robot_build_purchases;
create trigger guard_robot_build_changed_purchase before insert on public.robot_build_purchases for each row execute function public.guard_robot_build_changed_demand();
drop trigger if exists guard_robot_build_changed_kit on public.robot_build_kit_items;
create trigger guard_robot_build_changed_kit before insert or update on public.robot_build_kit_items for each row execute function public.guard_robot_build_changed_demand();
create or replace function public.guard_robot_build_change_kit_state()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (new.installed_at is distinct from old.installed_at and new.installed_at is not null)
 or (new.stock_received_at is not null and (new.stock_received_at is distinct from old.stock_received_at or new.retirement_note is distinct from old.retirement_note)) then
 if exists(select 1 from public.robot_build_kit_requirements r where r.kit_id=new.id and not public.robot_build_change_allows(r.line_id,new.id))
 or exists(select 1 from public.robot_build_kit_items i join public.robot_build_batches b on b.id=i.batch_id join public.robot_build_bom_lines l on l.job_id=b.job_id where i.kit_id=new.id and i.quantity>0 and i.line_id is null and not public.robot_build_change_allows(l.id,new.id)) then raise exception 'CAD change disposition blocks installation or assembly receipt for this destination';end if;
 end if;
 return new;
end$$;
drop trigger if exists guard_robot_build_change_kit_state on public.robot_build_kits;
create trigger guard_robot_build_change_kit_state before update on public.robot_build_kits for each row execute function public.guard_robot_build_change_kit_state();
revoke all on function public.guard_robot_build_change_kit_state() from public,anon,authenticated;

revoke all on function public.robot_build_change_allows(uuid,uuid),public.guard_robot_build_changed_demand(),public.robot_build_task_held(uuid) from public,anon,authenticated;
revoke all on function public.propose_robot_build_change(uuid,uuid,integer,integer,text,uuid,text,uuid),public.activate_robot_build_change(uuid) from public,anon;
grant execute on function public.propose_robot_build_change(uuid,uuid,integer,integer,text,uuid,text,uuid),public.activate_robot_build_change(uuid) to authenticated;
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.record_robot_build_hold(uuid,text,integer,text,uuid)'::regprocedure);
 if position('robot_build_change_decisions' in definition)=0 then
 definition:=replace(definition,'g.decision_type<>''released_for_manufacturing''','(g.decision_type<>''released_for_manufacturing'' and not exists(select 1 from public.robot_build_change_decisions where review_task_id=p_task))');
 execute definition;
 end if;
end$$;
commit;

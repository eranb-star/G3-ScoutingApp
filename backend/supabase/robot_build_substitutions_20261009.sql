begin;
create table if not exists public.robot_build_substitutions(
 id uuid primary key,kit_id uuid not null references public.robot_build_kits(id),line_id uuid not null references public.robot_build_bom_lines(id),
 batch_id uuid not null references public.robot_build_batches(id),maximum_quantity integer not null check(maximum_quantity>0),
 line_revision integer not null,review_task_id uuid not null unique references public.project_tasks(id),
 review_submission_id uuid references public.project_review_submissions(id),identity_snapshot jsonb not null,
 proposed_by uuid not null references public.team_members(id),note text not null,created_at timestamptz not null default now(),activated_at timestamptz
);
alter table public.robot_build_kit_items add column if not exists substitution_id uuid references public.robot_build_substitutions(id);
alter table public.robot_build_substitutions enable row level security;
revoke all on public.robot_build_substitutions from public,anon,authenticated;
grant select on public.robot_build_substitutions to authenticated;
drop policy if exists build_substitution_read on public.robot_build_substitutions;
create policy build_substitution_read on public.robot_build_substitutions for select to authenticated using(exists(select 1 from public.robot_build_kits where id=kit_id));

create or replace function public.propose_robot_build_substitution(p_kit uuid,p_line uuid,p_batch uuid,p_quantity integer,p_review uuid,p_expected integer,p_note text,p_request uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;l public.robot_build_bom_lines%rowtype;b public.robot_build_batches%rowtype;r public.robot_build_kit_requirements%rowtype;e public.robot_build_substitutions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and status not in ('archived','completed')) then raise exception 'Active project leader required';end if;
 select * into e from public.robot_build_substitutions where id=p_request;
 if e.id is not null then
 if e.kit_id=p_kit and e.line_id=p_line and e.batch_id=p_batch and e.maximum_quantity=p_quantity and e.review_task_id=p_review and e.line_revision=p_expected and e.proposed_by=auth.uid() and e.note=trim(p_note) then return e.id;end if;raise exception 'Request identity already used';end if;
 select * into l from public.robot_build_bom_lines where id=p_line;select * into r from public.robot_build_kit_requirements where kit_id=k.id and line_id=l.id;select * into b from public.robot_build_batches where id=p_batch;
 if p_request is null or p_quantity is null or p_quantity<=0 or p_quantity>r.quantity or r.line_id is null or l.revision is distinct from p_expected or b.project_id is distinct from t.project_id or b.id is null
 or k.installed_at is not null or k.retired_at is not null or t.archived or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose current open kit demand, alternative batch, scoped quantity and engineering rationale';end if;
 if p_review=k.task_id or not exists(select 1 from public.project_tasks q join public.project_review_gates g on g.task_id=q.id where q.id=p_review and q.project_id=t.project_id and not q.archived and q.status<>'done' and g.enabled and g.decision_type in ('design_review_passed','cleared_for_installation') and g.current_submission is null and g.reviewer_id<>auth.uid()) then raise exception 'Choose a separate unsubmitted engineering review with an independent reviewer';end if;
 insert into public.robot_build_substitutions(id,kit_id,line_id,batch_id,maximum_quantity,line_revision,review_task_id,identity_snapshot,proposed_by,note)
 values(p_request,k.id,l.id,b.id,p_quantity,l.revision,p_review,jsonb_build_object('requirement',to_jsonb(l),'destination',to_jsonb(r),'alternative_batch',to_jsonb(b)),auth.uid(),trim(p_note));
 return p_request;
end$$;
create or replace function public.robot_build_substitution_usable(p_id uuid)returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.robot_build_substitutions s join public.robot_build_bom_lines l on l.id=s.line_id
 join public.robot_build_kit_requirements r on r.kit_id=s.kit_id and r.line_id=s.line_id
 join public.project_review_gates g on g.task_id=s.review_task_id join public.project_review_submissions sub on sub.id=g.current_submission
 where s.id=p_id and l.revision=s.line_revision and r.line_revision=s.line_revision and r.quantity>=s.maximum_quantity
 and g.enabled and g.decision_type in ('design_review_passed','cleared_for_installation') and g.current_submission=s.review_submission_id
 and sub.revision='SUB-'||s.id::text and not(sub.required_reviewers @> jsonb_build_array(s.proposed_by)) and public.robot_build_review_usable(g.task_id));
$$;
create or replace function public.activate_robot_build_substitution(p_id uuid)returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare s public.robot_build_substitutions%rowtype;g public.project_review_gates%rowtype;sub public.project_review_submissions%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);select * into s from public.robot_build_substitutions where id=p_id for update;
 if s.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active) or not exists(select 1 from public.robot_build_kits k join public.project_tasks t on t.id=k.task_id join public.team_projects p on p.id=t.project_id where k.id=s.kit_id and public.has_permission('assign_team_work',p.subteam)) then raise exception 'Project leader required';end if;
 select * into g from public.project_review_gates where task_id=s.review_task_id;select * into sub from public.project_review_submissions where id=g.current_submission;
 if s.review_submission_id is not null then
 if public.robot_build_substitution_usable(s.id) then return;end if;raise exception 'Approval changed; propose a new scoped substitution';end if;
 if sub.id is null or sub.revision is distinct from 'SUB-'||s.id::text or sub.required_reviewers @> jsonb_build_array(s.proposed_by) or not public.robot_build_review_usable(g.task_id) then raise exception 'Approve the immutable substitution revision in the independent engineering review first';end if;
 update public.robot_build_substitutions set review_submission_id=sub.id,activated_at=now() where id=s.id;
 if not public.robot_build_substitution_usable(s.id) then raise exception 'Requirement or destination changed; propose again';end if;
end$$;
create or replace function public.guard_robot_build_substituted_kit()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if (new.installed_at is distinct from old.installed_at and new.installed_at is not null) or (new.stock_received_at is not null and (new.stock_received_at is distinct from old.stock_received_at or new.retirement_note is distinct from old.retirement_note)) then
 if exists(select 1 from public.robot_build_kit_items where kit_id=new.id and quantity>0 and substitution_id is not null and not public.robot_build_substitution_usable(substitution_id)) then raise exception 'A scoped substitution approval is stale or held; review before installation or assembly receipt';end if;
 end if;return new;
end$$;
drop trigger if exists guard_robot_build_substituted_kit on public.robot_build_kits;
create trigger guard_robot_build_substituted_kit before update on public.robot_build_kits for each row execute function public.guard_robot_build_substituted_kit();
revoke all on function public.robot_build_substitution_usable(uuid),public.guard_robot_build_substituted_kit() from public,anon,authenticated;
revoke all on function public.propose_robot_build_substitution(uuid,uuid,uuid,integer,uuid,integer,text,uuid),public.activate_robot_build_substitution(uuid) from public,anon;
grant execute on function public.propose_robot_build_substitution(uuid,uuid,uuid,integer,uuid,integer,text,uuid),public.activate_robot_build_substitution(uuid) to authenticated;
create or replace function public.move_robot_build_kit_requirement(p_kit uuid,p_batch uuid,p_action text,p_quantity integer,p_expected integer,p_note text,p_request uuid,p_line uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare k public.robot_build_kits%rowtype;t public.project_tasks%rowtype;b public.robot_build_batches%rowtype;j public.robot_build_jobs%rowtype;i public.robot_build_kit_items%rowtype;e public.robot_build_kit_events%rowtype;available integer;delta integer;physical numeric;printing numeric;r public.robot_build_kit_requirements%rowtype;l public.robot_build_bom_lines%rowtype;a public.robot_build_allocations%rowtype;used integer;substitution uuid;matches boolean;
begin
 perform pg_advisory_xact_lock(6740,911);select * into k from public.robot_build_kits where id=p_kit for update;select * into t from public.project_tasks where id=k.task_id;
 if k.id is null or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.team_projects where id=t.project_id and public.has_permission('assign_team_work',subteam) and public.has_permission('manage_inventory',subteam)) then raise exception 'Project and inventory manager required';end if;
 select * into e from public.robot_build_kit_events where id=p_request;
 if e.id is not null then
  if e.kit_id=p_kit and e.batch_id=p_batch and e.action=p_action and e.quantity=p_quantity and e.expected_revision=p_expected and e.actor_id=auth.uid() and e.note=trim(p_note) and e.line_id is not distinct from p_line then return;end if;
  raise exception 'Request identity already used';end if;
 if k.installed_at is not null or k.retired_at is not null or t.archived or t.status='done' or exists(select 1 from public.team_projects where id=t.project_id and status in ('archived','completed')) then raise exception 'Installed or closed kit contents are immutable; create a replacement kit and configuration';end if;
 if exists(select 1 from public.project_review_gates where task_id=t.id and current_submission is not null) then raise exception 'Reopen installation review before changing submitted kit contents';end if;
 if p_request is null or p_action is null or p_action not in ('issue','return') or p_quantity is null or p_quantity<=0 or length(trim(coalesce(p_note,''))) not between 3 and 2000 then raise exception 'Choose issue or return, positive pieces and a traceability note';end if;
 select * into b from public.robot_build_batches where id=p_batch;select * into j from public.robot_build_jobs where id=b.job_id;
 if b.id is null or b.project_id is distinct from t.project_id then raise exception 'Choose an accepted batch from this project';end if;
 select * into i from public.robot_build_kit_items where kit_id=k.id and batch_id=b.id for update;
 if coalesce(i.revision,0)<>p_expected then raise exception 'Kit contents changed. Reload before saving';end if;
 delta:=case when p_action='issue' then p_quantity else -p_quantity end;
 if k.requirements_required then
  select * into r from public.robot_build_kit_requirements where kit_id=k.id and line_id=p_line;
  select * into l from public.robot_build_bom_lines where id=r.line_id;
  if r.line_id is null then raise exception 'Choose the assembly requirement for this batch';end if;
  matches:=not ((l.disposition='make' and l.job_id is distinct from b.job_id) or (l.disposition in ('buy','reuse') and (l.inventory_id is distinct from b.part_id or b.job_id is not null)));
  if not matches then
   if p_action='return' then substitution:=i.substitution_id;
   else
    select s.id into substitution from public.robot_build_substitutions s where s.kit_id=k.id and s.line_id=l.id and s.batch_id=b.id
    and public.robot_build_substitution_usable(s.id) and s.maximum_quantity>=coalesce(i.quantity,0)+p_quantity
    and (coalesce(i.quantity,0)=0 or s.id=i.substitution_id) order by s.created_at desc limit 1;
   end if;
   if substitution is null then raise exception 'Batch does not match the exact requirement; an independent scoped substitution approval is required';end if;
  end if;
  if i.batch_id is not null and i.line_id is distinct from p_line then raise exception 'This batch is assigned to another requirement in this kit';end if;
  select coalesce(sum(quantity),0) into used from public.robot_build_kit_items where kit_id=k.id and line_id=p_line;
  if used+delta>r.quantity then raise exception 'Issue exceeds this assembly destination requirement';end if;
 elsif p_line is not null then raise exception 'Historical kit does not have a requirement plan';end if;
 if coalesce(i.quantity,0)+delta<0 then raise exception 'Return exceeds the quantity in this kit';end if;
 if p_action='issue' then
  if not exists(select 1 from public.project_review_gates where task_id=b.source_task_id and current_submission=b.qc_submission_id and public.robot_build_review_usable(task_id))
   or (b.job_id is not null and not exists(select 1 from public.project_review_gates where task_id=j.release_task_id and current_submission=j.release_submission_id and public.robot_build_review_usable(task_id))) then raise exception 'Batch release or QC changed; review before issuing';end if;
  select b.quantity-coalesce(sum(quantity),0) into available from public.robot_build_kit_items where batch_id=b.id;
  if available<p_quantity then raise exception 'This batch does not have enough unallocated pieces';end if;
 end if;
 if k.requirements_required and l.disposition in ('buy','reuse') and p_action='issue' then
  insert into public.robot_build_allocations(line_id,part_id)values(l.id,l.inventory_id)on conflict do nothing;
  select * into a from public.robot_build_allocations where line_id=l.id for update;
  if a.part_id<>l.inventory_id or a.issued+p_quantity>l.required_quantity then raise exception 'This demand already has issued supply; return or reconcile it before kitting';end if;
  update public.robot_build_allocations set reserved=greatest(0,reserved-p_quantity),issued=issued+p_quantity,revision=revision+1 where line_id=l.id;
 end if;
 select quantity into physical from public.frc_parts_inventory where id=b.part_id and not archived and unit='pcs' for update;
 select coalesce(sum((x->>'grams')::numeric*f.quantity/1000),0)into printing from public.fundraising_jobs f cross join lateral jsonb_array_elements(f.snapshot->'materials') x where f.status='printing' and x->>'part_id'=b.part_id::text;
 if physical is null or physical-delta<public.robot_build_reserved(b.part_id)+printing then raise exception 'Not enough unreserved physical stock';end if;
 insert into public.robot_build_kit_items(kit_id,batch_id,quantity,line_id,substitution_id)values(k.id,b.id,greatest(delta,0),p_line,substitution)
 on conflict(kit_id,batch_id)do update set quantity=robot_build_kit_items.quantity+delta,revision=robot_build_kit_items.revision+1,substitution_id=coalesce(substitution,robot_build_kit_items.substitution_id);
 if k.requirements_required and l.disposition in ('buy','reuse') and p_action='return' then
  update public.robot_build_allocations set issued=issued-p_quantity,revision=revision+1 where line_id=l.id;
 end if;
 update public.frc_parts_inventory set quantity=quantity-delta,updated_at=now() where id=b.part_id;
 insert into public.frc_stock_movements(part_id,quantity_delta,reason,note,member_id)values(b.part_id,-delta,case when delta>0 then 'used' else 'returned' end,'Assembly kit '||k.id||': '||trim(p_note),auth.uid());
 insert into public.robot_build_kit_events(id,kit_id,batch_id,action,quantity,expected_revision,actor_id,note,line_id)values(p_request,k.id,b.id,p_action,p_quantity,p_expected,auth.uid(),trim(p_note),p_line);
end$$;



-- Reuse the existing independently resolved hold for this scoped engineering decision.
do $$declare definition text;begin
 definition:=pg_get_functiondef('public.record_robot_build_hold(uuid,text,integer,text,uuid)'::regprocedure);
 if position('robot_build_substitutions' in definition)=0 then
 definition:=replace(definition,'g.decision_type<>''released_for_manufacturing''','(g.decision_type<>''released_for_manufacturing'' and not exists(select 1 from public.robot_build_substitutions where review_task_id=p_task))');
 execute definition;
 end if;
end$$;
commit;

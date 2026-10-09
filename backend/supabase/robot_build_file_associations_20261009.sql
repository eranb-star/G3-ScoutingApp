-- Explicit, immutable human-checked drawing association. Never infer from file names.
begin;
create table if not exists public.robot_build_file_associations(
 file_id uuid primary key references public.robot_build_files(id) on delete restrict,
 line_id uuid not null references public.robot_build_bom_lines(id) on delete restrict,
 line_revision integer not null,
 source_identity jsonb not null,
 association_note text not null check(length(association_note) between 5 and 2000),
 checked_by uuid not null references public.team_members(id),
 checked_at timestamptz not null default now()
);
alter table public.robot_build_file_associations enable row level security;
revoke all on public.robot_build_file_associations from public,anon,authenticated;
grant select on public.robot_build_file_associations to authenticated,service_role;
drop policy if exists build_file_association_read on public.robot_build_file_associations;
create policy build_file_association_read on public.robot_build_file_associations for select to authenticated
 using(public.robot_build_file_can_read(file_id));
create or replace function public.associate_robot_build_file(p_file uuid,p_line uuid,p_expected integer,p_note text)returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare f public.robot_build_files%rowtype;l public.robot_build_bom_lines%rowtype;b public.robot_build_boms%rowtype;a public.robot_build_file_associations%rowtype;
begin
 perform pg_advisory_xact_lock(6740,911);
 select * into f from public.robot_build_files where id=p_file for update;
 select * into l from public.robot_build_bom_lines where id=p_line;
 select * into b from public.robot_build_boms where id=l.bom_id;
 if f.id is null or l.id is null or f.created_by<>auth.uid()
 or not exists(select 1 from public.team_members where id=auth.uid() and active)
 or not exists(select 1 from public.project_tasks t join public.team_projects p on p.id=t.project_id where t.id=f.task_id and p.id=b.project_id and not t.archived and p.status not in ('archived','completed') and public.has_permission('assign_team_work',p.subteam))
 or not(b.shared_at is not null or b.owner_id=auth.uid()) then raise exception 'File owner and active project leader with source access required';end if;
 select * into a from public.robot_build_file_associations where file_id=p_file;
 if a.file_id is not null then
 if a.line_id=p_line and a.line_revision=p_expected and a.association_note=trim(p_note) then return;end if;
 raise exception 'Drawing association is immutable; upload a new revision file';end if;
 if f.status<>'pending' then raise exception 'Associate the part before finalizing this file';end if;
 if l.revision is distinct from p_expected or length(trim(coalesce(p_note,''))) not between 5 and 2000 then raise exception 'Choose the current part revision and describe the association check';end if;
 insert into public.robot_build_file_associations(file_id,line_id,line_revision,source_identity,association_note,checked_by)
 values(f.id,l.id,l.revision,jsonb_build_object('bom_id',b.id,'snapshot_id',b.snapshot_id,'name',l.name,'source',l.source_identity,'occurrence_paths',l.occurrence_paths),trim(p_note),auth.uid());
end$$;
revoke all on function public.associate_robot_build_file(uuid,uuid,integer,text) from public,anon;
grant execute on function public.associate_robot_build_file(uuid,uuid,integer,text) to authenticated;
commit;

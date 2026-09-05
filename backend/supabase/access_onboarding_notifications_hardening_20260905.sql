-- G3 6740: harden targeted responsibilities and notification state.
-- Safe to run repeatedly after roles_permissions_multi_team_20260904.sql and
-- unified_responsibility_engine_20260902.sql.
begin;

drop policy if exists "members view targeted actions" on public.team_actions;
create policy "members view targeted actions"
on public.team_actions for select to authenticated
using (
  not cancelled
  and exists (
    select 1
    from public.team_members member
    where member.id=auth.uid()
      and member.active
      and (
        target_type='all'
        or (target_type='member' and target_value=auth.uid()::text)
        or (
          target_type='subteam'
          and (
            member.role in ('admin','mentor')
            or public.current_member_has_team(target_value)
          )
        )
      )
  )
);

-- Direct responsibility creation is restricted. Database synchronization
-- triggers continue to work because they use security-definer functions.
drop policy if exists "members create actions" on public.team_actions;
drop policy if exists "authorized create actions" on public.team_actions;
create policy "authorized create actions"
on public.team_actions for insert to authenticated
with check (
  created_by=auth.uid()
  and public.has_permission(
    'assign_team_work',
    case when target_type='subteam' then target_value else null end
  )
);

drop policy if exists "members manage own action state" on public.team_action_states;
drop policy if exists "members view own action state" on public.team_action_states;
drop policy if exists "members insert own visible action state" on public.team_action_states;
drop policy if exists "members update own visible action state" on public.team_action_states;
drop policy if exists "members delete own action state" on public.team_action_states;
create policy "members view own action state"
on public.team_action_states for select to authenticated
using (member_id=auth.uid());
create policy "members insert own visible action state"
on public.team_action_states for insert to authenticated
with check (
  member_id=auth.uid()
  and exists(select 1 from public.team_actions action where action.id=action_id)
);
create policy "members update own visible action state"
on public.team_action_states for update to authenticated
using (member_id=auth.uid())
with check (
  member_id=auth.uid()
  and exists(select 1 from public.team_actions action where action.id=action_id)
);
create policy "members delete own action state"
on public.team_action_states for delete to authenticated
using (member_id=auth.uid());

create index if not exists team_action_states_member_status_idx
  on public.team_action_states(member_id,status,updated_at desc);

-- Live badge refresh for responsibilities. Ignore tables that were already
-- added to the realtime publication by an earlier deployment.
do $$ begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='team_actions'
  ) then alter publication supabase_realtime add table public.team_actions; end if;
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='team_action_states'
  ) then alter publication supabase_realtime add table public.team_action_states; end if;
end $$;

commit;

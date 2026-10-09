-- Operations are an ordered process. A later step cannot overtake its predecessor.
begin;
create or replace function public.guard_robot_build_operation_order()returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if new.operations is not distinct from old.operations then return new;end if;
 if exists(select 1 from (
  select (s->>'completed')::integer amount,lag((s->>'completed')::integer) over(order by (s->>'id')::integer) previous
  from jsonb_array_elements(new.operations) s
 ) ordered where previous is not null and amount>previous) then raise exception 'Complete the preceding operation for this quantity first';end if;
 return new;
end$$;
drop trigger if exists robot_build_operation_order on public.robot_build_jobs;
create trigger robot_build_operation_order before update of operations on public.robot_build_jobs for each row execute function public.guard_robot_build_operation_order();
revoke all on function public.guard_robot_build_operation_order() from public,anon,authenticated;
commit;

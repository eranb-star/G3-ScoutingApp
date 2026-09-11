begin;
create table if not exists public.inventory_categories(
 id uuid primary key default gen_random_uuid(),scope text not null check(scope in ('parts','equipment')),
 name text not null check(length(trim(name)) between 1 and 80),active boolean not null default true
);
create unique index if not exists inventory_category_unique_name on public.inventory_categories(scope,lower(trim(name)));
alter table public.inventory_categories enable row level security;
drop policy if exists categories_read on public.inventory_categories;
create policy categories_read on public.inventory_categories for select to authenticated using(exists(select 1 from public.team_members where id=auth.uid() and active));
grant select on public.inventory_categories to authenticated;
revoke insert,update,delete on public.inventory_categories from authenticated,anon;
insert into public.inventory_categories(scope,name)
select 'parts',unnest(array['Fasteners & hardware','Raw material','Mechanical components','Motors & gearboxes','Pneumatics','Electrical','Control system','Sensors','Wiring & connectors','Batteries','Consumables','Bumpers','Pit spares','Software','Other']) where not exists(select 1 from public.inventory_categories where scope='parts') on conflict do nothing;
insert into public.inventory_categories(scope,name)
select 'equipment',unnest(array['Hand tools','Power tools','Machining','Electrical & electronics','Measurement & inspection','Batteries & chargers','Safety & PPE','Pit equipment','Software','Other']) where not exists(select 1 from public.inventory_categories where scope='equipment') on conflict do nothing;
insert into public.inventory_categories(scope,name) select distinct 'parts',trim(category) from public.frc_parts_inventory where nullif(trim(category),'') is not null on conflict do nothing;
insert into public.inventory_categories(scope,name) select distinct 'equipment',trim(category) from public.workshop_tools where nullif(trim(category),'') is not null on conflict do nothing;

-- Names remain compatible with existing item/category text fields and old clients.
-- Rename updates current inventory atomically; financial/history snapshots are untouched.
create or replace function public.save_inventory_category(p_id uuid,p_scope text,p_name text,p_active boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare old_category public.inventory_categories%rowtype; result uuid; label text=trim(p_name);
begin
 if not public.is_admin() or not exists(select 1 from public.team_members where id=auth.uid() and active) then raise exception 'Administrator access required';end if;
 if p_scope not in ('parts','equipment') or label is null or length(label) not between 1 and 80 or p_active is null then raise exception 'Invalid category';end if;
 if p_id is null then
 insert into public.inventory_categories(scope,name,active)values(p_scope,label,p_active) returning id into result;
 else
 select * into old_category from public.inventory_categories where id=p_id for update;
 if not found or old_category.scope<>p_scope then raise exception 'Category unavailable';end if;
 update public.inventory_categories set name=label,active=p_active where id=p_id returning id into result;
 if old_category.name<>label then
 if p_scope='parts' then update public.frc_parts_inventory set category=label where lower(trim(category))=lower(trim(old_category.name));
 else update public.workshop_tools set category=label where lower(trim(category))=lower(trim(old_category.name));end if;
 end if;
 end if;return result;
end$$;
revoke all on function public.save_inventory_category(uuid,text,text,boolean) from public,anon;
grant execute on function public.save_inventory_category(uuid,text,text,boolean) to authenticated;
commit;

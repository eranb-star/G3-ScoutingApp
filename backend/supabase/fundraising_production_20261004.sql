-- Fundraising workspace: atomic stock consumption, immutable job costs and one-time income posting.
begin;
create table if not exists public.fundraising_settings(id boolean primary key default true check(id), operating_cost numeric(12,2) not null default 0.5 check(operating_cost>=0));
insert into public.fundraising_settings values(true,0.5) on conflict do nothing;
create table if not exists public.fundraising_products(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), model_url text, notes text,
 materials jsonb not null check(jsonb_typeof(materials)='array'), operating_cost numeric(12,2) not null check(operating_cost>=0), other_cost numeric(12,2) not null default 0 check(other_cost>=0), sale_price numeric(12,2) not null check(sale_price>=0), archived boolean not null default false, revision int not null default 1, request_key uuid unique,
 created_by uuid not null default auth.uid() references public.team_members(id), created_at timestamptz not null default now());
create table if not exists public.fundraising_events(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), event_date date not null, location text, notes text, request_key uuid unique,
 status text not null default 'planned' check(status in ('planned','open','closed')), income_id uuid unique references public.finance_income(id) on delete restrict,
 created_by uuid not null default auth.uid() references public.team_members(id), created_at timestamptz not null default now());
create table if not exists public.fundraising_jobs(
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.fundraising_products(id), event_id uuid references public.fundraising_events(id), quantity int not null check(quantity>0 and quantity<=100000),
 status text not null default 'planned' check(status in ('planned','printing','succeeded','partial','failed','cancelled')), owner_id uuid references public.team_members(id), due_date date, printer text, notes text,
 snapshot jsonb not null, request_key uuid unique, good_units int not null default 0 check(good_units>=0), failed_units int not null default 0 check(failed_units>=0), actual_materials jsonb, actual_cost numeric(14,4), result_note text,
 created_by uuid not null default auth.uid() references public.team_members(id), created_at timestamptz not null default now(), finished_at timestamptz);
create table if not exists public.fundraising_sales(
 id uuid primary key, event_id uuid not null references public.fundraising_events(id), product_id uuid not null references public.fundraising_products(id), quantity int not null check(quantity>0), unit_price numeric(12,2) not null check(unit_price>=0), payment_method text not null check(payment_method in ('cash','digital')), voided boolean not null default false, void_reason text,
 created_by uuid not null default auth.uid() references public.team_members(id), created_at timestamptz not null default now());
create index if not exists fundraising_jobs_product_idx on public.fundraising_jobs(product_id);
create index if not exists fundraising_sales_product_idx on public.fundraising_sales(product_id);
create index if not exists fundraising_sales_event_idx on public.fundraising_sales(event_id);
-- Existing inventory managers operate production. Finance posting stays administrator-only.
create or replace function public.fundraising_allowed() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from team_members where id=auth.uid() and active) and coalesce(public.has_permission('manage_inventory'),false)
$$;
do $$declare t text;begin foreach t in array array['fundraising_settings','fundraising_products','fundraising_events','fundraising_jobs','fundraising_sales'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('drop policy if exists "fundraising read" on public.%I',t);
 execute format('create policy "fundraising read" on public.%I for select to authenticated using (exists(select 1 from public.team_members where id=auth.uid() and active))',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
end loop;end$$;
create or replace function public.fundraising_command(p_action text,p_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid:=nullif(p_data->>'id','')::uuid; p fundraising_products; j fundraising_jobs; e fundraising_events; s fundraising_sales; m jsonb; a jsonb; v_materials jsonb:='[]'; inv frc_parts_inventory; cost numeric:=0; amount numeric; reserved numeric; grams numeric; good int; bad int; available int; income uuid;
begin
 if not public.fundraising_allowed() then raise exception 'Inventory management permission required';end if;
 -- Serialize workspace changes; inventory rows also lock against existing receiving/use operations.
 perform pg_advisory_xact_lock(6740,310);
 if p_action='settings' then
  update fundraising_settings set operating_cost=(p_data->>'operating_cost')::numeric where id;return null;
 elsif p_action='product' then
  if coalesce(jsonb_typeof(p_data->'materials'),'')<>'array' or coalesce(jsonb_array_length(p_data->'materials'),0)<1 then raise exception 'Choose at least one filament';end if;
  for m in select value from jsonb_array_elements(p_data->'materials') loop
   select * into inv from frc_parts_inventory where id=(m->>'part_id')::uuid and not archived and unit='kg' and filament_details is not null;
   if not found or inv.unit_cost is null or inv.unit_cost<0 or coalesce((m->>'grams')::numeric,0)<=0 or (m->>'grams')::numeric>1000000 then raise exception 'Choose valid filament and grams per item';end if;
   if exists(select 1 from jsonb_array_elements(v_materials) x where x->>'part_id'=m->>'part_id') then raise exception 'Combine repeated filament rows';end if;
   v_materials:=v_materials||jsonb_build_array(jsonb_build_object('part_id',inv.id,'grams',(m->>'grams')::numeric));
  end loop;
  if nullif(p_data->>'model_url','') is not null and p_data->>'model_url' !~ '^https?://' then raise exception 'Use an http or https model link';end if;
  if v_id is null then
   select id into v_id from fundraising_products where request_key=nullif(p_data->>'request_key','')::uuid;if found then return v_id;end if;
   insert into fundraising_products(request_key,name,model_url,notes,materials,operating_cost,other_cost,sale_price) values(nullif(p_data->>'request_key','')::uuid,trim(p_data->>'name'),nullif(p_data->>'model_url',''),p_data->>'notes',v_materials,(p_data->>'operating_cost')::numeric,(p_data->>'other_cost')::numeric,(p_data->>'sale_price')::numeric) returning id into v_id;
  else
   update fundraising_products set name=trim(p_data->>'name'),model_url=nullif(p_data->>'model_url',''),notes=p_data->>'notes',materials=v_materials,operating_cost=(p_data->>'operating_cost')::numeric,other_cost=(p_data->>'other_cost')::numeric,sale_price=(p_data->>'sale_price')::numeric,revision=revision+1 where id=v_id and revision=(p_data->>'revision')::int;
   if not found then raise exception 'Product changed. Refresh before editing';end if;
  end if;return v_id;
 elsif p_action='archive' then
  update fundraising_products set archived=not archived,revision=revision+1 where id=v_id;return v_id;
 elsif p_action='event' then
  select id into v_id from fundraising_events where request_key=nullif(p_data->>'request_key','')::uuid;if found then return v_id;end if;
  insert into fundraising_events(request_key,name,event_date,location,notes) values(nullif(p_data->>'request_key','')::uuid,trim(p_data->>'name'),(p_data->>'event_date')::date,p_data->>'location',p_data->>'notes') returning id into v_id;return v_id;
 elsif p_action='event_status' then
  select * into e from fundraising_events where id=v_id for update;
  if not found or e.income_id is not null then raise exception 'Event missing or already posted to finance';end if;
  update fundraising_events set status=p_data->>'status' where id=v_id;return v_id;
 elsif p_action='job' then
  select id into v_id from fundraising_jobs where request_key=nullif(p_data->>'request_key','')::uuid;if found then return v_id;end if;
  select * into p from fundraising_products where id=(p_data->>'product_id')::uuid and not archived;
  if not found then raise exception 'Choose an active product';end if;
  if nullif(p_data->>'event_id','') is not null and not exists(select 1 from fundraising_events where id=(p_data->>'event_id')::uuid and status<>'closed') then raise exception 'Choose an open or planned event';end if;
  if nullif(p_data->>'owner_id','') is not null and not exists(select 1 from team_members where id=(p_data->>'owner_id')::uuid and active) then raise exception 'Choose an active owner';end if;
  for m in select value from jsonb_array_elements(p.materials) loop
   select * into inv from frc_parts_inventory where id=(m->>'part_id')::uuid and not archived and unit='kg' and filament_details is not null;
   if not found or inv.unit_cost is null then raise exception 'Filament unavailable. Update product';end if;
   cost:=cost+(m->>'grams')::numeric*inv.unit_cost/1000;
   v_materials:=v_materials||jsonb_build_array(m||jsonb_build_object('name',inv.name,'cost_per_kg',inv.unit_cost));
  end loop;
  insert into fundraising_jobs(request_key,product_id,event_id,quantity,owner_id,due_date,printer,notes,snapshot) values(nullif(p_data->>'request_key','')::uuid,p.id,nullif(p_data->>'event_id','')::uuid,(p_data->>'quantity')::int,nullif(p_data->>'owner_id','')::uuid,nullif(p_data->>'due_date','')::date,p_data->>'printer',p_data->>'notes',jsonb_build_object('name',p.name,'materials',v_materials,'operating_cost',p.operating_cost,'other_cost',p.other_cost,'unit_cost',cost+p.operating_cost+p.other_cost,'sale_price',p.sale_price,'revision',p.revision)) returning id into v_id;return v_id;
 elsif p_action in ('start','cancel','finish') then
  select * into j from fundraising_jobs where id=v_id for update;
  if not found then raise exception 'Print job not found';end if;
  if p_action='cancel' then
   if j.status<>'planned' then raise exception 'Only planned jobs can be cancelled. Record a result for started prints';end if;
   update fundraising_jobs set status='cancelled' where id=v_id;return v_id;
  elsif p_action='start' then
   if j.status<>'planned' then raise exception 'Only planned jobs can start';end if;
   for m in select value from jsonb_array_elements(j.snapshot->'materials') order by value->>'part_id' loop
    select * into inv from frc_parts_inventory where id=(m->>'part_id')::uuid and not archived for update;
    if not found then raise exception 'Filament unavailable';end if;
    select coalesce(sum((x->>'grams')::numeric*q.quantity/1000),0) into reserved from fundraising_jobs q cross join lateral jsonb_array_elements(q.snapshot->'materials') x where q.status='printing' and x->>'part_id'=m->>'part_id';
    if inv.quantity-reserved<(m->>'grams')::numeric*j.quantity/1000 then raise exception 'Not enough unreserved filament: %',inv.name;end if;
   end loop;
   update fundraising_jobs set status='printing' where id=v_id;return v_id;
  else
   if j.status<>'printing' then raise exception 'Result already recorded or job not started';end if;
   good:=(p_data->>'good_units')::int;bad:=(p_data->>'failed_units')::int;
   if good is null or bad is null or good<0 or bad<0 or good+bad<>j.quantity then raise exception 'Good plus failed units must equal planned quantity';end if;
   if bad>0 and length(trim(coalesce(p_data->>'result_note','')))<3 then raise exception 'Describe why the print failed';end if;
   if coalesce(jsonb_typeof(p_data->'actual_materials'),'')<>'array' or jsonb_array_length(p_data->'actual_materials')<>jsonb_array_length(j.snapshot->'materials') then raise exception 'Record actual grams for every filament';end if;
   update fundraising_jobs set status=case when good=0 then 'failed' when bad=0 then 'succeeded' else 'partial' end where id=v_id;
   for m in select value from jsonb_array_elements(j.snapshot->'materials') order by value->>'part_id' loop
    if (select count(*) from jsonb_array_elements(p_data->'actual_materials') x where x->>'part_id'=m->>'part_id')<>1 then raise exception 'Record each filament once';end if;
    select value into a from jsonb_array_elements(p_data->'actual_materials') where value->>'part_id'=m->>'part_id';grams:=(a->>'grams')::numeric;
    if grams is null or grams<0 or grams<>round(grams,1) then raise exception 'Actual grams must be nonnegative, to 0.1 g';end if;
    select * into inv from frc_parts_inventory where id=(m->>'part_id')::uuid for update;
    if not found or inv.quantity<grams/1000 then raise exception 'Actual usage exceeds stock: %',m->>'name';end if;
    if grams>0 then
     update frc_parts_inventory set quantity=quantity-grams/1000,updated_at=now() where id=inv.id;
     insert into frc_stock_movements(part_id,quantity_delta,reason,note,member_id) values(inv.id,-grams/1000,'used','Print job '||j.id||'; includes failed prints',auth.uid());
    end if;
    cost:=cost+grams*(m->>'cost_per_kg')::numeric/1000;v_materials:=v_materials||jsonb_build_array(a);
   end loop;
   if good>0 and not exists(select 1 from jsonb_array_elements(v_materials) x where (x->>'grams')::numeric>0) then raise exception 'Successful prints require material consumption';end if;
   update fundraising_jobs set status=case when good=0 then 'failed' when bad=0 then 'succeeded' else 'partial' end,good_units=good,failed_units=bad,actual_materials=v_materials,actual_cost=cost+j.quantity*((j.snapshot->>'operating_cost')::numeric+(j.snapshot->>'other_cost')::numeric),result_note=p_data->>'result_note',finished_at=now() where id=v_id;return v_id;
  end if;
 elsif p_action='sale' then
  if v_id is null then raise exception 'Sale identifier required';end if;
  if exists(select 1 from fundraising_sales where id=v_id) then return v_id;end if;
  select * into e from fundraising_events where id=(p_data->>'event_id')::uuid for update;
  if not found or e.status<>'open' or e.income_id is not null then raise exception 'Open the event before recording sales';end if;
  select coalesce(sum(good_units),0) into available from fundraising_jobs where product_id=(p_data->>'product_id')::uuid;
  select available-coalesce(sum(quantity),0) into available from fundraising_sales where product_id=(p_data->>'product_id')::uuid and not voided;
  if (p_data->>'quantity')::int>available then raise exception 'Not enough finished products in stock';end if;
  insert into fundraising_sales(id,event_id,product_id,quantity,unit_price,payment_method) values(v_id,e.id,(p_data->>'product_id')::uuid,(p_data->>'quantity')::int,(p_data->>'unit_price')::numeric,p_data->>'payment_method');return v_id;
 elsif p_action='void_sale' then
  select * into s from fundraising_sales where id=v_id for update;select * into e from fundraising_events where id=s.event_id for update;
  if not found or e.income_id is not null then raise exception 'Posted sales are locked; resolve finance corrections with an administrator';end if;
  if length(trim(coalesce(p_data->>'reason','')))<3 then raise exception 'Correction reason required';end if;
  update fundraising_sales set voided=true,void_reason=p_data->>'reason' where id=v_id;return v_id;
 elsif p_action='post_income' then
  if not public.is_admin() then raise exception 'Administrator required to post finance income';end if;
  select * into e from fundraising_events where id=v_id for update;
  if not found or e.status<>'closed' then raise exception 'Close and review the event first';end if;
  if e.income_id is not null then return e.income_id;end if;
  select sum(quantity*unit_price) into amount from fundraising_sales where event_id=e.id and not voided;
  if coalesce(amount,0)<=0 then raise exception 'No income to post';end if;
  insert into finance_income(received_on,source_type,source_name,amount,currency,notes) values(e.event_date,'fundraising',e.name,amount,'ILS','Fundraising event '||e.id||'; recorded sales; do not enter again manually') returning id into income;
  update fundraising_events set income_id=income where id=e.id;return income;
 else raise exception 'Unknown operation';end if;
end$$;
create or replace function public.protect_print_reservations() returns trigger language plpgsql security definer set search_path=public as $$
declare reserved numeric;
begin
 if new.quantity<old.quantity then
  select coalesce(sum((x->>'grams')::numeric*j.quantity/1000),0) into reserved from fundraising_jobs j cross join lateral jsonb_array_elements(j.snapshot->'materials') x where j.status='printing' and x->>'part_id'=new.id::text;
  if new.quantity<reserved then raise exception 'Stock is reserved for active print jobs. Record print results first';end if;
 end if;return new;
end$$;
drop trigger if exists protect_print_reservations on public.frc_parts_inventory;
create trigger protect_print_reservations before update of quantity on public.frc_parts_inventory for each row execute function public.protect_print_reservations();
revoke all on function public.protect_print_reservations() from public,anon,authenticated;
revoke all on function public.fundraising_command(text,jsonb) from public,anon;
grant execute on function public.fundraising_command(text,jsonb) to authenticated;
revoke all on function public.fundraising_allowed() from public,anon;
grant execute on function public.fundraising_allowed() to authenticated;
commit;

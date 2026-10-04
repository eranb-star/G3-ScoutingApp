begin;
alter table public.frc_parts_inventory add column if not exists filament_details jsonb;
-- Preserve sub-gram consumption without rounding stock to 10 g increments.
alter table public.frc_parts_inventory alter column quantity type numeric(14,4), alter column minimum_quantity type numeric(14,4);
alter table public.frc_stock_movements alter column quantity_delta type numeric(14,4);
alter table public.frc_parts_inventory drop constraint if exists filament_details_valid;
alter table public.frc_parts_inventory add constraint filament_details_valid check (
 filament_details is null or (
 jsonb_typeof(filament_details)='object' and unit='kg'
 and length(trim(coalesce(filament_details->>'material','')))>0
 and length(trim(coalesce(filament_details->>'brand','')))>0
 and length(trim(coalesce(filament_details->>'colour','')))>0
 and coalesce((filament_details->>'diameter')::numeric>0,false)
 and coalesce((filament_details->>'net_weight_g')::numeric>0,false)
 and coalesce((filament_details->>'spool_price')::numeric>=0,false)
 and (nullif(filament_details->>'empty_spool_g','') is null or (filament_details->>'empty_spool_g')::numeric>=0)
 ));
insert into public.inventory_categories(scope,name) select 'parts','Filament'
where not exists(select 1 from public.inventory_categories where scope='parts' and lower(name)='filament');
commit;

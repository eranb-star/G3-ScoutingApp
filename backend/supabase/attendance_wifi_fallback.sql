create table if not exists public.trusted_wifi_networks (
  id uuid primary key default gen_random_uuid(),
  ssid text not null unique,
  label text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.trusted_wifi_networks enable row level security;
drop policy if exists "admins manage trusted wifi" on public.trusted_wifi_networks;
create policy "admins manage trusted wifi" on public.trusted_wifi_networks
for all to authenticated using (public.is_admin()) with check (public.is_admin());

alter table public.attendance_records drop constraint if exists attendance_records_check_in_method_check;
alter table public.attendance_records add constraint attendance_records_check_in_method_check check (check_in_method in ('location','trusted_wifi','admin'));
alter table public.attendance_records drop constraint if exists attendance_records_check_out_method_check;
alter table public.attendance_records add constraint attendance_records_check_out_method_check check (check_out_method in ('location','trusted_wifi','admin','automatic'));

-- The confirmed SSID is inserted separately during live deployment.

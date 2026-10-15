begin;
alter table public.cad_snapshots add column if not exists source_revision_at timestamptz;
alter table public.cad_snapshots add column if not exists source_date_scope text check(source_date_scope is null or source_date_scope='document_revision');
-- Existing import dates are deliberately not used to invent source dates.
commit;

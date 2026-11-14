-- Match bounded assembly finalization (40 MB). No object, access-policy,
-- public/private, or MIME-type changes. Existing imports remain immutable.
begin;
update storage.buckets
set file_size_limit = 40000000
where id = 'cad-design-assets' and file_size_limit = 32000000;
do $$
begin
  if not exists (select 1 from storage.buckets where id = 'cad-design-assets'
    and public = false and file_size_limit >= 40000000
    and allowed_mime_types = array['application/json']::text[]) then
    raise exception 'Unexpected CAD storage configuration; inspect before changing it';
  end if;
end $$;
commit;

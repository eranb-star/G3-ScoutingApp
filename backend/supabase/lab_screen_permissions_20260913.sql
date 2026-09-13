begin;
insert into public.app_permissions(permission_key,permission_group,label,label_he,description,protected,sort_order) values
('view_evidence_search','Engineering lab','Show Evidence Search','הצגת חיפוש מקורות','Access the engineering evidence search screen and published evidence.',false,160),
('view_field_twin','Engineering lab','Show Field & Robot Twin','הצגת מודל מגרש ורובוט','Access the field and robot studio.',false,170)
on conflict(permission_key) do update set label=excluded.label,label_he=excluded.label_he,description=excluded.description;
insert into public.role_permissions(role,permission_key,allowed)
select r.role,p.permission_key,r.role='admin' from (values('member'),('team_leader'),('mentor'),('admin')) r(role) cross join (values('view_evidence_search'),('view_field_twin')) p(permission_key)
on conflict(role,permission_key) do nothing;
drop policy if exists evidence_sources_read on public.frc_evidence_sources;
create policy evidence_sources_read on public.frc_evidence_sources for select to authenticated using(public.has_permission('view_evidence_search'));
drop policy if exists evidence_claims_read on public.frc_evidence_claims;
create policy evidence_claims_read on public.frc_evidence_claims for select to authenticated using(public.has_permission('view_evidence_search') and (status in ('published','conflicted') or public.is_admin()));
commit;

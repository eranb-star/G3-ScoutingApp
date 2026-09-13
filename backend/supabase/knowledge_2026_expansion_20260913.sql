begin;
-- Factual summaries verified against TU22, section 6.4 table 6-2 and the contents.
insert into public.frc_evidence_claims(id,source_id,title,body,locator,status) values
('b9999999-0000-4000-8000-000000000006','manual-2026-tu22','2026 teleop shifts','TELEOP contains a 10-second transition, four 25-second alliance shifts, and a 30-second end game.','Section 6.4, Table 6-2 · PDF page 44','published'),
('b9999999-0000-4000-8000-000000000007','manual-2026-tu22','Where to check robot construction','Use section 8 for construction requirements, including bumpers, motors and power distribution. A historical design is not proof of compliance.','Section 8 · PDF page 75 onward','published')
on conflict(id)do nothing;
commit;


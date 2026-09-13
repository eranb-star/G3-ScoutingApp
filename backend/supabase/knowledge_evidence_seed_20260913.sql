begin;
insert into public.frc_evidence_sources(id,title,season,authority,url,revision,sha256,checked_at)values
('manual-2026-tu22','2026 REBUILT game manual',2026,'manual','https://firstfrc.blob.core.windows.net/frc2026/Manual/2026GameManual.pdf','TU22 snapshot','5c67300fc412a1eed8ca9dc37fb6644aee05795a2befed1f69736643cbf95139','2026-09-13T00:00:00Z'),
('manual-2024-snapshot','2024 CRESCENDO game manual',2024,'manual','https://firstfrc.blob.core.windows.net/frc2024/Manual/2024GameManual.pdf','Archive snapshot 2026-09-13','1b7e1dc3fe1b1bd64d97a482d7e78eb419ec77d611a15226a16b0c7011069b94','2026-09-13T00:00:00Z'),
('manual-2022-snapshot','2022 RAPID REACT game manual',2022,'manual','https://firstfrc.blob.core.windows.net/frc2022/Manual/2022FRCGameManual.pdf','Archive snapshot 2026-09-13','44edf74d18d561f397eba1eef4a804ef51b6d97eecb0e9113ed1ffe88920ddad','2026-09-13T00:00:00Z')
on conflict(id)do nothing;
insert into public.frc_evidence_claims(id,source_id,title,body,locator,status)values
('b9999999-0000-4000-8000-000000000001','manual-2026-tu22','2026 field dimensions','The field is approximately 651.2 inches long and 317.7 inches wide. Detailed geometry and tolerances require the official drawings.','Section 5.2 · PDF page 18','published'),
('b9999999-0000-4000-8000-000000000002','manual-2026-tu22','2026 auto and teleop timing','AUTO lasts 20 seconds; TELEOP lasts 140 seconds. A three-second scoring delay separates them.','Section 6.4 · PDF page 44','published'),
('b9999999-0000-4000-8000-000000000003','manual-2026-tu22','2026 active hub fuel scoring','FUEL scored in an active HUB earns one point; an inactive HUB earns zero. Consult the manual for timing and scoring conditions.','Section 6.5.3 · PDF page 47','published'),
('b9999999-0000-4000-8000-000000000004','manual-2022-snapshot','2022 shared hub','RAPID REACT used a central HUB with upper and lower goals. This historical target geometry is not a 2026 design requirement.','Section 5.3 · PDF page 25','published'),
('b9999999-0000-4000-8000-000000000005','manual-2024-snapshot','2024 game piece','CRESCENDO used a foam torus called a NOTE. Its geometry differs from 2026 FUEL; historical mechanisms need fresh validation.','Section 5.7 · PDF page 34','published')
on conflict(id)do nothing;
commit;

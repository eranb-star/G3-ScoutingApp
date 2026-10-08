# Workshop reminder date — 8 October hotfix
scheduled-operations now includes weekday, calendar day, month, year and time in Asia/Jerusalem in newly generated workshop reminders. Date-only formatter correction 963bf2f; deployed through Supabase Code editor after verifying live source matched repository. Example verified: 8 October 2026 18:00 Israel time. Existing sent notifications are not rewritten; no APK rebuild required. No reminder was manually sent during verification.

# Operational corrections — 8 October (live; APK 2.3.1 ready)
Read [OPERATIONAL_CLARITY_20261008.md](OPERATIONAL_CLARITY_20261008.md). Attendance feedback, fundraising authorization, pending purchase correction/cancellation and compact operational rows are deployed. Source fc70f3c, production 284FhBDVeqhcZRrhWHSv8vbVy4hJ Ready on g3-6740.com; migration applied; CI 286/287 passed. Signed APK releases/G3-Team-Hub-2.3.1.apk/code26 built and verified, not physically installed/tested. This supersedes older APK status below. Old APK purchase approvers must update/use web. Older inventory-role defaults do not match current live grants: Team Leader was enabled but server subteam scoping caused the fundraising mismatch; dedicated manage_fundraising now resolves it without altering inventory grants.

# CAD Mentor — actual Onshape viewing and review are live
Read [CAD_MENTOR_RELEASE_20261005.md](CAD_MENTOR_RELEASE_20261005.md) first for deployment, real-design acceptance, critical evidence regression fixes and precise remaining work. Frontend c2df378 is Ready at g3-6740.com/engineering/cad (AVwiEmPi1EJP78nHxYS55LYDuLZ8); connector includes citation-range fix d9fad99. OAuth, private actual sketch/part geometry, revision-pinned cited Gemini reviews, findings and verification are delivered. User explicitly approved the read-only grant, callback setting and the two selected designs' Gemini acceptance reviews. Do not repeat setup or confuse the wider design roadmap with delivered capabilities. CAD remains private to the connecting active admin; team sharing/native CAD changes/physical engineering validation are not enabled. APK remains 2.3.0/code25.

# Fundraising & Production — verified production release
Read [FUNDRAISING_PRODUCTION_20261004.md](FUNDRAISING_PRODUCTION_20261004.md) first. Workspace under Work → Team Operations connects products, print jobs, filament stock, event sales and one-time Finance income. User-selected default operating cost is ILS 0.50/item and editable. Tests, role boundaries, immutable costs and remaining printer/payment boundaries are recorded there. Live source 8ad8ddd (implementation 015623e), Ready production AJ1JDGoe9Kp2uWSfBCGa2KaLaSP2 at g3-6740.com/fundraising. Migration and RLS verified; CI 270/271 passed; live form uses six existing filaments and 0.5 default. Earlier statements that the entire fundraising workspace is unimplemented are historical.

# CI failure correction — 4 October 2026
GitHub runs 250–263 failed after successful web builds because verify-mobile-notification-stability.mjs still required obsolete GITHUB_TOKEN and unrestricted /user/repos?visibility=all source strings. Private repository implementation deliberately uses G3_ROBOT_GITHUB_TOKEN and permission-controlled explicit allowlist. Removed obsolete assertions and added actual test-private-repositories.mjs handler acceptance as a dedicated CI step, including exact allowed URLs, server-only token, redirect rejection, active membership and denied private reads. Keep these behavioral checks; do not restore unrestricted listing to satisfy stale tests. Local focused checks passed. Require green GitHub CI on both working and release branches before future release completion claims; Vercel build alone is not full CI acceptance. Notifications unchanged. This is CI-only; production runtime and APK unchanged.

# Filament inventory — latest production checkpoint, 4 October 2026
Read [FILAMENT_INVENTORY_20261004.md](FILAMENT_INVENTORY_20261004.md). Existing Add part now supports Filament details, common/custom dropdowns and automatic reference costing. Implementation 040ab16, release d8ca50f, production EynTWPRirAQus5dH2uf8RJWtpqpr is Ready at g3-6740.com; migration applied. Tests and authenticated live form verification passed. Superseded by the Fundraising & Production release above, which adds result-driven consumption and event income. APK unchanged 2.3.0/code25. Earlier deployment entries below are historical.

# Private robot connection — current entry-flow correction
Read [PRIVATE_ROBOT_CONNECTION_20261004.md](PRIVATE_ROBOT_CONNECTION_20261004.md) first. The initial manual-attachment acceptance missed the natural repository button flow: the user's SysId conversation had NULL software context. Corrections `0d814e3` and `11d5304` add automatic actual-source retrieval, large-file excerpts and fail-closed repository requests. Release source `0e58a59`, production promotion `2fm9FjH1nH7Rt9PsmivpSbbnE9Rd`. Exact SysId entry tested on real Rebuilt_2026: six implementation files, ten code citations and persisted commit. Boundaries and two test costs recorded in the release document. Do not claim whole-repository review or compiled generated code. Admin-default permission remains unchanged. APK remains 2.3.0/code25.

# Official training — latest implementation, 4 October
Current live release: complete catalogue implementation `81d2081`, production source `14ed060`, Ready deployment `NYxQmc3ETY5gr1TvrvcWrcNNifdA` at g3-6740.com. Complete migration applied; authenticated catalogue/direct-course/certificate-form checks and responsive overflow check passed. Earlier deployment IDs below are historical. Proof and regression results are in OFFICIAL_TRAINING_RELEASE_20261004.md.
Complete Guided Experience catalogue supersedes the initial subset: all 12 numbered modules plus the separate full path; 11 modules available, Module 9 unavailable on FIRST. Read the first section of OFFICIAL_TRAINING_RELEASE_20261004.md. Added official_training_complete_20261004.sql after the base/link migrations; required path coverage is now modules 1–7, 11, 12, never optional 8/9/10. Reuse the existing certificate workflow; do not rebuild it or describe this as the entire multi-program FIRST catalogue.
Direct-link correction: read the first section of OFFICIAL_TRAINING_RELEASE_20261004.md. Latest live deployment `asmdkZdkZRHwGfMn4X9kpaF7mG7r`, source `ff583ee`, implementation `70896bc`. Verified course/path URLs replace the catalogue fallback. FIRST Module 9 is currently a coming-next-season placeholder, not an available course. Path completion does NOT prove optional Modules 8/9; their automatic coverage is disabled. Applied official_training_links_20261004.sql after the base migration; production UI acceptance passed. The live LMS takes precedence over the earlier PDF-based availability/coverage assumptions.
Read [OFFICIAL_TRAINING_RELEASE_20261004.md](OFFICIAL_TRAINING_RELEASE_20261004.md) first for current implementation, verification, release status and remaining boundaries. Live production: `2St5uDzrPb5SAQUPsrXCNghxn9M8`, source `c4956de`; implementation `240c808`. Database, private upload service and authenticated student/reviewer acceptance passed. Official completion stays on FIRST; G3 verifies reusable evidence, preserves practical checks and prevents duplicate theory work. Do not claim FIRST API synchronization. APK remains 2.3.0/code25 and does not include this new bundled UI.

# Latest APK milestone — 2.3.0 / code 25
Signed APK built and verified on 2 October. Read [APK_MILESTONE_20261002.md](APK_MILESTONE_20261002.md) for artifact, hashes, source and physical acceptance. Older APK 2.2.0 statements below are historical. The website has since advanced to the official-training release above.

# Latest checkpoint — hopper linkage and absence dates
Read [HOPPER_ABSENCE_RELEASE_20261002.md](HOPPER_ABSENCE_RELEASE_20261002.md) first for the latest fix, migration, validation, release status and APK boundary. Live production: 56T93uBBkRtDMJQYcJX4bCejHDBu, source 35ab794; authenticated acceptance passed. Earlier deployment IDs below are historical.

# Limestone simulator / alliance bumpers — latest increment
Read [LIMESTONE_SIMULATOR_RELEASE_20261002.md](LIMESTONE_SIMULATOR_RELEASE_20261002.md) first for this increment, exact material mappings, estimates and release status. Live: `DpXyJJtun9zxCG4PxQubQDCRycnt`, source `14279b1`; production visual acceptance passed. No database or APK change.

# Simulator training / robustness — latest increment
Read [SIMULATOR_TRAINING_RELEASE_20261002.md](SIMULATOR_TRAINING_RELEASE_20261002.md) first for current scope, validation, alliance behavior and boundaries. Production Ready: `3SC96qomfb5Rj5FGFh4HEMe2FEkj`, source `7d67507`; database migration applied. APK remains 2.2.0/code 24. Earlier priorities below are historical when they conflict with the user’s team/software/simulator-first direction.

# Knowledge / Academy — production release, 2 October 2026
Read [KNOWLEDGE_ACADEMY_RELEASE_20261002.md](KNOWLEDGE_ACADEMY_RELEASE_20261002.md) first. Production deployment `CUSBK5AWY7JAB9c83uiQdgFDKsrw`, source `0c1d06a`, is Ready at g3-6740.com. Both additive migrations are applied; authenticated read-only acceptance passed. Implementation, tests, boundaries and rollback are recorded there. APK remains 2.2.0/code 24.

# Knowledge / Academy review — historical rationale
Read [KNOWLEDGE_ACADEMY_RECONCILIATION_20261002.md](KNOWLEDGE_ACADEMY_RECONCILIATION_20261002.md) for the accepted workflow direction and pre-change gaps. The user subsequently authorized implementation, now released as recorded above. Do not re-propose those repaired flows as missing.

# Academy navigation and language — preceding release
Read [ACADEMY_UX_RELEASE_20261002.md](ACADEMY_UX_RELEASE_20261002.md) first for the Academy redesign, actual release identity, validation and boundaries. Language is controlled in Settings only. The older prototype document is design history, not current deployment status.

# Practical learning and measured trials — current release
Read [TEAM_LEARNING_TRIALS_RELEASE_20261002.md](TEAM_LEARNING_TRIALS_RELEASE_20261002.md) first. Priorities 1 and 2 are implemented; its release status supersedes the recommendation-only entries below. Preserve existing reliability tables, explicit enrollment, private quiz keys and human practical review.

# Current remaining priorities — 2 October 2026
Read [REMAINING_PRIORITIES_20261002.md](REMAINING_PRIORITIES_20261002.md) for reconciled delivered scope, exact remaining increments, dependencies, estimates and team-first order. This is a recommendation/documentation update, not a new feature release or live infrastructure audit. It supersedes older priority orderings below.

# Latest robot learning release
Read `ROBOT_LEARNING_CAN_RELEASE_20260929.md` first for the CAN workshop and production acceptance. Live production: source `531dc0a`, deployment `65JDMRsnRkW3kz8YRmrBbvMt3VH6`. It supersedes earlier not-deployed lab status.

**Latest robot learning update (29 September):** [ROBOT_LEARNING_SUBSYSTEMS_20260929.md](ROBOT_LEARNING_SUBSYSTEMS_20260929.md) supersedes the single-robot status: Darwin + Limestone, subsystem highlighting and electrical guidance are deployed via the 29 September CAN release above. 2910 remains external; actual robot harness mapping is not established.

**Latest authorized learning work (29 September):** [ROBOT_LEARNING_LAB_20260929.md](ROBOT_LEARNING_LAB_20260929.md) records the implemented local Darwin inspection lab, exact model research/import gaps and acceptance. Historical first increment, superseded by the deployed two-model lab and CAN workshop above. Do not treat its former single-model/local-only status as current.

**Proposed next priorities (28 September):** [TEAM_FIRST_ROADMAP_20260928.md](TEAM_FIRST_ROADMAP_20260928.md) reconciles the latest release with the low-mentor team objective. Prioritize guided student engineering plus measured robot improvement; discussion does not authorize new implementation.

**Latest integrated Studio release (28 September):** Read [STUDIO_INTEGRATED_20260928.md](STUDIO_INTEGRATED_20260928.md) FIRST for the actual Drive/Practice/Engineering implementation, full-match rehearsal, smooth route/headings, Java scaffold, team banner, acceptance, limitations and deployment status. Production source `0fe362c`, deployment `BEawEmN8ZSAYsdciqeVyXA2ySG5p`, live-verified. It supersedes the design-only status below.

**Main Studio design proposal (28 September):** [STUDIO_MAIN_UX_20260928.md](STUDIO_MAIN_UX_20260928.md) records the outer Studio redesign request and browser prototype. Figma tool quota blocked editing; no production change this turn.

**Latest Studio UI:** Read [STUDIO_UX_IMPLEMENTATION_20260925.md](STUDIO_UX_IMPLEMENTATION_20260925.md) for the approved Figma implementation, real CAD preservation, viewport expansion and exact release status.

**Latest camera correction:** Read [CAMERA_ROTATION_SURVEY_20260925.md](CAMERA_ROTATION_SURVEY_20260925.md) for explicit route headings, mounted-camera playback/independent inspection, sampled CAD blind-zone survey and exact release evidence. Existing headings are preserved; new route direction controls do not infer shooter intent.

**Latest team-first release (25 September):** [TEAM_PLANNING_PRACTICE_20260925.md](TEAM_PLANNING_PRACTICE_20260925.md) records shipped own-robot planning and structured practice work (source 9cac90f; production EFEivjaqgHeFGmxp134QQRW2aNce). This supersedes earlier alliance-first ordering; check its release status.

**Next priorities clarified 25 September:** [NEXT_PRIORITIES_20260925.md](NEXT_PRIORITIES_20260925.md) supersedes earlier recommendation ordering. Read the mandatory recommendation reconciliation in [WORKING_EXPECTATIONS.md](WORKING_EXPECTATIONS.md). Delivered season setup/Check now and answer fixes must not be proposed again.

**Current checkpoint (25 September):** Read [CHECKPOINT_20260925.md](CHECKPOINT_20260925.md) first for the latest release, delivered capabilities, actual remaining work, APK and required inputs. Earlier phase estimates and release identifiers below are historical where superseded.

**Latest robot-first and camera workflow:** Read [PLANNER_START_CAMERA_20260924.md](PLANNER_START_CAMERA_20260924.md) first for current behavior, migration and release status.

**Latest planner correction:** Read [PLANNER_USABILITY_20260924.md](PLANNER_USABILITY_20260924.md) for actual-field route editing, continuous motion/intake, compact controls and explicit code-generation status. Then read [ENGINEERING_RELEASE_20260924.md](ENGINEERING_RELEASE_20260924.md) for underlying A/B/C/E capabilities and limits. The whole A–E programme remains authorized. D needs actual repository inputs AND generator implementation/build validation; it is not an existing hidden download.

# Start next session — current checkpoint, 24 September 2026

Production now includes reviewed deterministic scoring, numeric autonomous policy, actual CAD camera analysis, revisioned cloud workspaces and bounded route recommendations. Exact scope, acceptance and follow-up deployment are in the release record above. Older local-only checkpoints are historical.

Read this entry point before planning or implementing. Do not rely on conversation history or older “selected next / not deployed” banners.

## Required reading order

1. [Working expectations and regression lessons](WORKING_EXPECTATIONS.md).
2. [Authoritative current phases, delivered scope, season architecture, APK and open inputs](CURRENT_PHASES_20260924.md).
3. [Latest engineering production release: exact source/deployment/hash, acceptance and limits](ENGINEERING_RELEASE_20260924.md), then [previous three-increment release and recovery evidence](THREE_INCREMENT_PROGRAMME_20260924.md).
4. The selected feature's linked release/design documents and actual code. Use [official ingestion](OFFICIAL_INGESTION_20260924.md), [Software Mentor](SOFTWARE_MENTOR_PHASE1_20260924.md), [latest simulator settings](SIMULATOR_SETTINGS_20260923.md), and [APK milestone](APK_MILESTONE_20260921.md) as applicable.
5. For longer-term requirements, [agreed feature details](NEXT_PHASES_AGREEMENT_20260921.md), [connected knowledge design](CONNECTED_KNOWLEDGE_DESIGN_20260920.md), [master programme](PAUSE_HANDOVER_20260913.md) and [collection coverage](research/FULL_COLLECTION_20260920.md). Current status/order in item 2 overrides older status language.

## Current boundary

- Engineering website source `5046a7f`, production Vercel `J4UXhWDK8ZAFxb8aiDxvVKNXptsc`, supersedes `a776397` and `8fb99dc`. See the engineering release record for exact acceptance, backend hash and rollback. Later documentation commits are separate from the running website source.
- Delivered knowledge/Gemini/budgets, selected-code Software Mentor, supported official ingestion, simulator milestones and existing mentor/task workflows must be extended, not rebuilt.
- Decision UI and saved-answer task provenance deployed; synthetic workflow acceptance passed; permission tightening and local encrypted restore passed. The supported mixed-level tower calculation now passes production acceptance through deterministic server authority. Broader strategy/follow-up/classifier evaluation, portable/offsite/full-service recovery and physical acceptance remain open.
- APK remains 2.2.0/code24 from September 21, predating later website features. Do not describe it as current with production.
- Future-season architecture is now captured: shared engines plus versioned season packages; separate knowledge/field/simulation readiness. Check now does not currently generate a full playable future field. The user agreed direction; no new feature phase is started by this documentation update.
- Active authorized programme: A–E. Preserve the delivered reviewed rules/policies, CAD camera analysis, cloud plans and bounded route recommendations; continue the specific remaining software scope in the engineering release record. Actual repository integration awaits the team's repository identity; recovery awaits destination/key custody. Do not treat the earlier phase table as an instruction to rebuild delivered features.

## Repository discipline

Main working branch `codex/release-1-qa`; isolated release branch `codex/knowledge-protection-release` at `docs/staging/knowledge-release.local`. Inspect status before edits, preserve unrelated Android `.idea` edits and do not deploy accumulated working-tree changes wholesale. Never commit secrets, private backup objects/keys, downloaded corpora or signing credentials. Tests and documentation reduce regressions, not guarantee none.

[Previous accumulated start notes](START_NEXT_SESSION_HISTORY_20260924.md) are preserved as historical evidence only. Their contradictory not-deployed/awaiting-selection/missing-ingestion statements are superseded. [Earlier session history](SESSION_HISTORY_20260921.md) remains available.

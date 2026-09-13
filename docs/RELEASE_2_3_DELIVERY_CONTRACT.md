# Release 2/3 bounded delivery — 2026-09-13

User authorized a live 2026 knowledge release with a bounded historical pilot, followed by the Field & Concept Twin. Comprehensive 2017–2026 depth remains later expansion. Reuse shared knowledge, Projects and review gates. No new APK unless requested; no new paid provider or autonomous CAD writes.

## Visible delivery

- Knowledge: source-pinned official 2026 references, historical pilot (2022/2024), exact citation locators, authority separation, conflicting/insufficient evidence states, administrator curation, existing team articles retained. Retrieval is deterministic and makes no paid model calls. Existing G3 Assist remains separately identified; its old rate limit is not a comprehensive AI cost ledger.
- Twin: 2026 detailed field and KitBot models from the BSD-licensed AdvantageScopeAssets distribution, credited with exact hashes; concept robot dimensions, keyboard/touch/gamepad, safe disable, planar obstacle proxies, scripted closed-loop Auto Play, fixed-step recording/replay and same-input comparison. Robot and field visualization are not validated mechanical/dynamic/scoring solvers. No physical actuation route.
- New pages lazy-load. No field/robot download on Home. Text/2D fallback, explicit download size, bounded local storage and cache controls.

## Simulation tolerance profile v1 — published before engine implementation

- Engine identity `g3-concept-v1`, SI metres/radians/seconds. Scene uses right-handed Z-up; simulation origin at field centre, +X toward red wall, +Y toward the left when viewed from blue. FIRST blue-wall coordinates convert by adding half field length/width.
- Fixed step 1/60 second; ordered normalized commands, no wall-clock input inside the transition function. Deterministic scripted waypoint policy `patrol-v1`; no randomness in this profile.
- Record configuration, engine/model/asset identity, initial state, ordered commands and checkpoints every 60 ticks. Numeric pose tolerance 0.00001 m/radian; checkpoint tick and collision counters exact. Replay consumes recorded commands, not waypoint-policy state. Maximum recording 7200 ticks. Version mismatch is rejected; checkpoint divergence is reported as REPRODUCIBILITY_FAILURE; no cross-browser determinism guarantee.
- Same-input A/B uses the same command sequence with two explicitly labelled concept geometries; not a claim of fair strategic performance.
- Hardware/network acceptance remains actual-device evidence. Browser benchmark reports observed rendering/loading values only, never an invented school-device pass.

## Required focused checks

Knowledge source authority/season isolation/conflict exclusion and access controls; no paid call in retrieval. Twin fixed-step replay, invalid import rejection, boundary/obstacle collision, disable and input release. One build and one integrated desktop/narrow visual check; repeat only on changed/failing behavior.

## Status

Live review pilot deployed from `c8b32a3` on 2026-09-13. Vercel deployment `8kniSjFoW8QdsdyABMfkEo4LANL5` is Ready:
https://g3-scouting-app-5qpe-iuk8prg5c-eranbos-projects.vercel.app/field-twin

Knowledge route: `/knowledge`. Both routes require an active member session. The deployment opened successfully at login; authenticated hosted acceptance has not been claimed. Preview uses the isolated QA environment. Production was not promoted.

QA migration and seed executed successfully. Five published seed references span 2026 (three), 2024 (one), and 2022 (one). This is a small evidence pilot, not a complete 2026 Gold Set or a ten-year corpus. Source documents are linked, not hosted.

Validation completed: TypeScript compilation, Vite build, focused pure-engine/retrieval tests, focused PGlite migration/RLS/curation tests. Actual field and KitBot both loaded with verified hashes in the local browser harness. Observed rendering approximately 60 FPS field-only and 32 FPS with KitBot in the narrow app browser; this is not a representative school-laptop/network benchmark. Initial narrow-screen camera framing corrected. No physical gamepad was available for hardware acceptance.

Full V5.2 Release 2 still requires transactional multi-provider AI budgets, provider security acceptance and expanded knowledge Gold Set validation. Release 3 formal acceptance still needs representative-device/network and physical gamepad checks. These are not silently claimed by this live concept pilot. Full dynamics, match scoring, G3-specific CAD and engineering validation are not implemented by the planar concept model.

## Robot import increment
GLB upload (self-contained, uncompressed, maximum 40 MB), metre scale adjustment, forward orientation and browser-local IndexedDB persistence added. No native STEP/SolidWorks conversion or direct Onshape integration. No shared model library. Imported visual geometry does not redefine collision dimensions or add mechanism physics. TypeScript and valid/invalid GLB checks passed; full user-file/browser persistence acceptance remains open.


## Production and next scope — 2026-09-13
0158b67 promoted with production rebuild. Production evidence migration succeeded. g3-6740.com returns HTTP 200; bundle index-O-XWx9eP.js contains production Supabase ref and no QA ref. Next increment starts the 2017–2026 source directory and adds 2026 references. This directory is not full historical ingestion. User approved deferring new paid-AI budget/security work until after Phase 3; no new paid AI processing may be enabled first. Historical field selector needs licensed optimized assets and per-season geometry, separately from the knowledge directory.

## Ten-season and optimized-model increment — 2026-09-13
QA SQL applied successfully: 36 curated published references across 2017–2026, including seven for 2026. Official manual hashes and page counts are recorded in KNOWLEDGE_SOURCE_MANIFEST.json. This is overview coverage, not exhaustive ten-year rules coverage or a completed Gold Set. The knowledge selector spans all ten years; the 3D field remains 2026 only.

Derived AdvantageScope assets retain the existing BSD license and credits. Reproducible script: apps/dashboard_web/scripts/optimize-twin-assets.mjs. Field reduced from 4,276,594 to 734,041 triangles and 2,929 to 27 meshes; KitBot from 3,637,362 to 621,527 triangles and 623 to 42 meshes. Hashes are pinned in FieldTwinCanvas.tsx. Original assets are retained. Both detailed models remained selected and rendered at approximately 60 FPS in the local browser check; this is not a guarantee on other devices.

TypeScript and focused knowledge database tests passed, including ten-season/36-reference assertions. An isolated valid-GLB fixture restored from IndexedDB; changing orientation to 180 degrees through the UI and reloading preserved it. Native file chooser acceptance with the team's actual CAD remains pending. No physical gamepad or representative school device was available.

Remaining: deeper verified 2026/Gold Set coverage; historical field assets and geometry/selector; actual CAD and hardware acceptance; then deferred AI budget/security controls before enabling new paid AI. No APK or additional production promotion in this increment.

## Production promotion confirmed
846e515 promoted by production rebuild FKB4vVTTs on 2026-09-13. Vercel Ready, g3-6740.com assigned. Both incremental knowledge SQL files applied successfully to production. HTTP 200; index-B8WmLcCc.js contains production Supabase reference and no QA reference. Optimized assets and ten-season Knowledge selector are now production features; historical 3D fields remain unimplemented. No new APK built.

## Historical viewing and rule expansion — 2026-09-13
Added 12 TU22 rule/navigation summaries (48 references total; 19 for 2026). Focused database/RLS tests pass. Source conditions remain authoritative; this is not exhaustive rule certification.

Added checksum-pinned, optimized 2021–2025 AdvantageScope fields alongside 2026. Historical assets use their distributed rotation/dimension metadata. The 2021 model is not relabelled as 2020. 2017–2020 3D assets are not installed. Selecting a historical season disables driving and hides replay controls, avoiding use of 2026 obstacles on another field. 2021 and 2025 rendered with recognizable geometry; 2025 observed 60 FPS locally. License remains at public/twin/2026/LICENSE.txt and is linked in the viewer; exact sources/hashes are in HISTORICAL_FIELD_MANIFEST.json. Reproduction scripts are in apps/dashboard_web/scripts.

CAD import now reports measured bounds and triangle count, aiding scale selection. Gamepad mode reports connection state. Replay cannot start while driving. Actual team CAD and physical gamepad/device acceptance remain external checks, not claimed complete. Historical driving physics, missing early field assets and exhaustive knowledge coverage remain outstanding. AI controls stay deferred and no paid processing was enabled.

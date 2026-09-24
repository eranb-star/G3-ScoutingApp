# Engineering release work — 24 September 2026

This is the current A–E implementation record. Deployment identifiers and final acceptance are appended after release. Earlier checkpoints in ENGINEERING_PROGRAMME_A_E_20260924.md are history, not the current feature inventory.

## Implemented in this continuation

- Reviewed scoring versions, administrator draft/review/activate/deactivate/rollback UI, hash-bound sources and automatic invalidation when indexed documents change. Deterministic EN/HE scoring answers use server-loaded rules without a provider call for matching numeric questions; design answers receive a separate authoritative calculation. Software/image requests retain their existing path. Broad LLM prose is not guaranteed correct by this calculation block.
- Release-reviewed TU22 scoring: traversal threshold 50, teleop tower 10/20/30, eligible autonomous 15 each up to two robots. Seed requires the exact current indexed official manual SHA256 `5c67300fc412a1eed8ca9dc37fb6644aee05795a2befed1f69736643cbf95139`; pages 47–48. Never overwrite an existing administrator revision.
- Separate reviewed numeric autonomous policies with immutable revisions and explicit activation/deactivation. TU22 pages 43,44,47 establish 20 seconds, preload at most 8 and 1 point per fuel scored in an active hub. The planner reloads current server authority rather than trusting imported approval flags. This supported policy covers one game-piece value, not all future game interactions.
- Actual field/robot triangle-mesh camera obstruction, candidate mount/frustum and camera-eye views, published Darwin intake poses, least-camera target selection and worst single-camera loss. Up to 81 route samples, at most 12 candidates/3 cameras. Transparent surfaces are conservatively opaque. KitBot uses published CAD only, not added illustrative mechanisms. Camera analysis does not establish calibrated localization or detector accuracy.
- Account-owned cloud plans with private/shared read-copy access, immutable history, optimistic concurrency, owner-only updates and previous-version restore. Existing view_field_twin permission remains mandatory. Complete workspace import/export and local autosave include candidates and CAD-byte/scale/orientation identity. Limits: 100 plans/account, 200 revisions/plan, 750 KB/workspace and 20 MB cumulative JSON history/account, checked under an owner advisory lock.
- Timed partner reservation rectangles, reserve margin, inventory-aware bounded goal-subset/order recommendations and waypoint camera coverage ranking. Actual CAD analysis separately reviews the selected route. Partner detours conservatively exclude the entire reserved rectangle; no wait-window optimization or global-optimum claim.

## Verification and lessons

- Local tests: actual-mesh camera obstruction/count/failure; scoring/planning/storage/playback/inventory/generation; actual PostgreSQL fixtures for rule/policy lifecycle and plan RLS/concurrency. Existing simulator fidelity passes including feeding, 504-ball conservation, independent opponent/practice results, replay, 32 official tag poses and CAD integrity.
- Hosted QA schema and rollback-only plan test passed. Synthetic QA mentor lacks view_field_twin by existing configuration; shared plans correctly remain inaccessible. Do not grant permissions to make a test pass. Cross-user shared reads with authorized users are covered by local PostgreSQL fixtures.
- Browser: actual CAD load and analysis, material-preserving camera-eye view with real tags, ranked results and camera-failure counts. Further release-browser acceptance is recorded below when performed.
- Fixed single-material meshes accidentally passed as a material array, which caused raycast crashes for grouped geometry. Preserve single/array material shape.
- The TypeScript transpile-only test loader silently recovered a syntax error. It now fails on transpile diagnostics; backend bundling is a separate required check.
- Verified the deterministic answer is actually routed before provider execution; module tests alone did not prove this connection.
- Monaco editor fill changed only the exposed buffer segment: use select-all then paste and inspect the complete replacement before running SQL.
- Hash PDF bytes before transferring them into a parser; a detached ArrayBuffer hashes as empty. Official hash was independently verified from the file and production indexed document.

## Remaining acceptance / limits

The actual offseason repository and command mappings remain unknown until the workshop. No robot-compatible generated code/build can honestly be validated against an unidentified repository. JSON exports are planning drafts, not executable robot software. Physical calibration, real camera detection, headset/phone performance and robot execution still need hardware.

Planning remains conservative geometric decision support: complete game legality, validated starting zones, moving robots, shooter feasibility and simultaneous mechanisms are not certified. Camera candidates are manually placed; automatic mount-area extraction and complete moving-mechanism sweeps are not implemented. Future-season document ingestion does not automatically synthesize a field, physics or arbitrary new interaction rules. Do not mark the entire A–E programme complete on the basis of this release.

APK remains 2.2.0/code24, September 21. No APK rebuild or budget increase in this work. Preserve the $25 monthly cap.

## Deployment / final acceptance

- Initial website release: source `a77639788580b36b9344f93916a569860910dcff`, Vercel `BGCnXh9QXuPXJYEJibSTc9JsPaMV`, Ready/Production on `g3-6740.com`, built using production environment. Main implementation `dc16146`; both branches pushed.
- All three additive schemas and the hash-guarded TU22 seed applied successfully in production. QA schema passed; seed correctly refused QA because its matching indexed manual was absent. Never bypass this guard by relabelling synthetic data as official.
- Backend bundle SHA256 `db25b5b3e9d470853a75c38d36fd88e594d4117c27d84eb60e46c12eaf6eec09`. Reloaded deployed editor source matched the bundle exactly (69,117 characters, normalized line endings).
- Production exact question: whether all three robots need L2 or L2+L2+L1 qualifies. Answer displayed L1+L2+L2=50, other sufficient combinations, eligible auto contributions, and official PDF pages 47/48 with matching hash. History saved two rows. SQL confirmed `verified-scoring-v1`, input/output tokens zero for both messages. No provider call or budget increase for this evaluation.
- Production planner loaded official policy v1 (20 seconds/preload8/point1), cited pages43/44/47, and saved private verification plan revisions1 and2. Restoring v1 changed waypoint2 from -3.8 back to -4; source history remains immutable. Preload9 correctly produced "Official preload limit is 8" and was restored to0. One named private test plan intentionally remains; do not silently delete user-account data.
- Local and isolated release TypeScript/build passed; existing large-chunk warnings remain. Hosted Vercel build passed. Phone-width override did not actually change the IAB viewport (measured1265px); only desktop EN/HE layout is verified, not mobile/device acceptance.
- Acceptance follow-up corrects stale wording about scoring assumptions and updates the browse list after saving a new revision. This follow-up is not deployed yet at this point in the record.

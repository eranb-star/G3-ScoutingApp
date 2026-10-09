# Current checkpoint — 9 October 2026

This is the entry point for current status and decisions. It reconciles existing release evidence and this conversation; it is not a new audit of every production feature. Detailed feature records below retain acceptance limits. Older proposed phases and undeployed notices are superseded only where the named release records establish delivery.

## Read order for a new session
1. This checkpoint and the current user request.
2. WORKING_EXPECTATIONS.md, especially proportional verification and token/time discipline.
3. The release/design record for the specific area being changed. Do not reread the entire archive by default.
4. For Robot Build: ROBOT_BUILD_RELEASE_20261009.md, then the predevelopment master only when its requirements are relevant.

## Latest production and repository state
- Website: https://g3-6740.com. Latest deployed application: release commit fa0acc6 (development equivalent c3aa8ce, containing reminder change 11f3568).
- Vercel production: BYTTLawTaXZHYV5aaREsY56SH69M, Ready, promoted using production environment on 9 October. GitHub CI330/331 passed for the exact source/release commits.
- Authenticated production acceptance: compact Work reminders, defer panel, Team Operations navigation and Home's meeting horizon. No browser errors observed. No real reminder was deferred/dismissed during production acceptance; mutation tests used synthetic data.
- Branches: codex/release-1-qa is the development checkout; codex/knowledge-protection-release is the isolated release checkout under docs/staging/knowledge-release.local. Use git status before edits; preserve unrelated Android IDE/generated changes and ignored local artifacts.
- Documentation-only commits after the application release do not mean a new application was deployed. See REMINDER_UX_20261009.md for exact latest feature behavior and test correction.
- Latest signed APK remains 2.4.0/code27, built against prior release 9f11bee. It does NOT bundle the new reminder/navigation changes. No physical-device acceptance of that APK has been performed. Do not imply website deployment updates its bundled frontend.

## User decisions that remain binding
- Keep today's Robot Build/CAD/manufacturing functionality as delivered while the user reviews it with students. Do not start another CAD/CAM integration from earlier speculative planning.
- Onshape CAM Studio is not currently used or selected by the team. G3-native CAM is not authorized. Automatic native manufacturing exports remain unbuilt and are optional next work, not a prerequisite to use the existing uploaded-file workflow.
- No new paid Supabase recovery project. Reuse existing approved resources where feasible; do not infer permission for a paid service.
- Verification must match the change. Small edits do not justify full-system regression by default. No weakening of existing CI/security gates is authorized by that preference; CI trigger optimization remains unimplemented.
- User expects clear EN/HE UX, Settings as the language preference, preserved VR/fullscreen and existing source data, no parallel inventory/review systems, and exact implementation/deployment/physical-acceptance distinctions.

## Delivered capability index
| Area | Record to read | Important distinction |
|---|---|---|
| Home/Work reminders and Team Operations | REMINDER_UX_20261009.md | Production: compact rows, expandable details, 1/3/7/14/30-day or custom deferral, Deferred list/restore; personal reminder only, source dates unchanged. |
| Robot Build, BOM, sourcing, workshop, QC, assembly | ROBOT_BUILD_RELEASE_20261009.md; ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md | Expanded software deployed: 30 additive migrations and three functions; actual workshop pilot remains outstanding. Preserve G/S/A requirements; do not restart delivered portions. |
| CAD Mentor and source freshness | CAD_MENTOR_RELEASE_20261005.md; CAD_REFRESH_20261008.md; CAD_FIDELITY_AUDIT_20261008.md | Read-only, exact-revision provider evidence and inspection; not native-editor parity or automatic engineering certification. Master sketch confirmed planar with zero solid parts, not a flattened complete robot. |
| Private robot code / G3 Assist | PRIVATE_ROBOT_CONNECTION_20261004.md | Repository entry retrieves bounded actual code with commit/file context; not complete semantic indexing or compile-verified patch generation. Preserve private access/budget boundaries. |
| Fundraising, production and filament stock | FUNDRAISING_PRODUCTION_20261004.md; FILAMENT_INVENTORY_20261004.md; OPERATIONAL_CLARITY_20261008.md | Existing inventory/purchasing/finance reused. Editable ILS0.50 operating default per attempted print. Later permission/UX correction record supersedes initial role statements. Navigation is now Team Operations directly. |
| Attendance, purchase edits and compact operations UI | OPERATIONAL_CLARITY_20261008.md; HOPPER_ABSENCE_RELEASE_20261002.md | Preserve actual receipts, dates, reviewed purchase revisions and role boundaries. |
| Academy UX and Knowledge separation | ACADEMY_UX_RELEASE_20261002.md; KNOWLEDGE_ACADEMY_RELEASE_20261002.md; KNOWLEDGE_ACADEMY_RECONCILIATION_20261002.md | Existing learning/instructor flows and contextual references, not a new academy foundation. |
| Official FIRST training | OFFICIAL_TRAINING_RELEASE_20261004.md | Recorded complete Guided Experience: 12 modules plus path; Module9 unavailable at verification. External FIRST completion and local certificate review are distinct; no automatic FIRST completion API claim. Recheck provider availability only when relevant. |
| Practical team learning and robot trials | TEAM_LEARNING_TRIALS_RELEASE_20261002.md | Reuse assignments, evidence and qualification; simulation is not physical certification. |
| Real robot learning / CAN lessons | ROBOT_LEARNING_CAN_RELEASE_20260929.md; ROBOT_LEARNING_SUBSYSTEMS_20260929.md | Reference robot lessons are separate from measured team-robot configuration. |
| Simulator, training, Studio, cameras and VR | SIMULATOR_TRAINING_RELEASE_20261002.md; LIMESTONE_SIMULATOR_RELEASE_20261002.md; HOPPER_ABSENCE_RELEASE_20261002.md; STUDIO_INTEGRATED_20260928.md; CAMERA_ROTATION_SURVEY_20260925.md | Existing VR and simulator are already built. Physical calibration/headset/controller acceptance and specific remaining fidelity scope are distinct. |
| Broader roadmap | REMAINING_PRIORITIES_20261002.md; TEAM_FIRST_ROADMAP_20260928.md; V5.2 blueprint | Historical priority lists are not current authorization and must be reconciled with October4–9 releases before recommendations. |

See [CAM_WORKFLOW_DECISION_20261009.md](CAM_WORKFLOW_DECISION_20261009.md) for the retained analysis, unknown machine details and explicit decision not to start CAM development.

## Explicit remaining acceptance / optional future work
- Genuine workshop pilot: released part, assigned operation, actual manufacture, independent QC, material/stock result and installation/retest. Do not fabricate evidence. Recommended next for the current Robot Build scope, not an automatic request to start unrelated development.
- Physical APK installation/login/file download and device-specific behavior; newer web changes require a future APK rebuild if requested.
- Full-application disaster recovery and measured recovery timing are not established by the successful scoped Robot Build restore.
- Automatic Onshape drawing/STEP/DXF exports are not delivered. Controlled CNC output uploads are conditional on the team's real workflow; current manufacturing-file types do not include G-code.
- Onshape CAM choice, CNC machine/post validation, representative logs matched to code, measured robot models and broad AI-review correctness remain evidence-dependent. Read the relevant release boundaries instead of calling entire existing features missing.
- CI currently runs broadly for pushes on both development/release branches. No path filters, gating relaxation or pipeline redesign has been implemented. Optimize separately if requested; avoid duplicate pushes/polling in the meantime.

## Resolved Skills Academy check
The old checker searched for the exact source string const canEdit=access.can(...). Actual code also requires instructor mode and rejects student preview. This was a stale assertion, not a demonstrated permission bug. The corrected test evaluates all eight boolean combinations and verifies manage_training receives the selected course department. All 42 legacy checks passed; application permission code was not changed. See REMINDER_UX_20261009.md.

## Continuation rule
The user subsequently authorized software/autonomous integration and real-log analysis (roadmap phases 1 and 2), choosing OFFSEASON_2026. Active progress, exact pinned repository, checks and unfinished scope are recorded in [SOFTWARE_LOG_IMPLEMENTATION_20261009.md](SOFTWARE_LOG_IMPLEMENTATION_20261009.md). Initial local parser/UI and isolated drivetrain candidate are NOT completion of either phase or a production release. CAD/CAM remains paused. Do not rerun broad suites, migrations, backups, provider calls or physical acceptance merely to reconstruct context.

Continuation: repository-specific drive-only Java export, reviewed coordinate transform, log operating modes/known structured channels, local comparison/evidence export and existing test-record draft handoff are now implemented locally. Generated Java compiled against pinned OFFSEASON_2026 with four passing tests; focused application tests, TypeScript and production build pass. No robot installation, private repository push, production application release or physical validation occurred. Mechanism contracts, in-app build execution, integrated Assist log diagnosis and remaining device/release acceptance are explicitly unfinished. Season code was inspected for reference only, not substituted as the target.

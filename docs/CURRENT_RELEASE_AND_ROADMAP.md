**Active phase — Software Mentor (24 September 2026):** User authorized implementation. The new offseason repository is not yet identified; use explicitly labelled public historical team code meanwhile. [Implemented first increment, QA evidence and remaining release gates](SOFTWARE_MENTOR_PHASE1_20260924.md). Production remains the simulator milestone; this phase is not yet released. This supersedes earlier awaiting-selection wording.

**Current planning decision — 24 September 2026:** Further simulator development is deferred at the user’s request. [Remaining simulator work and recommended next priorities](NEXT_PRIORITY_20260924.md). Recommended next: repository-aware Software Mentor; awaiting user selection. This supersedes older “Graphics A + B selected next” wording. No new feature implementation is authorized by this planning update.

**Latest simulator update:** Numeric keyboard editing, simultaneous single/double/triple shooting, KitBot capacity 40 and Darwin capacity 60/triple are deployed. Source `875ea52`, Vercel `A3xNMsgF3tGt7THHoGoxsiTKL1T8` (Ready). [Behavior, tests and rollback](SIMULATOR_SETTINGS_20260923.md).

**Latest production release: simulator fidelity, source `b65e929`, Vercel `2t2Bh17M3CMKA24JmLapC4j6vyZY` (Ready).** [Delivered scope, CAD/tag sources, acceptance and rollback](SIMULATOR_FIDELITY_20260923.md): intake contacts/feeding, 32 official AprilTags, part inspection, published 6328 Darwin and one shared-world computer opponent. Physical Quest/phone acceptance and measured robot calibration remain open; APK unchanged.

**Latest production release: shared timed practice and competition venue, source `7c7759a`, Vercel `FEZ7Svcb4FTfKrXxZzFH6eHE8GgQ` (Ready).** See [scope, validation and release record](SHARED_PRACTICE_VENUE_20260923.md). This extends the existing web/phone-web/VR simulator. Physical-device acceptance and the remaining match-fidelity phases are still open.

**Latest production release: VR phase 1 prototype, source `fcb806e`, Vercel `A6xSdguaqaCcv3FiUoz2XUHERt7Q` (Ready).** See [prototype controls, acceptance and deployment](VR_PROTOTYPE_20260921.md). This supersedes the earlier selected-next and no-further-phase wording below. Physical headset acceptance is pending; graphics and Android milestones remain delivered.

**Android milestone:** Signed APK **2.2.0 / code 24** built and verified. [Artifact, checksum and remaining physical acceptance](APK_MILESTONE_20260921.md). No further phase started.

**Production simulator release:** All graphics/intake/hopper/driver-view/fullscreen changes below are now deployed in `877208b`, Vercel `5z99hJLraPrbKKxzurFsHPEo3UBR`. [Verified release and rollback](SIMULATOR_PRODUCTION_RELEASE_20260921.md). This supersedes earlier not-deployed notices.

**Latest simulator update:** [Open carbon-tube intake, height cap and three driver-station views](DRIVER_VIEWS_20260921.md) implemented and checked locally; not deployed. This supersedes the solid intake tray in the previous scene-polish checkpoint.

**Scene polish update:** [Intake mounting and Step 3 scene polish](SCENE_POLISH_20260921.md) is implemented and checked locally. Not deployed; representative-device acceptance remains open.

**Hopper follow-up:** [Reference robot panels, stored balls and transfer animations](HOPPER_VISUALS_20260921.md) implements the user-selected visual Steps 1–2 locally; not deployed.

**Graphics update (2026-09-21):** The user subsequently authorized graphics A + B and default arrow-key movement. See [implementation and acceptance checkpoint](GRAPHICS_AB_20260921.md). Implemented locally, not deployed; this supersedes the earlier awaiting-start status below.

# Current release and roadmap — 2026-09-21

Read [START_NEXT_SESSION.md](START_NEXT_SESSION.md) for recorded production status and [WORKING_EXPECTATIONS.md](WORKING_EXPECTATIONS.md) for execution rules.

## Selected next increment

Graphics A + B and subsequent simulator milestones are delivered. Further simulator development is deferred. See [current priorities](NEXT_PRIORITY_20260924.md); the next implementation awaits user selection.

[Agreed next phases](NEXT_PHASES_AGREEMENT_20260921.md) is the authoritative detailed refinement: deliverables, dependencies, estimates, acceptance criteria and explicit non-goals. Read it before implementing. Estimates are not token budgets.

## Existing production foundation

Recorded web release: 73dee1d; Assistant Edge code: c754f5d. Paid Gemini, Admin topic exemption, $25 monthly application cap, source search and one successful official-cited 2026 climbing answer are recorded in [production acceptance](staging/KNOWLEDGE_CONNECTED_RELEASE_20260921.md). This documentation update makes no new live-verification claim.

Corpus: 1,716 sources / 48,797 distinct passages / 50,157 citations. Not exhaustive top-500 or ten-year coverage. Reviewed production robot catalogue remains empty. Existing task/review/dependency flows and chat budgets are not rebuild projects.

## Programme index

| Workstream | Remaining scope |
|---|---|
| 0 Recovery | Portable/offsite recovery, permissions and demonstrated restore. |
| 1 Engineering controls | Acceptance and demonstrated fixes to existing mentor/review/configuration/test/offline flows. |
| 2 Knowledge | Populated search UX, season document lifecycle, quality evaluation and answers linked to existing team decisions/tests; selective historical curation. |
| 3 Simulator | Replay/comparison, measured calibration and complete match/multi-robot behavior. Historical playable seasons are separate optional work. |
| AI extensions | Existing chat protections stay; extend governance for future paid background jobs and external actions before enabling them. |
| 4 Engineering Twin | Measured subsystem models; camera placement/count analysis; parameterized robot concepts with explicit assumptions and physical validation. |
| Software Mentor | Exact-version repository understanding/review, logs, bounded tested patches, simulation/tuning and learning through existing workflows. |
| 5 CAD/Onshape | Read-only version-linked review, then controlled approved edits. GitHub CAD and Onshape access are separate; labeled public/sample demos are possible. |
| 6 Manufacturing | BOM/materials, manufacture/QC/install lineage and reviewed machine-specific CAM. |
| 7 Orchestration | Authorized durable cross-system workflows, human gates, budgets and recovery. |
| Mobile | Current builds/distribution and real-device acceptance; deferred checkout separately validated. |
| Optional finance | Audited reversals, bank reconciliation, restricted funds, receipts and period close. Existing repayments already work. |

The [master handover](PAUSE_HANDOVER_20260913.md) preserves detailed programme/V5.2 scope and historical evidence. Older deployment/disabled/undeployed notes are historical and are superseded by START_NEXT_SESSION.md. In particular, the old ordering of all paid AI after Phase 3 no longer describes the already deployed protected assistant.

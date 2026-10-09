# G3 next phases — authoritative planning baseline, 10 October 2026

## Status and scope

Planning and documentation only. This plan does not authorize new development, paid services, permission expansion, robot deployment or physical certification. It supersedes the priority order in REMAINING_PRIORITIES_20261002.md and TEAM_FIRST_ROADMAP_20260928.md; their historical requirements remain useful. Current production is release e8438e3, Vercel 3eCUPFhMoP4682XKCTy98sN9dPTK. This is reconciliation of repository release/acceptance records and user requirements, not a fresh audit of every live service, role or third-party capability.

Vision: one understandable system that helps a lightly mentored team learn, design, build, program, test, operate and fund its robots. Completion means supported workflows and real acceptance evidence, not a promise of championship results or autonomous engineering certification. Every season still needs human engineering decisions and real robot measurements.

## Delivered baseline — extend, do not rebuild

- Work: personal command followed by Academy, Team Projects, Robot Build, Engineering Hub and Robot Health. Compact destinations; main-menu Team Operations, Knowledge and Field/twin retained without duplicate Work blocks.
- Academy/Knowledge: distinct learning/reference flows, six practical modules, 60 questions, 12 practical assignments, evidence/review/qualification, official FIRST module/path tracking and certificate review. Local review is not FIRST certification synchronization.
- Robot Build: explicit build/project scope, revision-pinned BOM and occurrence inspection, preparation/release, immutable uploaded work files, raw-material reservations shared with printing, partial lots/rework/scrap, operations/resources, purchasing continuation, substitution/change holds, installation, maintenance/retest, simulation/repository provenance and event handoff. This is already deployed, including 30 additive migrations.
- CAD: private read-only Onshape connection, catalogue refresh/current-source checks, pinned revisions, sketch/part/assembly inspection, coverage reporting, bounded evidence-based Assist review. Custom viewer is not the native editor or a geometric/structural solver.
- Software: private read-only repositories, exact-revision code context, reviewed task creation; local WPILOG parsing/modes/signals/comparison, bounded Assist excerpts and existing test-record handoff. OFFSEASON_2026 drive/wait export compiled against a pinned target with focused tests.
- Simulator: existing VR/fullscreen/controller paths, smoothing/bulk headings, alliance behavior, Limestone/intake-hopper visuals, drills, fuel-match rehearsal/hub states/cues, replay, shared trial protocol and deterministic sensitivity checks.
- Operations: inventory/filament spool and weight details, fundraising/costing/production, purchasing/finance, attendance, reminders, projects, reviews, reliability and competition operations. Do not create replacement registries.

## Effort and status conventions

All estimates are provisional engineering person-days for the bounded increment described (roughly six focused hours/day), including implementation, focused QA and documentation. They are not elapsed deadlines, model-token forecasts or promises to finish arbitrary future scope. Workshops, external approvals, content review and unavailable inputs add calendar time. Re-estimate after each first slice. Do not sum ranges into a reliable programme total: phases share work and later scope depends on evidence.

Remote means computer/account access is sufficient. A student can operate the robot while a remote mentor reviews evidence; this is still physical validation, even if the user is elsewhere. Phone/headset tests require devices but not necessarily the workshop.

Status codes: **OPEN** known undelivered work; **ACCEPTANCE** delivered software awaiting real use; **CONDITIONAL** only after a decision or demonstrated need; **DEFERRED** explicit user hold. All phases below are planned, not started by this document.

## Remote-first priority order

| Priority | Phase | Remote work | Physical/input dependency | Bounded effort | Benefit |
|---|---|---|---|---|---|
| 1 | Complete one useful software/autonomous loop | Contracts, reviewable integration, limits, simulation and matched-log workflow | Team command decisions; robot runs for acceptance | 8–15 days + 2–3 supervised sessions | Plans become tested robot behavior rather than only exported files |
| 2 | Student/leader adoption and targeted learning | Assign existing content, baseline skills, one deeper interactive exercise and remediation | Students for usability; hardware for practical qualification | 5–9 days + 2 learning sessions | Reduces mentor bottleneck and shows who can perform real work |
| 3 | Simulator training and fidelity | Reproducible scenario/settings handoff, training comparison, one subsystem calibration pipeline | Measured robot data, phone/controller/headset | 6–10 days before measurements; 4–8 after | Meaningful practice, clear simulation limits, measurable progress |
| 4 | CAD Mentor geometric checks | One bounded check type with exact source identity and selectable findings | CAD leader constraints; physical fit confirmation | 10–18 days for first check family | Finds actionable fit/service-access issues before manufacture |
| 5 | Vision and autonomous reliability | Calibration evidence/schema, diagnostics, repeat-run comparisons | Camera/robot configuration, detections and repeated real runs | 5–8 days preparation; 5–10 data integration | Quantifies localization and autonomous failure modes |
| 6 | Future-season transition | Versioned package/readiness/compatibility/rollback proof | Actual future-season assets only when published | 8–14 days for one synthetic transition | Avoids rebuilding the platform each season |
| 7 | Robot Build workshop and competition readiness acceptance | Prepare pilot/review existing records and repair demonstrated gaps | Manufacturing, QC, inventory and installation | 2–4 days preparation/triage + 1–2 sessions | Converts deployed workflows into proven team practice |
| 8 | Evidence-driven alliance planning | Review existing strategy flow; one measured-capability planning extension | Credible own/partner observations; later field rehearsal | 6–10 days | More realistic match roles and decisions |
| 9 | Optional manufacturing automation | Revision-bound export packages; external CAM handoff if selected | Provider feasibility; actual CNC/process validation | 5–9 days export slice; CAM separately estimated | Removes repetitive downloads without replacing CAM |

Priority is the next discretionary development order, not a reason to postpone an available workshop pilot or device test. Phase 6 should start before kickoff pressure, alongside earlier phases when capacity permits. Release/security work below is a parallel obligation, not the last phase.

## Phase 1 — software and autonomous completion

**OPEN / ACCEPTANCE.** Keep OFFSEASON_2026 as the target. Rebuilt_Practise remains learning/reference; Rebuilt_2026 is season reference. A wider old repository does not prove compatibility with the current robot.

1. Software leader records which current subsystems actually exist and approves intake, shoot/feed, readiness, cancellation, timeouts and fault behavior. Record unknown hardware/setpoints explicitly; do not invent them or require unfinished mechanisms before completing supported drive work.
2. Review the current proportional drive/wait candidate against the team's chosen follower and motion limits. Select a bounded supported solution; add acceleration/velocity constraints, coordinate/alliance tests, stop/interruption and timeout behavior as needed. Compilation alone is not tracking accuracy.
3. Generate a reviewable integration package against an exact SHA: changed files, dependencies, RobotContainer/chooser wiring instructions, mechanism contracts and build/test instructions. Local/manual compile and desktop simulation remain the supported path.
4. Log build SHA plus dirty-state/build identity through the team's robot-code process. Preserve operator association separately from recorded identity. Existing supplied practice log is partial and is not verified OFFSEASON_2026 autonomous evidence.
5. Use one representative matching run through Engineering Hub → Logs → inspect interval → exact code review → reviewed existing task → real retest record. Validate a complete answer with a bounded approved AI call and a software-leader rubric; earlier release did not validate a paid answer for this new excerpt.
6. Qualified team manually installs/reviews code, runs a low-speed test, then repeated autonomous trials on both alliances and interruption cases. Record tolerances before testing, not after seeing results.

**Exit:** buildable reviewed integration for supported actions, simulated lifecycle tests, verified code/run identity, and physical evidence meeting agreed criteria. Mark mechanisms unavailable until implemented and tested. No automatic robot deployment.

**Deferred:** app-triggered GitHub build/test. Benefit: compile/test feedback for a selected revision inside G3. Requires new separately approved Actions permissions; current read-only decision remains. It is not required for manual builds or this phase's core completion.

## Phase 2 — student capability and practical learning

**ACCEPTANCE plus focused OPEN extension.** Existing courses, quizzes, assignments and official certificate tracking remain the base.

1. Leaders choose real role-based learning paths and prerequisite skills; reuse completed courses/certificates rather than assigning duplicates. Establish initial completion/independence measures from real students.
2. Run two short remote student journeys: find assigned work, open course/reference, submit evidence, receive review/remediation, find the next task. Record observed confusion before adding UI.
3. Author one deeper CAN connector/wiring or mechanical assembly exercise using accurate manufacturer/reference assets: selectable parts/ports, close-up views, explainable mistakes and objective checks. This is an authored exercise, not automatic generation from arbitrary CAD. Confirm asset reuse rights and hardware variants.
4. Map the exercise to existing assessments and practical qualification. A virtual result cannot certify real wiring, crimping, torque or safe machine use.
5. Measure leader review burden and students needing help; reuse existing reporting first. Extend reporting only for a demonstrated missing decision, not another dashboard.

**Exit:** students complete a real assigned loop in their preferred language without repeating completed learning; responsible reviewers validate practical skills. Expand beyond the first exercise only after adoption evidence. Official FIRST completion remains on FIRST; G3 stores reviewed evidence, not a claimed provider API confirmation.

## Phase 3 — training simulation that transfers to the robot

**OPEN / ACCEPTANCE.** VR and the simulator are already built.

1. Close the scenario-sharing limitation: define a reviewed scenario containing settings/profile, alliance, route revision, objective and assumptions. Existing mission URLs are not complete robot/route packages. Reuse saved plans and trial records.
2. Add one reproducible training comparison/coach exercise where replay requirements are explicit. Existing visual replay is not necessarily deterministic input replay. Preserve historical settings and distinguish simulated from physical runs.
3. Choose one measured subsystem (drive first unless intake is the actual bottleneck); add calibration inputs, fitted parameters and held-out comparison with the measured data. Report error rather than claiming realistic physics from appearance.
4. Exercise full-screen controls, mobile, controller and actual VR headset. Ensure all essential controls remain reachable in each mode.
5. Consider tower, fouls and richer multi-robot interactions only if they change a real training decision; current fuel rehearsal is not full official match/referee equivalence. Scope that expansion separately after the first slice.

**Exit:** the same shared scenario restores the relevant inputs, comparable progress is visible, and one calibrated behavior has quantified error. Full match equivalence is a separate conditional deliverable, not included in the estimate.

## Phase 4 — CAD Mentor beyond viewing and general advice

**OPEN, currently DEFERRED pending student CAD/workflow review.** Keep the existing source refresh, revision pinning and inspection fixes.

1. CAD leader selects one actual subsystem and check objective: clearance, component envelope or service/tool-access envelope. Supply dimensions, motion range, tolerances and forbidden zones. CAD with missing materials/constraints cannot support all correctness claims.
2. Establish geometry/evidence coverage for that revision/configuration. Test large/nested models and budgeted loading; native annotations/appearance and full editor parity remain outside the current custom viewer.
3. Implement deterministic geometric checking for the selected case with explicit approximation/tolerance. Separate computed findings, metadata checks and AI suggestions. Do not present bounding-box overlap as precise interference or structural validation.
4. Show finding → highlighted involved parts → evidence/assumption → proposed correction → existing review/task → changed revision → recheck. Keep Onshape as the editing authority; do not create a second CAD editor.
5. Validate against CAD-leader-known positive and negative cases, then physical fit. Later add constrained alternative placement only with explicit user-supplied design constraints.

**Exit:** one useful class of design issue is repeatably detected with source identity, explainable false-positive limits and review/retest closure. Electrical completeness, strength, thermal behavior and arbitrary whole-robot optimization are separate domains, not implied by a visual model or first geometry check.

## Phase 5 — measured vision and autonomous robustness

**OPEN / physical evidence required.** Geometric tag visibility and eight sensitivity cases already exist; they are not calibrated pose error or success probabilities.

1. Bind actual camera model, mounting transform, calibration revision and robot configuration to existing trials.
2. Collect synchronized detection/pose and ground-truth observations, with known units and coordinate conventions. Agree success/error thresholds and battery/lighting/test conditions.
3. Add timestamped dropout, pose-error and route-outcome diagnostics against recorded data. Separate actual failures from hypothetical perturbations.
4. Compare repeated controlled runs before/after one change; include both alliances and held-out conditions. Use failure tasks/retests already delivered.

**Exit:** measured error/dropout and autonomous completion evidence for one real configuration/route; no claims of universal reliability. Reuse Phase 1 identity and Phase 3 calibration work, do not bill/build it twice.

## Phase 6 — season transition

**OPEN, deadline-sensitive.** Existing season selection and supported source refresh are delivered.

1. Inventory which field/assets/tags/transforms/colliders/scoring/game interactions remain coupled to the current season before editing.
2. Complete a versioned season package and explicit readiness states for reference knowledge, field inspection, simulation and code export.
3. Require reviewed activation and preserve old plans/results; show incompatibility and source changes instead of silently applying new rules.
4. Test current season plus a clearly synthetic different-game fixture and rollback. Actual next-season onboarding follows published rules/assets and may require new interaction code.

**Exit:** old and new season data coexist, unsupported capabilities are explicit, activation/rollback works. No promise that arbitrary new game manuals automatically become a complete simulator.

## Phase 7 — real workshop and event acceptance

**ACCEPTANCE, not a missing BOM system.** Can start whenever students/workshop are available, irrespective of remote development priority.

1. Select a real build, one manufactured part and one bought part; check source, release, quantity, responsible owner and approved work instructions.
2. Student uses the existing queue/files and records actual work/materials; exercise a genuine partial/rework case only if one occurs.
3. Independent QC, stock/kit/install, actual retest and configuration readiness follow. Confirm assigned students have correct access without granting private source access indiscriminately.
4. Follow one real repair through Robot Health and linked build records. Rehearse event/packing handoff and available offline behavior. Do not infer offline support for every new workflow from older competition features.
5. Log observed UX, quantity, role or concurrency defects; repair only demonstrated gaps. Existing workshop schema tests are already delivered.

**Exit:** real part-to-installation/retest trace and bought-part receiving trace, correct quantities/access, responsible sign-off. No fabricated production trials or procurement actions for acceptance.

## Phase 8 — alliance strategy

**CONDITIONAL extension after own-robot baselines.** Inspect current scouting, match operations and partner-reservation flow first.

Use measured own capability plus credible partner observations to compare feasible roles, route conflicts and contingency plans; show freshness/confidence and produce one concise driver briefing in existing Competition. Validate with a coach replay/tabletop exercise, then a real match. Do not build another scouting database. Exit: a coach can explain the plan and fallback using traceable evidence; missing partner data is not invented.

## Phase 9 — optional exports and external CAM

**DEFERRED.** Existing revision-bound uploaded manufacturing files already work.

- First possible slice: one supported Onshape drawing/geometry export family into existing controlled work files, with exact revision/configuration, asynchronous completion/failure handling, hashes and stale-source checks. Verify provider support/account entitlement before promising formats. Not toolpaths or G-code.
- If the team chooses an external CAM workflow later: record job/setup/machine/post/output identity and human review; add controlled file support only after actual formats/process are known. Reuse jobs, approvals and qualifications.
- Physical machine/post/setup validation remains essential. No G3 CNC control. No assumed adoption of Onshape CAM; the current toolchain and machine details are unconfirmed.

## Parallel release and trust work

| Work item | Remaining action / completion evidence | Remote vs physical | Effort |
|---|---|---|---|
| Current APK | Build/sign a milestone APK from accepted web source, preserve package/signature/version progression, verify bundled files; upgrade and exercise real login, deep links, work files/log picker | Build remote; Android device required, no workshop needed | 1–2 days + device session |
| Device acceptance | Loaded-log phone workflow, Samsung browser auth/check-in, downloads, EN/HE; actual VR/controller testing for relevant Studio changes | Devices needed; robot not needed for most | 1–3 days across a focused device matrix |
| AI evidence quality | Small maintained EN/HE evaluation set for actual code/CAD/log questions, citation/revision accuracy, missing-evidence handling, permission boundaries and cost; leader scoring | Remote, explicit private-data/provider boundaries preserved | 3–5 days initial, ongoing bounded maintenance |
| Full-app recovery | Inventory current DB/storage/functions/auth/config dependencies; use approved existing recovery resources, separate key custody, measure recovery and access checks without reconnecting live jobs/providers | Remote; owner decisions/access required; no new paid project | 3–6 days initial rehearsal; findings may extend |
| CI cost/time discipline | Assess duplicate branch runs and path-scoped verification; preserve required gates and shared-change coverage before any pipeline change | Remote; separately scoped improvement | 1–3 days |
| Performance/freshness | Measure actual large CAD/log/slow-phone cases before optimizing; explicit coverage, cancellation/errors and expired-token recovery | Mostly remote; representative devices/data helpful | 2–4 days for first measured bottleneck |
| Account continuity | Verify admin ownership, credential expiry/revocation and reconnect runbooks for existing connectors; no new access by default | Remote + account owners | 1–2 days |

These are not claims that existing security, backups, login or CI are broken. They distinguish known acceptance limits from proposed maintenance. Sponsor/awards evidence and finance close/reconciliation should first be reviewed with their owners; no confirmed implementation gap or estimate is asserted here. Fundraising and inventory need an actual event-cycle adoption review before further features are justified.

## First execution package when development is selected

1. Phase 1 discovery/contract slice (1–2 days within its estimate): inspect the latest approved OFFSEASON_2026 revision, identify implemented mechanisms and record a bounded acceptance matrix with the software leader. Continue supported drive integration even if mechanisms are incomplete.
2. In parallel in team time, assign existing Academy learning and schedule two student feedback sessions; no new courses required to begin use.
3. Prepare a short workshop capture pack: exact deployed-code identity, log, configuration, repeated drive/auto observations; one CAD fit target and one Robot Build part pilot. This unblocks several phases in one visit.
4. Schedule APK/device acceptance at a stable release boundary; do not require a workshop for phone testing.
5. Start the season transition audit before kickoff pressure; release each accepted slice without waiting for all roadmap phases.

## Workshop/input checklist — collect once, reuse

- Software leader: current branch/SHA, actual supported command contracts, intended autonomous sequence, cancellation/fault expectations and manual build/deploy owner.
- Robot operator: deployed build/dirty-state identity, matching full WPILOG, configuration/battery/conditions, repeated trial results and agreed tolerances. Supplied historical practice log alone does not satisfy this.
- CAD leader: one subsystem/revision, component envelopes, tolerances/motion/service constraints, known expected defects and actual current manufacturing workflow.
- Workshop/QC leaders: genuine released part and purchased item, authorized student/reviewer, stock/material observations and installation/retest evidence.
- Student/device volunteers: Android/Samsung browser and headset/controller where used; report task completion/obstacles, not just screenshots.

## Review passes and completeness controls

Pass 1 reconciled old proposals against later release records. Removed re-proposals for VR foundations, private GitHub connection, basic log parser, shared trials, Academy certificates and BOM/manufacturing foundation. Later Robot Build partial-lot/raw-material implementations supersede old whole-job-only statements.

Pass 2 checked end-to-end dependencies and user decisions. Retained missing mechanism contracts, real deployed-code identity, geometric-vs-AI distinctions, full scenario sharing limits, future-season deadline, real role/device/workshop acceptance, APK lag and full-app recovery. Preserved read-only GitHub, CAD/CAM pause and no-paid-project decisions.

Pass 3 checked duplication and claims. One source of truth for tasks, learning, inventory, builds and test records; no replacement dashboards. Real outcomes require real evidence. Remote work can prepare physical tests but cannot substitute for them. Estimates cover first useful slices; conditional full-match physics, structural analysis, CAM and arbitrary repository support are not silently included.

Before each phase: verify current source and affected contracts, choose owner and acceptance criterion, record exact scope/assumptions. At completion record code/build/check evidence, production version, real acceptance or explicitly pending physical work. Small visual changes need focused checks; shared permission/schema changes need broader relevant tests. Never label a phase complete solely because it is committed/deployed.

## Sources of record

- [Current checkpoint](CURRENT_CHECKPOINT_20261009.md)
- [Software workspace](SOFTWARE_WORKSPACE_20261010.md), [software/log implementation](SOFTWARE_LOG_IMPLEMENTATION_20261009.md)
- [Robot Build release](ROBOT_BUILD_RELEASE_20261009.md), [implementation latest status](ROBOT_BUILD_IMPLEMENTATION_20261009.md)
- [CAD fidelity audit and corrections](CAD_FIDELITY_AUDIT_20261008.md), [CAD freshness](CAD_REFRESH_20261008.md)
- [Simulator training](SIMULATOR_TRAINING_RELEASE_20261002.md), [team learning and trials](TEAM_LEARNING_TRIALS_RELEASE_20261002.md)
- [CAM decision](CAM_WORKFLOW_DECISION_20261009.md), [working expectations](WORKING_EXPECTATIONS.md)

For areas indexed but not independently re-audited in this planning pass (finance, fundraising, official-training availability, complete season architecture), inspect the checkpoint's feature record and current implementation at phase entry. This plan does not claim a fresh live verification of them.

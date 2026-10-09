# G3 remaining-work plan — corrected 10 October 2026

## Authority and boundaries
This replaces the earlier mixed list of completed software work and future phases. Read with CURRENT_CHECKPOINT_20261009.md. Production baseline: e8438e3 / Vercel 3eCUPFhMoP4682XKCTy98sN9dPTK. This is a reconciliation of recorded releases, not a new live audit of every service. Planning is not authorization to implement all proposals.

The completed software/log integration release is NOT a remaining development phase. Private repository access, exact-revision review, log modes/inspection/comparison, reviewed tasks/test handoff and compiled OFFSEASON_2026 drive/wait export are delivered. Robot-specific mechanisms and real-world validation remain separately listed below. Broader controller improvements are conditional enhancements, not retroactive release defects.

Likewise, do not rebuild Academy/certificates/shared trials, VR, CAD connection/refresh/inspection, Robot Build/BOM/manufacturing, inventory/fundraising/purchasing, attendance or Work navigation. Their acceptance limits are retained below.

## A. Remaining product development — remote-first order
These are bounded extensions toward the vision, not claims that existing modules are absent. Efforts are provisional engineering person-days including focused QA/documentation; not elapsed deadlines, token estimates or a programme total. Physical sessions and waiting for inputs are additional. Each estimate covers the stated first useful slice, not every conceivable capability in that domain.

### R1 — deeper practical learning: 5–9 days for one exercise
- Remaining: one authored interactive CAN connector/wiring or mechanical assembly exercise with selectable parts, close-up views, explainable errors and remediation. Existing six modules, quizzes, assignments and certification evidence are retained.
- Steps: choose actual hardware/example with a leader; source accurate reusable assets; define objective checks; build the exercise; connect it to existing assignment/evidence/review; verify English/Hebrew with students.
- Remote: content and implementation, student navigation/knowledge review.
- Physical: demonstrate real wiring/assembly before practical qualification.
- Benefit: students learn how to perform and diagnose work with less mentor intervention.
- Done: students complete the exercise and existing review loop; physical skill is signed off separately. Expand to additional exercises only after first-use evidence. No automatic arbitrary-CAD-to-lesson promise.

### R2 — reproducible simulator training: 6–10 days
- Remaining: complete scenario handoff (robot/settings, alliance, route revision, objective and assumptions), and a repeatable coaching comparison. Existing mission URLs do not carry a complete robot/route package; existing visual replay is not proof of deterministic input replay.
- Steps: reuse saved plans/profiles/trials; snapshot scenario inputs; restore them explicitly; compare like-for-like practice; connect coach feedback to existing tasks. Add deterministic input replay only if required for the chosen comparison.
- Remote: software and synthetic scenario validation.
- Devices: actual headset/controller/phone acceptance; no workshop needed for basic control checks.
- Benefit: the student and coach practice and review the same exercise.
- Done: shared scenario restores relevant inputs, comparable results retain their settings, and full-screen/VR controls remain accessible.

### R3 — CAD Mentor computed design checks: 10–18 days for one check family
- Status: requested long-term capability; current CAD/workflow review hold remains until the user resumes this scope.
- Remaining: deterministic clearance/component-envelope/service-access checking, selectable source-linked findings and revision recheck. Current inspection and bounded AI advice do not provide this.
- Steps: CAD leader selects one real subsystem and supplies tolerances/motion/service constraints; verify source coverage; implement a bounded geometric method; distinguish approximate checks from precise results and AI suggestions; highlight affected parts; reuse review/tasks; recheck changed revision.
- Remote: implementation and known positive/negative CAD cases.
- Physical: confirm real fit/access where necessary.
- Benefit: catch specific design problems before manufacture.
- Done: explainable repeatable findings against an exact revision, reviewed by the CAD leader. Native Onshape editor parity, arbitrary strength/thermal/electrical certification and whole-robot optimization are not included.
- Separate conditional scope: larger-model loading and native appearance/annotations fidelity. First identify actual unsupported models and desired inspection behavior; estimate after sample inspection rather than claiming universal CAD coverage.

### R4 — future-season transition: 8–14 days for a bounded transition
- Remaining: complete versioned field/tags/transforms/colliders/game-interaction readiness, reviewed activation, compatibility and rollback. Existing season selection/Check now remain.
- Steps: inspect current season coupling; package reusable assets/behavior; preserve historical plans/results; expose unsupported capabilities; test current season and a clearly synthetic different game; test rollback.
- Remote: almost all preparation and synthetic validation.
- Later inputs: published next-season rules/assets and actual game validation. Novel game mechanics may need additional code.
- Benefit: avoids a last-minute platform rebuild at kickoff.
- Done: old/new season records coexist, compatibility is explicit, activation/rollback works. Start before kickoff pressure even if earlier work is still awaiting inputs.

### R5 — measured simulator and vision accuracy: staged, data-dependent
- Remaining: calibrate one simulator subsystem and measure real localization/route errors. Existing geometric tag coverage and deterministic sensitivity cases are not measured accuracy or probability.
- Remote preparation: define configuration/calibration identity, units, timing and diagnostics. Approximate effort 5–8 days for a shared measurement slice; do not duplicate existing trial/log infrastructure.
- Physical inputs: repeated drive/intake or shooting observations; actual camera calibration/mount; synchronized detections/pose and reference observations; matching code identity and test conditions.
- Data integration: approximately 4–8 days for one simulator subsystem; 5–10 additional for the selected vision/route diagnostic slice. Re-estimate after inspecting data; shared work is counted once.
- Steps: agree thresholds before trials; collect data; fit/compare; validate held-out runs; link failures and retests through existing workflows.
- Benefit: identifies where simulator predictions and robot behavior differ and why autonomous runs fail.
- Done: quantified prediction/pose/dropout error and repeat-run outcomes for one configuration, not universal robot reliability.

### R6 — evidence-driven alliance planning: 6–10 days for one useful extension
- Conditional on credible own-robot baselines and partner observations.
- First inspect existing scouting/competition/partner-reservation functionality. Extend only the missing decision support: feasible roles, route conflicts, contingencies, confidence/freshness and concise driver briefing.
- Remote: implementation and coach tabletop/replay acceptance.
- Physical: real match validation later.
- Benefit: plans reflect observed capabilities rather than assumptions.
- Done: coach can explain the proposed role and fallback with traceable evidence. No duplicate scouting system.

## B. Robot-specific work awaiting team inputs — not a new software phase

### B1 — actual mechanism integration
- OFFSEASON_2026 remains the target. The software leader must supply implemented intake/shoot/feed/readiness/cancellation/fault contracts and approved hardware/setpoints.
- Remaining work after those inputs: extend the supported exporter/integration for those mechanisms, review RobotContainer/chooser wiring, compile/test against the selected SHA, and provide a reviewable package. Do not transplant old season hardware assumptions.
- Remote coding is possible after inputs; physical installation and operation require the robot.
- Effort is NOT reliably estimated until the commands exist and scope is agreed. The former blanket 8–15-day software-phase estimate is withdrawn because it mixed delivered work, optional controller upgrades and physical acceptance.

### B2 — deployment identity and real autonomous acceptance
- Team manually integrates/reviews/deploys candidate code. Record actual build SHA/dirty-state identity, configuration and matching WPILOG.
- Validate low-speed behavior, both alliances, stop/interruption and repeated outcomes against agreed tolerances.
- Existing supplied practice log is partial and is not verified OFFSEASON_2026 autonomous evidence. Checking that a SHA exists does not prove it was deployed.
- Plan 2–3 supervised sessions initially; results may require fixes. Remote mentor can review evidence, but physical robot access is still needed.
- Acceleration-limited follower/controller upgrades are conditional on chosen requirements and test evidence, not a declaration that completed export functionality was never delivered.

## C. Acceptance of already delivered features
These are real-use checks, not replacement development phases. Perform them as soon as people/devices are available, independently of the R1–R6 order.

| Item | Remaining evidence | Access / effort |
|---|---|---|
| Student/leader learning | Assign existing content without repeating completed courses; student completes evidence/review/remediation; leader verifies preferred-language flow | Remote student sessions; physical practical qualification separately; 1–2 sessions initially |
| Robot Build | Genuine released manufactured part and purchased item through work queue, QC/receiving, quantities, kit/install and retest | Workshop and responsible reviewer; 1–2 sessions plus 2–4 days preparation/triage, excluding unknown fixes |
| Maintenance/event handoff | Real fault → owner → repair → retest → readiness; actual configuration/packing handoff; verify supported offline limits | Workshop/event rehearsal; combine with Robot Build pilot |
| Software diagnosis | Evaluate a complete actual-code/log answer with bounded approved AI use; save a real outcome through existing trial flow | Remote with real evidence and appropriate provider consent; 1–2 sessions |
| Mobile and VR | Loaded-log phone workflow, Samsung auth/check-in, downloads/deep links, full-screen/controller/headset | Actual devices; most checks do not need workshop; 1–3 days focused matrix |
| Fundraising/operations | Observe one real event cycle through production, material use, sale/cost and existing finance process | Responsible operations users; establish gaps from actual usage before proposing more features |

## D. Release, quality and recovery work

| Work | What is left / benefit | Effort and constraints |
|---|---|---|
| Updated APK | Package current accepted website features; upgrade/install/login/files acceptance. Current signed 2.4.0/code27 predates later web changes | 1–2 days plus physical phone; preserve signing identity/version progression |
| AI evaluation | Maintained EN/HE code/CAD/log questions with citation, revision, missing-evidence and privacy checks; leader-scored answers | 3–5 days initial bounded set, ongoing maintenance; existing budgets/consent remain |
| Full-application recovery | Extend successful scoped Robot Build recovery to required application DB/storage/functions/auth/config dependencies; measure restore/access results | 3–6 days initial rehearsal, findings may add work; existing approved resources only, no new paid project |
| CI efficiency | Assess duplicate branch runs/path-scoped checks while preserving shared-change coverage and required gates | Optional 1–3 days improvement; do not silently weaken gates |
| Connector continuity | Verify ownership, credential expiry/revocation/reconnect runbooks | 1–2 days remote with owners; no permission expansion |
| Measured performance | Address demonstrated large-CAD/log/slow-device bottlenecks with coverage/cancellation/failure UX | Conditional 2–4 days for first observed bottleneck; not a claim of known current failure |

## E. Deferred / optional — not required to use the delivered system
- App-triggered GitHub builds: user chose read-only. Benefit is compile/test results inside G3; separate Actions permission required. Manual/local builds already remain possible. No automatic robot deploy.
- Native Onshape manufacturing exports: one revision-bound drawing/geometry export package, potentially 5–9 days after provider feasibility. Existing uploaded controlled files work. Not CAM/toolpaths/G-code.
- External CAM integration: wait for actual team toolchain, machine/post/setup and decision. Estimate only after discovery. No G3 machine control or presumed Onshape CAM adoption.
- Full simulator game expansion (tower, fouls, richer multi-robot interactions): current fuel rehearsal is limited. Select missing training objectives first; estimate separately, not inside R2.
- More authored CAD lessons, larger-model/native-annotation fidelity and additional geometry check families: extend proven slices based on team need; no unlimited scope hidden in initial estimates.
- Sponsor/award evidence and advanced finance close/reconciliation: no confirmed missing implementation established in this pass. Review existing flows with owners before adding scope.

## Recommended next actions
1. Begin R1 with one precise CAN/connector or mechanical exercise while using existing Academy assignments immediately. R2 is the next substantial remote software enhancement; neither requires rebuilding completed software integration.
2. Schedule device/APK acceptance and existing-learning feedback independently of workshop availability.
3. Ask the software leader for B1 contracts when ready; collect B2 evidence at the next robot session. No repository access expansion needed now.
4. Use one workshop visit for Robot Build pilot plus robot/camera measurements, so R5 receives reusable evidence.
5. Resume R3 only after the CAD review hold is lifted; schedule R4 before kickoff pressure. R6 follows credible own-robot baselines.

## Definition of completion and continuity
For each selected slice record owner, inputs, acceptance threshold, implementation/check evidence, production version, and physical acceptance separately. Release tested remote work without claiming physical completion. Fix demonstrated defects; do not turn every acceptance item into a new development programme. Small edits receive focused checks; preserve required CI and stronger checks for shared security/schema changes.

Reviewed for three failure modes: completed features incorrectly relisted as missing; team/hardware dependencies disguised as remote development; optional enhancements confused with required completion. This corrected plan removes the old software-phase estimate and numbering. No finite roadmap guarantees competition results or all possible future features.

## Evidence
- [Current checkpoint](CURRENT_CHECKPOINT_20261009.md)
- [Software workspace release](SOFTWARE_WORKSPACE_20261010.md)
- [Software/log implementation and remaining boundaries](SOFTWARE_LOG_IMPLEMENTATION_20261009.md)
- [Robot Build release](ROBOT_BUILD_RELEASE_20261009.md)
- [CAD fidelity audit/corrections](CAD_FIDELITY_AUDIT_20261008.md)
- [CAD refresh](CAD_REFRESH_20261008.md)
- [Simulator training release](SIMULATOR_TRAINING_RELEASE_20261002.md)
- [Learning/trials release](TEAM_LEARNING_TRIALS_RELEASE_20261002.md)
- [CAM hold](CAM_WORKFLOW_DECISION_20261009.md)
- [Verification discipline](WORKING_EXPECTATIONS.md)

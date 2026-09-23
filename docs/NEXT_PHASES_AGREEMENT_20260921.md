**Latest production release: shared timed practice and competition venue, source `7c7759a`, Vercel `FEZ7Svcb4FTfKrXxZzFH6eHE8GgQ` (Ready).** See [scope, validation and release record](SHARED_PRACTICE_VENUE_20260923.md). This extends the existing web/phone-web/VR simulator. Physical-device acceptance and the remaining match-fidelity phases are still open.

**Graphics update (2026-09-21):** The user subsequently authorized graphics A + B and default arrow-key movement. See [implementation and acceptance checkpoint](GRAPHICS_AB_20260921.md). Implemented locally, not deployed; this supersedes the earlier awaiting-start status below.

# Agreed next-phase scope — 21 September 2026

## Authority and authorization

This document captures the user's roadmap refinements after the connected knowledge release. Read START_NEXT_SESSION.md for production state and WORKING_EXPECTATIONS.md for execution expectations. This document supersedes older next-step ordering and descriptions that imply delivered knowledge, Gemini, review workflows or chat governance must be rebuilt. The master handover retains detailed legacy programme scope and V5.2 references.

The user authorized documentation and identified **Graphics A + B** as the next intended implementation. They will give the instruction to start separately. This documentation checkpoint does not authorize implementation or deployment. Other capabilities below are recorded future scope, not an instruction to execute all of them now.

## Existing foundation: preserve and extend

- Existing task ownership, dependencies, mentor selection/review requests and engineering controls are the foundation. Do not create a parallel task/review system.
- Knowledge collection, ingestion, deterministic search, Gemini integration, citations and chat budgets/permissions have already been implemented. Do not reimport the corpus or reconnect the provider as a new phase.
- Recorded production corpus: 1,716 sources, 48,797 distinct passages, 50,157 citation occurrences. These are not reviewed robot counts or exhaustive ten-year/top-500 coverage. Production reviewed robot catalogue remains empty at this checkpoint.
- Official manual retrieval currently covers 2026; one exact climbing-strategy production question passed. This is not comprehensive answer-quality acceptance or future-season support.
- Admin topic exemption and $25 monthly application budget remain. Other roles retain appropriate access/purpose controls. Background paid operations and external writes require additional scoped controls when introduced.
- Existing simulator driving, balls, intake, shooting, controls and model viewing remain. Visual quality, physics fidelity, historical knowledge and historical simulation are different capabilities.
- Current robot CAD access/version is not established. Public/sample models must be labeled; a kitbot must never be presented as the team's robot.

## Selected next work: graphics A + B

### A — Focused visual improvement (3–5 engineering days)

Improve existing lighting, materials, shadows and camera presentation using suitable existing assets. Add simple quality presets through the existing simulator UI. Preserve recognizable team design and readable field geometry; choose settings by visual inspection and performance measurement, not decorative effects alone.

Deliverables:
- Review the existing renderer, scene, asset licensing/availability, controls and deployed baseline before choosing changes.
- Improve lighting balance, material consistency and shadow usefulness; avoid obscuring game pieces or driver cues.
- Improve presentation/view controls without changing robot driving inputs or interfering with operational camera views.
- Provide Low/Medium/High presets as the shared foundation for B; do not build and discard a separate settings system.
- Reuse existing assets. Detailed new robot/venue models, new CAD conversion, camera-placement engineering and changed physics are excluded.

### B — Adaptive quality (3–5 additional engineering days)

Provide **Auto / Low / Medium / High** in a clear, accessible quality control, with saved preference. Auto chooses a conservative starting tier and adjusts visual effects using measured rendering performance. Hardware name alone is not evidence of performance.

Implementation/UX requirements:
- Show requested mode and effective quality clearly; allow manual override and persistence across reloads.
- Use bounded sampling and sustained thresholds/hysteresis to avoid oscillation. Exclude loading/background-tab anomalies where appropriate. Choose thresholds from baseline measurements, not invented universal FPS guarantees.
- Adapt rendering costs such as shadows, pixel resolution and supported detail/effects; do not change physics, game rules, input behavior or simulated outcomes by tier.
- Manual settings remain user-controlled. Handle unsupported renderer features and rendering failures with clear feedback/fallback.
- Account for resolution, browser acceleration, device load and thermal behavior; do not claim a GPU model guarantees a tier.
- Test English/Hebrew, RTL, keyboard/touch accessibility, fullscreen, settings persistence, resize and cold load.

### Graphics acceptance and release

- Compare baseline and changed scenes using repeatable views and the same scenario; record frame-time/performance observations and visible quality differences.
- Check driving, intake, shooting, scoring/reset, keyboard/touch/gamepad, telemetry and existing upload/view flows affected by rendering changes. Reuse relevant tests; avoid rerunning every unrelated historical suite.
- Verify quality switching does not reset a run or corrupt scene/controls. Verify automatic adjustment stabilizes and manual choice remains respected.
- Test available desktop and mobile surfaces; representative school/Mac/physical-device checks must be recorded as passed or pending. Do not substitute local desktop FPS for device acceptance.
- Preserve a rollback path, exact deployed revision and deployment evidence when deployment is subsequently authorized. Do not deploy the accumulated main branch wholesale.
- No private robot CAD is required to improve the existing scene. The user may later provide actual robot assets, approve appearance and make representative devices available.

A + B estimate: **6–10 engineering days**, not a token estimate. Earlier 10–19 days described a broader polished package including additional scene work and device tuning; do not add both estimates or silently expand A + B. New asset creation and unavailable-device testing can add work. No claim that the user's remaining weekly tokens will suffice.

## Phase 0 — Recovery and permissions

Finish portable/offsite database, Storage, auth, secrets/functions and application recovery; effective permission review and measured restore evidence. Existing local/QA recovery evidence should be reused. Local profile-bound backups are not portable recovery. Estimate 4–8 days plus environment access; mostly remote. Do not state an RPO/RTO guarantee before demonstrating it.

## Phase 1 — Acceptance of existing engineering controls

This is not a new approval workflow. Validate existing student submission, selected mentor review, owner/dependency handling, authorized approval, changed-requirement invalidation and test-to-configuration identity. Verify offline/reconnect behavior does not duplicate submissions or improperly unlock approvals. Fix demonstrated defects only. Estimate 4–8 days plus 1–2 workshop sessions; remote checks first. Existing users should recognize their current workflow.

## Phase 2 — Finish knowledge usability and decision support

### Search and truthful coverage (3–5 days)
Route normal topic searches to populated source information. Distinguish source material, reviewed robot configurations and approved team knowledge. Group duplicate passages, rank useful evidence, explain relevance, retain season/team/topic/source filters and provide actionable empty/error states. An empty reviewed catalogue must not hide collected evidence. Historical facts require team/season/configuration attribution and review; mentions alone are insufficient.

### Official season lifecycle (6–10 days)
Extend the existing Admin Check now workflow: select season, inspect configured official publishers, discover new/changed accessible documents, process/index them, show progress/failure/review states, preserve hashes/revisions and identify superseded material. Include manual, Team Updates and Q&A with authority rules. Keep conversational season context. Missing retrieval must never become a claim that the game is unreleased.

No five-minute polling. Manual and explicitly configured season-appropriate checks; do not create a schedule merely from this document. Future kickoff checks can retrieve supported accessible sources, not everything on the internet instantly. Do not describe existing link discovery/fingerprinting as completed text ingestion.

### Answer → team decision → test (4–7 days)
Extend existing task/issue/review/test records. Answers should distinguish official facts/citations, known robot constraints, missing measurements, alternatives, conditional recommendation and a proposed distinguishing test. Allow an authorized user to save/link the decision, assign existing work and record measured results. Example: compare climber options using official scoring and actual mass/packaging/cycle/reliability constraints; model-generated targets are proposals, not rules or measured capability. No GLB prerequisite.

### Acceptance (2–4 days)
Use a versioned practical English/Hebrew question set spanning rules, strategy, mechanisms, debugging, history, follow-ups and missing/conflicting evidence. Check citation support, permissions including Mentor classification, history, cancellation/errors/cost and desktop/mobile/RTL. One passing Admin question is not broad acceptance. No provider replacement without evidence of a benefit from comparable evaluation.

Combined broad bundle: 15–26 days remaining planning estimate, not a prerequisite to use the already delivered system. Select increments; do not rebuild collection or Gemini. Continued historical discovery/review: 10–20 days per bounded increment, then ongoing curation. Keep top-500 collection ambition; no measured storage reason presently established for reducing to 300. Corpus footprint is not whole-project capacity. No fixed estimate for exhaustive ten-year coverage.

## Phase 3 — Simulation fidelity and practical comparison

First useful increment: recorded physical replay, ghost/comparison and measured team-robot profile (10–20 days plus workshop sessions). Pin assets/runtime/configuration, initial state, inputs/events/queues; detect incompatibility and divergence. Do not promise cross-device bitwise determinism.

Broader match scope: complete timing/scoring, ball lifecycle/count conservation, feeds/out-of-play, supported configurations and multi-robot interaction (20–40 additional days, provisional). Validate real geometry, intake/shooter parameters, collisions and performance. Existing practice is not full competitive prediction. Graphics A + B changes rendering, not this physics scope.

Historical simulation is optional deferred work: operating robots under each past season's field, game pieces, rules, timing and mechanisms. A field viewer/season selector and historical documents do not implement it. Each season needs its own assets/behavior/testing. Current robot practice has priority; estimate historical seasons separately after selecting scope.

## Phase 4 — Engineering Twin, vision design and concept evaluation

### Camera placement and camera-count advisor

Desired user scenario: load robot CAD and ask where cameras should be placed; show the recommended locations directly on the model, with rationale and alternatives. Not currently implemented.

Workflow/inputs:
1. Load supported geometry; confirm scale, origin and front direction. GLB can support visibility geometry; native CAD/Onshape may supply richer assembly structure. Do not claim arbitrary native-format support without implementing conversion.
2. Specify moving mechanisms/poses, mountable areas, prohibited areas and practical access/protection constraints. CAD alone does not reliably supply these.
3. Select camera/lens/resolution and calibration when available, plus processing/budget constraints.
4. Select authoritative season field/tag layout and operating poses/headings/routes/objectives.
5. Evaluate candidate locations and orientations; display ranked alternatives and assumptions.

Outputs/acceptance:
- Mark the highest-ranked pair (or selected count) on the robot, coordinates and pitch/yaw, viewing cones, camera previews and field coverage maps.
- Account for robot/field occlusion, mechanism poses, tag distance/view angle/projected size, overlapping coverage and loss of a camera. Dynamic opponents/lighting must be modeled explicitly or identified as limitations.
- Optimize useful localization coverage in operating areas, not a promise to see the whole field at once.
- Compare one/two/additional localization cameras and dedicated game-piece/intake cameras. Recommend the least complex configuration meeting explicit targets, not a hard-coded 2+1 rule.
- Separate geometric visibility from detector performance and localization accuracy. Lighting, blur, exposure, latency, calibration and compute matter; physical validation is required.
- Say best among evaluated candidates under stated assumptions; no global-optimum or real-world guarantee.
- Build manual placement, cones and obstruction/coverage first, automatic placement/count optimization second. Use deterministic geometry/calculations; the LLM explains and helps specify the problem.
- No settled effort estimate for this feature yet; inspect geometry, motion data and desired optimization scope before estimating. Do not mistake the graphics estimate for camera analysis.

### Robot concept generation from strategy

Three explicit levels: (1) parameterized concept layout with approximate envelopes; (2) simulatable concept with explicit mass/motion/actuator/performance assumptions; (3) detailed manufacturable CAD with joints, fasteners, materials, tolerances, drawings/BOM and engineering review.

Start with levels 1–2 and reusable parameterized components. Compare strategic alternatives, expose weight/space assumptions and conflicts, and propose prototypes/measurements to resolve uncertainty. Attractive geometry is not evidence of strength or manufacturability. Broad robot generation follows narrower validated capabilities such as camera analysis.

Wider twin scope remains mechanical/electrical/software identities, load paths, mass/CG/inertia, interference/serviceability, measured motor/controller/PID models and WPILib integration. Initial validated subsystem estimate 20–40 days; whole-robot scope is multi-month and requires CAD/data/physical calibration. Never infer dynamics from appearance alone.

## G3 Software Mentor — cross-cutting knowledge/twin capability

Extend G3 Assist and existing engineering workflows, not a separate generic chatbot/task system. Connect to an exact authorized repository revision, robot configuration and measurements. Existing general FRC sources do not reveal how the team's actual code behaves.

Capabilities:
- Explain real command/subsystem flow using commit-pinned files/lines and relevant interlocks/termination conditions.
- Diagnose faults by aligning setpoints, measurements, voltage/current and events; rank hypotheses and propose distinguishing tests rather than unsupported PID adjustments.
- Review pull requests for concrete correctness risks and tests; retain human approval.
- Prepare bounded feature changes on isolated branches with build/test results and reviewable diffs.
- Analyze autonomous sequences, requirements, timeouts, paths and logs; reproduce only what the available simulation supports.
- Assist tuning by checking units, sensor scaling, gearing, limits/feedforward and measured runs; propose supervised experiments.
- Diagnose vision timestamps/transforms/calibration/tag layouts/rejection/estimator settings from actual evidence.
- Teach with repository-specific exercises and check student understanding.
- Produce release-readiness evidence: code/config changes, tests, unresolved issues, physical checks and rollback.
- Retrieve previous incidents/fixes with version/hardware applicability.

UX: purposes Understand code / Diagnose a problem / Review a change / Build a feature / Analyze a test. Modes Teach me (hints/explanation), Work with me (small explained steps), Prepare a solution for review (bounded patch/tests). Select project/revision, attach/select logs, state expected/observed behavior, receive facts/hypotheses/gaps, inspect a proposed test/diff, save into the existing task and request mentor review, then record measured outcome.

Read available repository/build/dependency and configuration data automatically; ask only for missing material facts. Initial log format must be explicitly selected. Evidence includes hardware/firmware, sensor units, gearing/limits, timestamps and test conditions. Do not require a giant upfront questionnaire.

Acceptance/security: honor repository/source ACLs; isolate untrusted code and build execution; no secrets in prompts/logs; bound reads/indexing/jobs and cache by version. Existing $25 chat cap does not authorize unlimited paid indexing/coding. Extend budgets/execution permissions before those jobs. Passing build/simulation is not physical acceptance. No autonomous motor actuation or robot deployment. Human review and supervised tests remain authoritative.

Provisional increments (not additive to overlapping twin work without re-estimation): repository-aware read/explain/review 8–15 days; one-format log diagnosis 10–20 additional; isolated verified coding assistance 10–20 additional; one subsystem/autonomous simulation/tuning integration 15–30 additional plus robot sessions. Inspect language, repository tests and logging first. Recommended first value: code understanding/review, then fault diagnosis. CAD access is not required; software repository access is.

## AI governance extensions

Do not rebuild delivered chat budgets/access or restore Admin topic restrictions. Fix current Mentor purpose-classification defects in assistant quality work. Future ingestion, embeddings, multi-service jobs and CAD writes need bounded reservations/caps, steps/retries, cancellation/recovery, scoped credentials, untrusted-input isolation and audit. Estimate 5–10 days for a selected bounded extension, before enabling that new capability. Old blanket wording placing all paid AI after Phase 3 is superseded by the already deployed protected assistant.

## Phase 5 — CAD / Onshape

GitHub CAD repository access means reading committed files; Onshape document/API authorization means reading assemblies/parts/configurations/versions directly. They are separate. Verify what files/formats/access actually exist.

Read-only/version-linked review first (8–15 days): exact document/element/version/microversion/configuration/linked versions; model navigation, selection, available metadata, version-bound question/finding, existing task/mentor review linkage and explicit response to newer model versions.

Without private CAD, demonstrate using a permitted public/sample assembly clearly labeled as such. Public read demo does not authorize private reads or writes. Do not require a GLB to begin knowledge/software work. Model appearance alone cannot establish strength, motor sizing or manufacturing readiness.

Controlled edits later (20–40+ additional days for bounded scope): isolated branches, constrained generation/patching, least privilege, concurrency/conflict protection, idempotency/recovery and human-approved merge/release. No silent production CAD writes.

## Phase 6 — Manufacturing

Core versioned BOM/drawings, material reservation, manufacturing queue, QC, acceptance/install/spare lineage, consumption/scrap/rework and skills/capacity dependencies: 15–30 days. Reviewed machine/tool-specific CAM integration: 20–40+ additional days for bounded scope, physical validation and human release; no autonomous machine start. Reuse existing inventory/workshop features.

## Phase 7 — Orchestration

Durable authorized workflows across mature systems: dependencies, queues, budgets, cancellation, checkpoints/idempotency, compensation/recovery, decision lineage and human gates for consequential actions. One bounded end-to-end workflow 15–30 days; broader scope 40–80+ additional. Do not automate an unproven underlying workflow simply to claim orchestration.

## Mobile and optional finance

Mobile: current Android build, Android/iOS distribution and actual device/network acceptance; departure-based automatic checkout remains a separately validated deferred feature. Estimate 10–20 days plus account/store waiting and physical access.

Finance already supports personal expenses, recipient debt, repayment allocations across expenses, pooled funds and history. Optional additions (5–15 days per agreed increment, not a total accounting-suite estimate):
- Compensating reversal: correct a mistaken repayment while preserving original/audit explanation.
- Bank reconciliation: identify mismatches between recorded transactions and statements.
- Restricted funds: track sponsor-restricted purposes separately from unrestricted funds.
- Receipt attachments: supporting evidence linked to records.
- Period close: reviewed periods with controlled subsequent adjustments.
These are not prerequisites for the delivered reimbursement flow and are not priority unless they solve a current team need.

## Priorities, estimates and durable working rules

User-selected next: graphics A + B, awaiting start instruction. Subsequent suggested sequence remains targeted knowledge quality/usability, measured robot improvement using existing reviews/tests, current-robot replay/calibration, read-only CAD review; Software Mentor and camera advisor are explicit valuable candidates for user selection. Historical simulation/advanced asset creation/finance are optional. Recovery/mobile acceptance can proceed alongside selected feature work when authorized.

All estimates are provisional focused engineering days with agent assistance, not elapsed-time promises or Codex token budgets. Physical access, mentor review, repositories and accounts can extend elapsed time. Do not sum overlapping workstreams or convert uncertain future programme scope into a guaranteed completion date.

Acceptance, UI/UX and regression prevention are mandatory. Distinguish implemented, tested, deployed and physically accepted. Reuse delivered features, existing test evidence and source data. Preserve exact version/provenance and uncertainty; never promise zero defects, unlimited scale, complete worldwide coverage or guaranteed competitive results. Measure team benefit through diagnosis time, reliability, cycle performance, learning and justified decisions.

Technical reference for the proposed vision work: https://docs.photonvision.org/en/v2026.3.3/docs/apriltag-pipelines/multitag.html (multiple visible tags can improve pose estimation; not evidence that our proposed advisor exists). Official document lifecycle reference: https://www.firstinspires.org/resources/library/frc/season-materials .

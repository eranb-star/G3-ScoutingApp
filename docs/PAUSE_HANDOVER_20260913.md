**Next-phase scope (2026-09-21):** [NEXT_PHASES_AGREEMENT_20260921.md](NEXT_PHASES_AGREEMENT_20260921.md) records the latest user refinements and supersedes older next-step ordering. Graphics A + B is selected next, awaiting a separate start instruction. Software Mentor, camera placement/count analysis and concept generation are detailed future scope. Delivered knowledge, review workflows and chat governance are not rebuild tasks.

**Current-state notice (2026-09-21):** Read [START_NEXT_SESSION.md](START_NEXT_SESSION.md) and [WORKING_EXPECTATIONS.md](WORKING_EXPECTATIONS.md) first. They supersede older deployment/disabled-state notes in this document; see the connected release record for actual production acceptance.

# Pause handover and complete remaining programme

Latest approved direction: deterministic historical robot/mechanism research is now implemented as a first local increment inside Evidence search. Read [robot research status](ROBOT_RESEARCH_20260920.md) for the 24-topic taxonomy, six real starter configurations, tests, deployment order and the still-open historical ingestion/advanced-filter programme. No production deployment. Continue this approved direction; earlier unselected-work wording is historical.

Checkpoint updated: 2026-09-20. This file is the current resumption authority. V5.2 section 82 defines releases; sections 81–105 correct earlier sections. Simulator 3A/3B/3C are additions within the Field & Concept Twin work, not replacements for Releases 4–7. Historical notes are evidence, not current instructions.

## What is saved and live

### Subsequent local knowledge increment — not deployed

The user selected Knowledge Intelligence and approved a clear, enterprise-quality admin Check now flow within the existing FRC knowledge/Evidence search. See `KNOWLEDGE_SOURCE_CHECKS_20260920.md` for implementation, checks, source constraints and outstanding acceptance; `KNOWLEDGE_EVOLUTION_PLAN_20260920.md` retains the wider knowledge scope. Five-minute polling is explicitly withdrawn. New local source checks discover official links and fingerprint PDFs; they do not constitute full-text indexing, a reviewed Gold Set or completion of Phase 2. Production remains the workshop release below; deployment has not been authorized. Earlier statements that no increment was selected are historical for this session's opening.

### Workshop operations increment — 20 September 2026

See [workshop, inventory, attendance and Team Stories release record](WORKSHOP_ATTENDANCE_MEDIA_20260920.md). Approved changes: scheduled early opening; session opener/closer audit and supervised close/extension; shared inventory permission enforcement; person/meeting attendance views and protected measured timestamps; editable paginated compact Team Stories. **Keep Sunday and Wednesday 16:00–19:00**, explicitly reconfirmed by the user after live inspection. Departure-based automatic checkout is deferred until official iOS/Android work; current checkout/location behaviour and installed APK remain unchanged. This is an operations increment, not completion of remaining platform phases. Refer to the linked release record for final deployment evidence and physical workshop acceptance still outstanding.

- Branch: `codex/release-1-qa`. Application commit **1326629** (workshop, inventory, attendance reports and Team Stories), building on **e9f59ba** (controller), **fe200ef** (finance), **b0fc377**, browser attendance **b00a306**, simulator **8012578** and telemetry **48af302**. Pushed to remote. Installed APK unchanged; production database and attendance/scheduled-operations Edge functions updated for this increment. Existing location/checkout behavior preserved. Physical phone/workshop acceptance remains pending.
- Production: https://g3-6740.com ; Vercel production rebuild **CK1LewiyZedM7qYaMcHkTjxGbTXQ**, Ready on 20 September 2026. Recorded verification: HTTP 200, bundle `index-Cc1SdWd-.js`, media `TeamMediaPage-CS65agOY.js`, production Supabase `hnqwhuuxlqfyawqymaaz`, no QA reference, new session/report/media features present. Database opening cron active with successful run. No production redeployment is needed for this documentation change.
- Latest correction is live: reference robot has red 6740 bumpers; negative-X hub counts RED, positive-X hub BLUE. Browser verification: eight shots at red hub → Red 8 / Blue 0. Uploaded user CAD appearance is preserved.
- Simulator 3A implemented: gravity/suspension, acceleration/braking, bump tilt, hub/boundary/tower blocking, trench clearance and depot rail rise.
- Simulator 3B implemented: individual moving balls, scattering, configured intake zone/rate/capacity, capture removes the same ball from the field; no duplicate static CAD balls.
- Simulator 3C implemented: configurable shooting, misses bounce/roll, goals enter a return queue and the same ball returns toward neutral field, visible red/blue goal counts. Starting inventory is 504 for this single-robot setup: 400 neutral, 48 depot, 48 outpost reserve, 8 robot preload. Initial sleeping layout is stable; contact wakes balls. Reset restores shooting preset and repeatable initial conditions.
- Fullscreen retains drive arrows, Start/Reset, intake/shooting, score, camera and rendering information; configuration panels stay outside the viewport.
- Knowledge: 48 curated references, including 19 for 2026; year directory covers 2017–2026. This is not exhaustive knowledge or an accepted Gold Set.
- Viewer: detailed fields 2021–2026, optimized/hash-pinned models; 2026 KitBot is reused across seasons. Historical fields are view-only. Local GLB import (40 MiB), dimensions/scale/orientation and browser persistence exist. Model cache is bounded at 80 MiB with LRU/quota handling.
- Roles & permissions can hide Evidence Search and Field & Robot Twin from teams; navigation/routes and evidence RLS enforce grants. Default is admin-only.
- Engineering controls and permanent administrator task deletion are implemented/deployed. See the Phase 0/1 evidence record; do not restore the superseded archive-only behavior.
- Latest packaged Android remains 2.1.9/code 23 and predates recent web changes. No new APK was produced for the simulator.

## Operations increment — 16 September 2026

Admin part deletion, pooled team-fund repayment tracking/history and task collaborators are implemented and deployed. See [scope, SQL, checks and remaining user acceptance](OPERATIONS_UPDATE_20260916.md). Owner accountability and mentor-review permissions remain unchanged; collaborators get source-linked Home/Work reminders. Funding source is descriptive; this is pooled ILS accounting, not separate restricted fund accounts. No real repayments/deletions were performed as tests. Keep the wider remaining programme below; these operational fixes do not close its phases.

## Finance correction — 19 September 2026

Recipient-first finance redesign is deployed to production from **fe200ef**. See [implementation, safeguards, checks and limits](FINANCE_REDESIGN_20260919.md). One repayment can cover multiple personal expenses; recipient total debt, selected expense allocations and pooled team funds are distinct. Verified example: 3,769 minus 1,150 leaves 2,619 owed, and funds 1,300 become 150. Existing history is preserved. The repayment footer remains visible on phones; badges do not wrap.

Production SQL migration succeeded; production web rebuild **3tAfGCv8ZL1juCEUwNo5qD1NKfJt** is Ready and aliased to g3-6740.com. Public bundle check: HTTP 200, **index-JQQXD4GR.js**, production Supabase reference present, QA reference absent, recipient repayment/history/tabs present. Admin finance route redirects unauthenticated access to login. Browser UI checks used synthetic fixtures; no actual financial payment was recorded. User acceptance of the next genuine repayment remains pending.

Additional future finance scope recorded by this review: compensating reversals with audit history, bank reconciliation, restricted fund accounts, receipt attachments and accounting close. These are not implemented or required to use the corrected operational repayment flow. Keep these alongside all remaining programme items below; do not silently consider the system a full accounting suite.

## Controller driving correction — 19 September 2026

Production deployment **6KJEFAzG9mQrXT4piPXWJQQHME7M** verified live on 20 September: HTTP 200, main bundle `index-Bp0nxVt1.js`, twin bundle `FieldTwinPage-DRbsIXiE.js`; production database reference present, QA reference absent, controller profiles/calibration/neutral-start present and synthetic fixture absent. Finance increment remains included.

Controller mapping root cause fixed in **e9f59ba**: driver forward/strafe/clockwise intent is converted to physics field coordinates at the robot’s current heading. Default is robot-relative; field-relative is explicitly labelled. Keyboard/touch field-axis bindings remain unchanged. See [controller behaviour, configuration and test evidence](CONTROLLER_DRIVING_20260919.md).

Added saved per-controller profiles, live intent/raw input display, axis reversals, dead zone/curve/power limits, released-stick calibration, button assignments (A intake, hold RT shoot, B disable by default), neutral-start interlock and selected-controller disconnect protection. Non-standard mappings require direction verification; two-axis joysticks can disable strafe. Configuration locks while driving/recording; no automatic restart after reconnect. No database or APK changes.

**Remaining hardware acceptance:** team tests its actual Xbox/joystick/browser at the workshop: forward after turning, strafe and rotation signs, held trigger/release, stop, disconnect/reconnect and saved profile reload. Real physics and synthetic browser controller tests passed; physical controller acceptance is not claimed. This acceptance is added to the existing CAD/device and simulator remaining tasks; no wider phase is closed.

## Exact resumption point

Latest attendance clarification (2026-09-15): production check-in/out is visible on **all browsers, including laptops**, not phone-only. User confirmed seeing it in laptop Chrome and requested documentation only for now. Phone-only visibility is deferred for review; no UI restriction was added. Preserve the 100m server geofence and existing APK flow. Actual Android Chrome/iPhone Safari/APK workshop acceptance remains pending. See [attendance scope, verification and deferred work](MOBILE_BROWSER_ATTENDANCE_20260915.md), including the existing native Wi-Fi trust security follow-up. This clarification adds to, and does not replace or close, the remaining programme below.

The workshop operations increment is deployed; see the release identity above. The subsequent menu-only rename from Attendance history to Attendance Center (Hebrew: מרכז נוכחות) is saved in source but is not yet in the recorded production deployment. Include it in the next web release; no database/API changes are required. The latest request is a handover/roadmap checkpoint, not a request to start every remaining phase now. Start a fresh session with `docs/START_NEXT_SESSION.md`, then inspect git status once. Preserve the two personal Android `.idea` changes. Do not rebuild/redeploy unchanged application code or rerun passing test suites just to establish activity.

Latest user clarification: **first confirm understanding and discuss next-step options; do not begin development automatically.** The user is away from the workshop and wants to choose work that makes sense without physical testing. Follow `START_NEXT_SESSION.md`: summarize deployed/committed/outstanding/deferred state, identify uncertainty, classify options by remote validation versus later physical acceptance versus workshop dependency, and give estimated effort/dependencies. Wait for the user's choice before implementation or deployment. Physical record/replay and ghost/comparison remain a candidate remote increment, not the selected next task. The earlier planar replay does not prove physical-engine replay. Keep all Phase 2/3 and other remaining scope below; AI governance still follows Release 3 before new paid execution.

## Complete remaining work register

Checked implementation and formal acceptance are separate. The rows below include inherited unfinished acceptance, approved historical expansion, the simulator discussion, and the full later V5.2 programme. No entire release is declared accepted merely because its UI is live.

### 0 — Baseline/recovery closure (priority: before claiming operational acceptance)

1. Reconcile the deployed Edge source drift and capture a final combined web/DB/RLS/RPC/functions/storage/cron/config/Android identity. Preserve legacy endpoints until their disposition is explicit; do not silently replace deployed behavior.
2. Close the effective-permission audit of legacy surfaces and side-effect classifications. Synthetic QA is `cyooubycafubbnkjcqlw`; recovery clone `ooqwgylckjvfpkshhexm` contains real data and is not routine QA. Keep its outbound scheduler disabled.
3. Complete end-to-end disaster recovery: auth, functions/configuration/secrets references, nonempty cloud objects and access, portable encryption-key recovery/offsite coverage, measured RPO/RTO and retention/export/privacy policy. Proposed 24-hour RPO / 4-hour RTO are not a measured guarantee.
4. Existing encrypted backup is scheduled daily at 21:00 local plus sign-in, under the current Windows user and requiring connectivity. The genuinely empty production Storage snapshot was verified; do not repeat the old “zero files” investigation. Local DPAPI-bound recovery is not offsite recovery.

### 1 — Engineering Control Loop closure (priority: retained acceptance)

1. Finish authenticated role/transition UI acceptance for the expanded review matrix, stale revisions, independent reviewers, waiver expiry, rejection/reopen, downstream propagation and permanent admin deletion; reuse completed SQL checks.
2. Complete representative school/mobile/offline/reconnect acceptance. Queued approval cannot unlock work before server confirmation. Confirm notification seen/acknowledged/snoozed/resolved/reopened semantics and Home/Work/Projects consistency.
3. Complete physical Android install/push and role/RTL/accessibility journeys. Build one current signed APK when requested, then test on a real device; the old APK is not evidence for new web behavior.
4. Close evidence for the 100% release-critical requirement gate (current passing evidence or explicit applicable unexpired waiver, shown separately), owner acceptance and operational disable/recovery. Preserve exact design/as-built/as-installed identities, test configuration and derived-artifact lineage.

Implemented foundations include requirements/interfaces/decisions, versioned evidence, structured measurements, review policies, exceptions, change impact, immutable configuration and administrator pause. Remaining acceptance is documented in `PHASE_0_1_STATUS_20260913.md`; it must not be silently marked passed.

### 2 — Knowledge Intelligence closure and ten-year expansion

1. Define an explicit 2026 Gold Set with named reviewer, coverage requirements, conflict threshold and insufficient-evidence criteria; validate official Manual, applicable Team Updates, Q&A and dimensions with exact source/version/locator/authority.
2. Implement or complete source adapters, ingestion/version refresh, canonical claims/entities and deduplication; integrate articles/saved answers as synthesis, not authoritative facts. Prove access inheritance and authority/freshness/verification/uncertainty separately.
3. Complete rule/game/strategy/historical evaluation cases, including conflicting/stale/missing evidence, selection/publication bias and confounders. A directory of links is not a verified deep corpus.
4. Approved expansion: progressively ingest and review **each season 2017–2026**, with per-season coverage/quality manifests. Full ten-year depth is additional scope, not required by the bounded V5.2 Release 2 gate.
5. AI spending/security requirements in sections 96–97 remain deferred by the user until after Release 3. Therefore do not call the full associated governance complete or enable new paid AI first.

### 3 — Field & Concept Twin and physical simulator closure

Delivered 2026-09-14: live geometry from the actual simulated shooter exit, 60 Hz CSV/JSON telemetry export, configurable keyboard bindings, full-width settings, driving-first/opt-in Software testing view and animated reference front intake. These additions close telemetry capture/UI work only. The following remaining work is combined with the original programme:

- Geometry extensions: calibrated shot trajectory and target-plane error; per-obstacle clearance and rule-versioned zones. Current wall clearance and hub aim line are not a full navigation/ballistic model.
- Recording completeness: full physical initial-state/ball/return-queue capture, external events and pinned asset/runtime identity needed for replay; telemetry samples alone cannot restore a physics session. Persistent recording library/session recovery and analysis are later extensions, not current browser-memory export.
- Intake illustration is not a CAD-derived articulated mechanism: future calibration must bind real pivot/roller geometry, deployment timing and capture behavior. Current capture follows ON/OFF immediately while the brief visual folding animation runs.
- Validate performance and layout on the actual school/work Mac and mobile devices. Chrome on the owner's Mac required graphics acceleration enabled; a clear renderer failure/fallback remains a UX improvement. Local 60 FPS is not a device guarantee.


1. Physical-engine record/replay: capture runtime/model/assets/configuration, initial state, ordered commands, seed, all lifecycle queues and checkpoints; define exact/numeric tolerances, reject version mismatch and display divergent tick/state. Prove pinned-runtime replay; do not claim cross-device determinism.
2. Restore/integrate Auto Play, ghost and comparison for the physical engine. Label same-input, same-objective and same-driver comparisons separately. Earlier planar functionality is not proof of the current physical integration.
3. Close representative school laptop/mobile/network performance, real controller/touch/keyboard, input release/blur, download/cache/storage-pressure/offline and actual team GLB persistence/scale acceptance. Record measured results and limitations; local FPS is not school-device acceptance.
4. Calibrate field and reference physics against measured geometry/behavior: hub receiver and outlet trajectories, bump/depot/trench/tower envelopes, initial ball placement, friction/restitution, robot contact and suspension. Current approximations are practice-level, not validated robot engineering.
5. Validate all ball lifecycle paths together: capture/push, full intake, firing, miss, goal return, outpost feed, out-of-play and reset conserve IDs/counts. Current focused regression checks pass; add only new cases needed by changed behavior.
6. For a complete real-game simulator beyond the current practice mode: add rule-versioned match timing, hub activation/shifts and scoring semantics; six-robot/preload setup, any supported championship setup, multiple robots/opponents and collision interaction. Practice goal counts currently have both hubs active and are not official match scoring.
7. Team-specific mechanism profile: measured capacity, intake geometry/throughput, shooter speed/elevation/height/rate and calibration dataset. CAD appearance alone cannot infer capacity, capture or firing accurately. Internal hopper/jam/ball-mass effects and mechanism animation remain extensions.
8. Historical expansion: obtain licensed optimized 2017–2020 fields; provide season-appropriate robot assets where available. Historical driving requires each season’s collision geometry, pieces/mechanisms and rules, not simply a selector. Current 2021–2026 viewers remain explicitly view-only.

### AI governance checkpoint — after Release 3, before new paid/provider execution

1. Unified gateway with estimates and transactional maximum-cost reservations; caps by request/job/user/feature/day/month across models, embeddings, storage/egress, conversion and workers. Settle/release reservations on completion/failure/cancel.
2. Bounded steps/time/retries, cancellation/checkpoints, budget-increase authorization, telemetry and administrator stop controls.
3. Prompt-injection and untrusted-file isolation; scoped credentials outside model context; source ACL inheritance; permission recheck at execution and before consequential operations; audit and adversarial tests.

### 4 — Engineering Twin (new product work, not supplied by GLB import)

1. Agree the FDR completeness set, domain owners and measurable calibration/error thresholds.
2. Build component/material/mechanical graph: joints, connections/fasteners/load paths, mass/CG/inertia, structural/thickness analysis, tolerances, assembly/serviceability and interference.
3. Add electrical/power/CAN/network, wiring, vision/cameras, pneumatics and exact software/firmware/vendor/configuration identities linked to requirements and tests.
4. Couple mechanism/motor models to measured intake/shooter/drivetrain behavior. PID testing requires the controller and plant/motor model plus calibration, not just entering a PID number. Add isolated WPILib simulation/HIL bridge only with explicit hardware safety separation.
5. Validate against physical measurements, publish dataset size/error/valid ranges/out-of-range behavior, link analysis artifacts and confidence to exact configurations. Never automatically treat simulated evidence as real test evidence.
6. Add bounded multi-robot/3v3 strategy and Monte Carlo analysis with seeds and confidence after underlying models are validated; distinguish it from official match outcome prediction.

### 5 — CAD Intelligence

1. Onshape feasibility: exact document/element/version/microversion/configuration and linked-version reads; semantic-to-topology identity and least-privilege scopes.
2. CAD review against engineering graph/rules; immutable findings and human review; native CAD conversion pipeline as needed. Existing GLB upload is visualization only.
3. Bounded natural-language/parametric generation and CAD patches in authorized sandbox/branches. Detect concurrent edits, recheck permission, enforce idempotency and recover partial operations.
4. Validate human-approved merge/release workflow and provenance. No silent production CAD writes.

### 6 — Manufacturing Intelligence

1. Version-bound BOM/drawings/release package, material availability and atomic reservations preventing double allocation.
2. Manufacturing state flow: released design → material/CAM ready → queue → manufacture → QC → accepted → installed/spare, with consumption, scrap/rework and physical serial/configuration lineage.
3. Manufacturing grammar/capability, tooling/machine constraints and reviewed CAM/G-code candidates; human machine release and no automatic machine start.
4. Capacity/skills/succession and training dependencies reuse existing team records. Validate QC, calibration and installation evidence plus change impact before release.

### 7 — Autonomous Orchestrator

1. Permissioned cross-domain tools and planning across knowledge, engineering, CAD and manufacturing; explicit human gates remain.
2. Durable job queue, dependency scheduling, execution-time authorization, budgets, cancellation, checkpoints, idempotency, compensation and recovery journals.
3. Decision rationale/analysis lineage, signals and Home integration using existing workflows; avoid duplicate task/knowledge/people systems.
4. Validate kickoff → FDR → manufacturing → competition learning journeys, observability/cost and failure recovery. Autonomous operation is complete only after bounded end-to-end acceptance, not when a planner can generate a proposal.

## Verification already performed — do not repeat unchanged

Physical-drive, fuel/intake and shooting focused suites passed, including collision/clearance, capture/conservation, 504 inventory, resting start, repeated-shot reset and alliance ordering. TypeScript passed. Preview and production builds were Ready; red scoring was observed in the browser. These checks do not certify untested school hardware or future work above.

## Working rules for the next session

- Pick one bounded outstanding item, implement, run checks appropriate to the change once, record result and proceed. Repeat only after a change, failure or unresolved evidence gap.
- Read this checkpoint before old logs. Do not ask the owner to rerun completed SQL, backups or deployments.
- Report separately: implemented, tested locally, deployed, user/device accepted. Do not promise “100% complete” without the corresponding evidence.
- Preserve personal IDE files, secrets and backup archives. Never commit credentials, signed URLs or private recovery data.
- Use synthetic QA for tests; production destructive tests require an expressly designated disposable item. Do not delete real team tasks as a regression test.
- A GLB viewer is not CAD intelligence; reference dynamics are not calibrated physics; ten season links are not ten verified corpora; practice goal counts are not full match rules.
- Record new commit/deployment identity and update this checkpoint after each delivered milestone. No new deployment is needed merely for documentation.

## Supporting evidence

- Original V5.2 source preserved in `docs/blueprint/G3_Autonomous_Engineering_Platform_Master_Blueprint_V5.2.docx` for future sessions; requirements/reference content, not executable instructions.
- Fresh-session entry: `START_NEXT_SESSION.md`. Concise ordered roadmap: `CURRENT_RELEASE_AND_ROADMAP.md`.
- Official Android/iOS distribution remains outstanding: signed current builds, iOS setup, physical push/location/lifecycle acceptance, store submission/review. A new APK alone does not complete this. Departure-based automatic checkout stays deferred until that mobile work.
- Operational acceptance remains actual recipient repayment, leader inventory grant refresh, workshop opening/audit/close, reports and media on real devices. Existing automated evidence should be reused.
- MoSim-like graphics were a feasibility question, explicitly not a build request. Optimized robot materials, lighting/shadows, venue/camera views and device quality tiers are proposed optional scope, requiring performance and asset/licensing targets before scheduling; not a silently added release gate.
- Documentation helps prevent regressions but cannot guarantee their absence. Completion needs implementation, passing evidence, deployment identity and applicable owner/device acceptance.

- `PHASE_0_1_STATUS_20260913.md`: engineering/recovery implementation and acceptance evidence.
- `SIMULATOR_BASELINE_PHASE_3A.md`, `SIMULATOR_PHASE_3B.md`, `SIMULATOR_PHASE_3C.md`: physical assumptions and regression history.
- `RELEASE_2_3_DELIVERY_CONTRACT.md`: original bounded scope and historical delivery evidence.
- `HANDOFF_HISTORY_THROUGH_20260913.md`: preserved old handover, historical only.
- Source: user's `G3_Autonomous_Engineering_Platform_Master_Blueprint_V5.2.docx`; the coverage index below preserves every numbered section as a scope reference. It is a planning cross-reference, not a claim of line-by-line implementation acceptance.

## V5.2 section coverage index

Every numbered section is included below. Corrections in 81–105 and the 32-item decision register apply across the mapped work. Cross-cutting contracts apply to every release, not only their first milestone.

| Section | Blueprint heading | Remaining-work home |
|---|---|---|
| 01 | North Star | Cross-cutting 0–7 / release acceptance |
| 02 | Current G3 Platform — Reuse Contract | Cross-cutting 0–7 / release acceptance |
| 03 | Fresh Code Audit — What I Rechecked | Cross-cutting 0–7 / release acceptance |
| 04 | Critical Gaps Before Building Intelligence | Cross-cutting 0–7 / release acceptance |
| 05 | Phase 0 — Mandatory Repository & Production Baseline Audit | 0 |
| 06 | Non-Regression: Hard Rule | Cross-cutting 0–7 / release acceptance |
| 07 | Golden Existing Workflows | Cross-cutting 0–7 / release acceptance |
| 08 | Knowledge Scope — 2017–2026 Deep Corpus, All-Seasons-Compatible Schema | 2 + historical expansion |
| 09 | Source Adapter Contract | 2 + historical expansion |
| 10 | Season Ingestion Pipeline | 2 + historical expansion |
| 11 | Knowledge / Evidence Data Model | 2 + historical expansion |
| 12 | Rule Versioning & Authority | 2 + historical expansion |
| 13 | Game Intelligence | 2 + historical expansion |
| 14 | Strategy Engine | 2 + historical expansion |
| 15 | Historical Analogy | 2 + historical expansion |
| 16 | Requirements & Verification Graph — P0 | 1 |
| 17 | Robot Configuration Management — P0 | 1 |
| 18 | Official Field Digital Twin | 3; calibration continues in 4 |
| 19 | 3D Browser Runtime | 3; calibration continues in 4 |
| 20 | 3D Asset Pipeline & Delivery | 3; calibration continues in 4 |
| 21 | Field as Engineering Canvas | 3; calibration continues in 4 |
| 22 | Parametric Robot Concept | 3; calibration continues in 4 |
| 23 | Natural Language Design Operations | 3; calibration continues in 4 |
| 24 | Unified Robot Command Bus | 3; calibration continues in 4 |
| 25 | No-Controller Manual Operation | 3; calibration continues in 4 |
| 26 | Xbox / Gamepad | 3; calibration continues in 4 |
| 27 | Autonomous Robot Operation | 3; calibration continues in 4 |
| 28 | Record / Replay / Ghost / AI Assist | 3; calibration continues in 4 |
| 29 | WPILib Simulation Bridge | 4; capacity continues in 6 |
| 30 | Robot Engineering Graph | 4; capacity continues in 6 |
| 31 | Component Digital Library | 4; capacity continues in 6 |
| 32 | Mechanical Design Grammar | 4; capacity continues in 6 |
| 33 | Connections / Fasteners / Load Paths | 4; capacity continues in 6 |
| 34 | Structural Intelligence | 4; capacity continues in 6 |
| 35 | Materials / Thickness Optimization | 4; capacity continues in 6 |
| 36 | Mass / CG / Inertia | 4; capacity continues in 6 |
| 37 | Electrical / Power / CAN / Network | 4; capacity continues in 6 |
| 38 | Wiring Routing | 4; capacity continues in 6 |
| 39 | Vision / Cameras | 4; capacity continues in 6 |
| 40 | Assembly, Serviceability, Tolerance | 4; capacity continues in 6 |
| 41 | Onshape Integration Levels | 5 |
| 42 | Generative CAD Pipeline | 5 |
| 43 | Automated CAD Review | 5 |
| 44 | CAD Patch Engine | 5 |
| 45 | BOM / Drawings / Release Package | 6 |
| 46 | Manufacturing Execution Model | 6 |
| 47 | Manufacturing Grammar | 6 |
| 48 | CAM / G-code Safety | 6 |
| 49 | Simulation Determinism & Calibration | 3; calibration continues in 4 |
| 50 | Kinematics / Game Piece Physics / Path | 3; calibration continues in 4 |
| 51 | 3v3 Match Simulation / Monte Carlo | 4 / 7 |
| 52 | AI Gateway | AI governance / 7 |
| 53 | AI Tools | AI governance / 7 |
| 54 | Autonomous Engineering Orchestrator | 4 / 7 |
| 55 | AI Permissions | AI governance / 7 |
| 56 | Analysis Artifacts | Cross-cutting 0–7 / release acceptance |
| 57 | Signals / Command Intelligence | 4 / 7 |
| 58 | Home Command Center Integration | Cross-cutting 0–7 / release acceptance |
| 59 | Security / RLS | Cross-cutting 0–7 / release acceptance |
| 60 | Compatibility Contract for Every New Feature | Cross-cutting 0–7 / release acceptance |
| 61 | Migration Strategy | Cross-cutting 0–7 / release acceptance |
| 62 | Infrastructure | Cross-cutting 0–7 / release acceptance |
| 63 | Job Queue | Cross-cutting 0–7 / release acceptance |
| 64 | Offline / Degraded | Cross-cutting 0–7 / release acceptance |
| 65 | Observability & Cost | Cross-cutting 0–7 / release acceptance |
| 66 | Testing Strategy | Cross-cutting 0–7 / release acceptance |
| 67 | Definition of Done per Phase | Cross-cutting 0–7 / release acceptance |
| 68 | Implementation Roadmap | Cross-cutting 0–7 / release acceptance |
| 69 | Developer / Codex Contract | Cross-cutting 0–7 / release acceptance |
| 70 | Development Start Checklist | Cross-cutting 0–7 / release acceptance |
| 71 | Kickoff End-to-End Experience | Cross-cutting 0–7 / release acceptance |
| 72 | FDR End-to-End | Cross-cutting 0–7 / release acceptance |
| 73 | Manufacturing End-to-End | Cross-cutting 0–7 / release acceptance |
| 74 | Competition Learning Loop | 4 / 7 |
| 75 | Limits — Never Overclaim | Cross-cutting 0–7 / release acceptance |
| 76 | Top Project Risks | Cross-cutting 0–7 / release acceptance |
| 77 | Acceptance: V5.2 Is Ready to Start Development When | Cross-cutting 0–7 / release acceptance |
| 78 | References Re-checked for V5 | Cross-cutting 0–7 / release acceptance |
| 79 | Final Architecture | Cross-cutting 0–7 / release acceptance |
| 80 | V5.2 Revision Charter | Cross-cutting 0–7 / release acceptance |
| 81 | Authoritative Rule & Dimension Hierarchy — Correction | 2 + historical expansion |
| 82 | Release Model — Bounded Products, Not One 19-Phase Programme | Cross-cutting 0–7 / release acceptance |
| 83 | Complete Production Baseline Identity | 0 |
| 84 | Safe Test Environments & Side-Effect Classification | 0 |
| 85 | Rollback Semantics After Real Use | 1 |
| 86 | Design Configuration vs Physical Robot Identity | 1 |
| 87 | Engineering Change & Validity Engine | 1 |
| 88 | Approval Taxonomy & Transition Matrix | 1 |
| 89 | Immutable Evidence Packages | 1 |
| 90 | Requirements Model — Completion | 1 |
| 91 | Structured Physical Test Evidence | 1 |
| 92 | Cross-Discipline Interface Agreements | 1 |
| 93 | BOM, Reservations, Consumption, Scrap & Rework | 6 |
| 94 | Additional Engineering Disciplines | 4; capacity continues in 6 |
| 95 | Knowledge Integration, Acceptance & Bias Controls | 2 + historical expansion |
| 96 | AI Spending & Autonomous-Job Governance | AI governance / 7 |
| 97 | AI Security, Prompt Injection & Execution-Time Authorization | AI governance / 7 |
| 98 | Collaboration, Onshape Identity & External-Write Conflicts | 5 |
| 99 | Simulation Contract, A/B Semantics & Confidence | 3; calibration continues in 4 |
| 100 | User Journeys, Notifications, Offline, Ownership & Recovery | Cross-cutting 0–7 / release acceptance |
| 101 | Decision Provenance & Artifact Lineage — Additional Gaps | 1 |
| 102 | V5.2 Decision Register — 32 Findings Tracked | Cross-cutting 0–7 / release acceptance |
| 103 | Revised Release 1 — Engineering Control Loop | 1 |
| 104 | V5.2 Final Corrections & Baseline 0 Commitments | Cross-cutting 0–7 / release acceptance |
| 105 | Updated End-to-End Architecture | Cross-cutting 0–7 / release acceptance |

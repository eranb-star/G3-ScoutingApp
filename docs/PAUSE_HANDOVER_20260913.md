# Pause handover and complete remaining programme

Checkpoint: 2026-09-13. This file is the current resumption authority. V5.2 section 82 defines releases; sections 81–105 correct earlier sections. Simulator 3A/3B/3C are additions within the Field & Concept Twin work, not replacements for Releases 4–7. Historical notes are evidence, not current instructions.

## What is saved and live

- Branch: `codex/release-1-qa`. Application commit **17a542f**, documentation commit **98c92bd**, both already matched the remote before this handover commit.
- Production: https://g3-6740.com/field-twin ; Vercel production rebuild **D339AMxE7**, Ready. Recorded verification: HTTP 200, bundle `index-Cbu_3RvN.js`, production Supabase `hnqwhuuxlqfyawqymaaz`, no QA reference, engine `g3-physical-v3`. No production redeployment is needed for this documentation change.
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

## Exact resumption point

The user is pausing. Do not start work, monitoring, paid jobs or deployment during the pause. On return, read this file and inspect git status once. Preserve the two personal Android `.idea` changes. Do not rebuild/redeploy the unchanged application or rerun passing test suites just to establish activity.

Recommended first bounded engineering increment: **restore recording/replay and comparison for the physical simulator**, with a new versioned tolerance profile covering ball inventory, intake, shooting, return queues and reset. The earlier planar replay does not prove physical-engine replay. Then close the remaining Release 2 Gold Set and Release 3 acceptance items below. School CAD/device checks remain scheduled for when the user has those resources; continue independent work without repeatedly asking for them. AI governance follows Release 3 as requested, before enabling new paid processing. This is an ordered remaining plan, not a claim these increments already exist.

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

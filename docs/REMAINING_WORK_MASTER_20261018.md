# G3 remaining work — authoritative plan, 18 October 2026

## Status and scope

This supersedes the ordering/status in NEXT_PHASES_MASTER_20261010.md and older roadmaps. It reconciles release records and a targeted repository review; it is not a fresh security audit, live financial reconciliation, or physical acceptance test. Planning does not authorize every optional extension. No application changes, production writes, new paid resources or store accounts were made in this review.

Latest website: 4396134, Vercel EpysRcHT1oczuw2eW76zyXSDrHu2, CI389/390 passed. Latest signed Android: 2.6.1/code30, 18,313,326 bytes, source commit 5b70ccc; 115 bundled assets verified, 13 excluded model files verified remotely, Java21 assembleRelease/lintRelease and signature passed. APK file SHA256: 50ff6198aa4bce77d1076285bfc303bc1cef0348fb5eb3c29b5480650079507a. There is no generated Play AAB or native iOS project in the inspected checkout. Native push currently explicitly returns early outside Android.

User confirms no Google Play Console or Apple Developer accounts. Mac access is unknown. No store submission has occurred. APK source 5b70ccc and checkpoint 60aea9e were local-only at reconciliation; the working branch was two commits ahead of origin. Preserve these and the APK/signing material in an approved backup. Documentation-only commits remain local by default to avoid unnecessary CI. The website does not need another deployment simply to deliver this APK.

## Delivered baseline — do not rebuild or relist as missing

| Area | Delivered evidence / record | Remaining qualification |
|---|---|---|
| Home, Updates, Work | Compact responsibilities/defer, canonical feedback item, synchronized update state, simplified Work order, duplicate shortcuts removed, pink actions | Ordinary user feedback; this was not a global restyling of every action in every module |
| Attendance / official meetings | Current/last workshop, actual individual and bulk departure correction, historical audit, student-only missing list, official one-off workshops, 23:00 Sunday/Wednesday cutoff, compact absence decisions with reviewer/time | Historical missing lists use current active membership/join dates, not reconstructed past rosters; downloaded CSV manual inspection was not completed |
| Limited Mentor | Operational permission toggles and scoped access | Account/password administration, permissions administration, security audit and emergency engineering overrides remain protected; least-privilege device acceptance outstanding |
| Inventory / fundraising / finance | Filament units/weight, editable print operating cost, actual order quantities/prices, expense linking, commitments, invoices/partial payments, refunds/returns, compact allocation selection | Owner must reconcile historical records; no automatic alteration of debt or duplicate deletion |
| Academy / learning | Existing courses, instructor bulk assignments/confirmation, evidence, reviews, qualifications, official training links | Real student/leader acceptance and practical qualification; advanced interactive lessons are extensions |
| CAD Mentor | Onshape connection/shared leader access, refresh, exact-revision evidence, source change dates separated from check/import dates, review handoff | AI guidance is not deterministic geometric/engineering certification or a native CAD editor |
| Robot Build | Build/assembly setup, parts, sourcing, workshop tasks, QC, assembly/test and CAD handoff | Genuine manufacturing/receiving/install/retest pilot remains; real team hierarchy must be configured by team owners |
| 3D Robot Studio | Mixed-source models, generated chassis/pan, custom plates/cutouts/DXF, profiles, placement/delete/fullscreen, explicit saves, comparisons/presentations and reviewed build handoff | 93 entries are source-derived entries, not 93 verified manufacturer families; known-mass coverage is not a complete measured robot mass |
| Software workspace | Pinned code evidence, saved review/findings, WPILOG diagnosis/comparison, planner/test handoff, compiled OFFSEASON_2026 drive/wait export | Read-only GitHub, mechanism contracts and true log-to-deployed-code identity remain open |
| Mechanical tools | Belt/chain sizing, diagram/units, saved calculations, optional assembly link, print/PDF | Real fit/tension/load checks and additional tool families are separate |
| Simulator / field / VR | Existing reference robots/fields, driving, fuel practice, controllers/VR and teaching tools | Not a physically calibrated team robot or complete implementation of all game rules |
| Android | Signed smaller APK with latest UI; current field/KitBot and small components bundled | No observed phone install/push/performance acceptance; optional model cache is evictable, not explicit guaranteed offline storage |

## Prioritized execution backlog

Efforts below are provisional engineering person-days for the stated slice, including focused validation/documentation. They are not token estimates, promises, waiting time, or additive whole-program totals. Device sessions may be performed remotely with a team member; that is different from requiring the workshop. Re-estimate after unknown inputs are resolved.

| ID / priority | Remaining steps and completion gate | Benefit | Effort | Where / dependency |
|---|---|---|---|---|
| P0-1 Android real-device acceptance | Upgrade over installed APK; login/logout; one approved absence-notification scenario in foreground/background; location allowed/denied; RTL, files, current field offline and optional model first load/retry. Record version/device and actual receipt. Fix demonstrated failures only. | Establishes the release works for students, including the reported missing phone alert | 0.5–1 day plus fixes if found | Real Android phone anywhere for most checks; actual workshop location needed for presence acceptance |
| P0-2 Historical finance reconciliation | Owner reviews legacy commitments against invoices/expenses; correct actual quantity/price, link already-booked expenses, resolve partial/unspent remainder and reimbursements with audit; agree opening/closing totals. Inspect current records before claiming the recorded October15 count of 10 is still current. | Trustworthy obligations, expenditure and amount owed without double counting | 1–2 owner sessions plus 0.5–1 day support | Remote; receipts and authorized finance owner required |
| P0-3 Store ownership and publication preparation | Choose legal owner; enroll accounts; create support/privacy/store materials and isolated review access; build AAB; preserve signing continuity; check target API/native 16KB compatibility; internal Play pilot then closed/public distribution as appropriate | Managed Android installation/update flow | 2–4 days engineering/admin preparation, excluding policy-related changes and external verification/review waits | Remote; owner supplies legal details, payment and verification; real Android phone |
| P0-4 Release continuity | Back up local APK/source and signing configuration securely; publish source in the next agreed release batch; record web/APK/store versions separately; assign account recovery owners | Prevents lost signing ability, local-only work and stale version confusion | 0.5–1 day setup | Remote; existing approved storage only; no secrets in Git/docs |
| P1-1 iOS beta to distribution | Add Capacitor iOS target; port native push/APNs registration and delivery; review Android-only Wi-Fi attendance behavior and valid iOS presence path; login/session, permissions, files, links, RTL, 3D/memory; archive/TestFlight/review | Brings native delivery to iPhone team members | 8–15 days for first usable beta, re-estimate after platform spike; store wait extra | Remote coding plus Mac/Xcode or approved macOS build service, Apple membership and real iPhone; workshop check-in validation |
| P1-2 Real team workflow pilot | Leader configures actual build/assemblies; student takes one manufactured part and one purchased item through release/work/QC/receipt/stock/assembly/test; carry one real repair/retest. Separately exercise training assignment and one fundraiser cost/sale/finance cycle | Finds practical flow gaps before adding more modules | 2–4 preparation/triage days, 1–2 workshop sessions; fixes estimated from evidence | Team owners + workshop; no invented production stock/test data |
| P1-3 Catalogue correctness and coverage | Choose exact team-used products; verify rights/source/version/scale; add thumbnails, source metadata and mass evidence; explicitly list included motors/hardware; prevent assembly-child double counting in mass/BOM; extend ready models in batches | Useful accurate real-robot composition, rather than a misleading part count | 2–3 days inventory/source audit; 5–10 days first prioritized batch/inclusion model; remaining SKUs sized afterward | Mostly remote; mechanical leader verifies dimensions/mass/inclusions, workshop for measurements |
| P1-4 Season readiness before kickoff | Version field/tags/transforms/colliders/game behavior; preserve old plans/results; explicit supported/unsupported functions, activation/rollback; test synthetic different season, then official assets/rules when published | Reduces kickoff migration risk | 8–14 days bounded framework; actual new-game mechanics extra | Remote; official season inputs needed later |
| P1-5 Recovery and connector continuity | Extend scoped Robot Build recovery to DB/storage/auth/functions/config; verify access and recovery timings; rehearse revocation/reconnect with owner; document signing/account recovery | Business continuity and reliable integrations | Recovery 3–6 days; connector runbooks 1–2 days, overlapping preparation | Remote; use existing approved resources. User declined another paid Supabase project; do not create one |
| P2-1 Guaranteed optional offline model library | Explicit download setup/dependencies, version/checksum manifest, persistent storage, progress/cancel/retry, storage management, atomic replacement and eviction distinction | Optional robots/old fields reliably available before workshop without internet | 3–5 days plus Android/iPhone device checks; avoid duplicating iOS storage work | Remote + phones, no robot required. Existing cache does not fulfill this |
| P2-2 Mechanical tools extensions | First inventory-spec matching and purchase preparation, then explicit Studio shaft anchors/freshness; choose next calculator based on real use (gears/motor sizing/structure/pneumatics) | Turns calculations into actionable parts/layout decisions | 3–6 days first connection slice; 2–5 days per bounded calculator after engineering specification | Remote implementation, actual hardware fit/load confirmation in workshop |
| P2-3 Practical learning exercise | One CAN/wiring or mechanical exercise with real component references, objective errors/remediation and existing assignment/evidence/reviewer flow | Less mentor repetition and better diagnostics training | 5–9 days for first exercise | Remote authoring; real skills sign-off in workshop |
| P2-4 Reproducible simulator coaching | Snapshot robot/settings/alliance/route/objective; restore same setup; comparable results and coach feedback; deterministic input replay only if needed | Coach and student review the same scenario | 6–10 days | Remote; actual controller/headset/phone checks, not necessarily workshop |
| P2-5 AI answer evaluation | Small maintained EN/HE code/CAD/log question set, expected evidence/revision/missing-data behavior, leader scoring and failure tracking | Measures review usefulness without repeated unbounded paid calls | 3–5 days first set | Remote; real evidence and existing private-data/provider consent boundaries |
| B1 Robot mechanisms | Software leader supplies actual OFFSEASON_2026 intake/shoot/feed/readiness/stop/fault contracts and hardware setpoints; integrate only known commands, compile selected SHA, review chooser/wiring | Extends delivered drive/wait export into real mechanisms | Estimate after code contracts; no credible total yet | Remote after inputs; installation/safety behavior with robot |
| B2 Real robot autonomous acceptance | Record deployed SHA/dirty state and configuration, collect matching WPILOG, both alliances, stop/interruption, repeat low-speed tests and tolerances | Establishes actual autonomous behavior and traceability | Initially 2–3 supervised sessions plus evidence-driven fixes | Workshop/robot; remote analysis afterward |
| B3 Simulator/vision calibration | Agree tolerances, collect measured mass/dimensions/camera calibration/pose and repeated trials; fit one subsystem; validate held-out data; quantify route/localization errors | Replaces assumptions with measured accuracy | 5–8 days shared preparation, 4–8 one subsystem, 5–10 vision slice; avoid double counting shared work | Workshop data collection + remote analysis |
| P3 Alliance planning extension | First audit existing scouting/competition functions; add only missing evidence-linked feasible roles/conflicts/fallbacks/briefing | Better competition decisions from credible data | 6–10 days first useful slice | Remote tabletop review; real match validation later; depends on own/partner observations |
| P3 CI efficiency | Assess duplicate branch runs, affected-path checks, reusable build evidence and required gate dependencies | Lower repeated work and faster releases | 1–3 days | Remote; preserve security/shared-change gates; no silent test disabling |

## Conditional work / decisions preserved

- CAD deterministic clearance/service-access checks: 10–18 days for one defined family, plus expert/physical confirmation. CAD/CAM expansion remains on hold until explicitly resumed. Current CAD review remains usable.
- Onshape automatic manufacturing exports: provider feasibility, exact revision/configuration and controlled drawing/STEP/DXF package; approximately 5–9 days for one export slice after feasibility. Not CAM/toolpaths, machine control or manufacturing certification.
- CAM choice/integration: no Onshape CAM adoption assumed; wait for students, actual machine/postprocessor/toolchain. No estimate before discovery.
- App-triggered GitHub Actions: deliberately deferred by user to keep GitHub read-only. Would provide compile/test results from the app; needs explicit Actions write grant and scoped credential. Never robot deployment. Manual builds remain available.
- Incorrect member-credit recovery receipt reversal: known rare missing audited UI correction in finance; administrative repair exists. Size a 1–2 day slice only if real occurrences warrant it; never silently rewrite financial history.
- Historical membership snapshots: needed only if exact past expected attendance is required; present report is explicitly current-membership based. Design meeting-time expected-roster snapshots and honest unavailable status for unreconstructable past data; provisional 2–4 days.
- Studio refinements: favourites/recent parts, named checkpoint metadata and deletion of unreferenced saved versions remain outside delivered correction. Preserve referenced versions and distinguish these from deleting a part, which is delivered. Approximately 2–4 days for a selected usability slice, not a full CAD editor.
- Large-scene/log/CAD performance: benchmark named devices first; optimize measured bottlenecks (first slice 2–4 days). No claim of full-fidelity arbitrary CAD or guaranteed 3D speed.
- Extra game rules, tower/full-match behavior, additional geometric checks and arbitrary lessons require selected use cases; no unbounded estimate.

## Efficient workshop agenda

Before visiting: install candidate app, choose named participants/roles, prepare real part/invoice/task, approved code SHA and measurement sheet; keep test-only users outside attendance counts.

1. Student arrival/permission flow on actual Wi-Fi/location; leader and Limited Mentor views; absence approval and notification on real phones. Admin corrects only a genuinely incorrect record, with actual time/reason.
2. Manufacture one released part, record quantities and independent QC; receive one real purchased item; assemble/test and record the actual result. Confirm CAD leader can access intended design from their own login.
3. Software leader deploys reviewed code; record build identity and matched logs; low-speed motion/stop tests under responsible supervision. Collect mass/dimensions and camera/drive measurements if hardware is ready.
4. Departures and workshop closure; compare expected/actual attendance. Capture problems and evidence once, then investigate remotely.

No workshop is required for account enrollment, app-store materials, finance reconciliation from receipts, code/CAD evidence review, catalogue sourcing, most UI work, or most phone install/push tests. Real hardware fit, actual workshop presence checks, calibration and robot operation do require physical access.

## Next sequence

Start account ownership/enrollment and Android device acceptance in parallel. Reconcile finance before more finance features. Prepare Play AAB/signing and first internal release. Begin iOS only after Mac/account path is established. Run the workshop pilot while catalogue correctness and season readiness progress remotely. Then choose bounded training/calculator extensions from actual student use. Keep CAD/CAM and GitHub write decisions deferred.

Each item closes with source/release identity, test evidence, owner acceptance and remaining physical limitations recorded separately. There is no claim that all future vision is built or that a roadmap can guarantee no future gaps.

## Evidence register

- CURRENT_CHECKPOINT_20261009.md; WORKING_EXPECTATIONS.md
- APK_MILESTONE_20261017.md; FOCUSED_OPERATIONS_20261017.md
- WORKFLOW_RELIABILITY_PROGRESS_20261015.md
- ROBOT_BUILD_PHASE1_20261010.md; ROBOT_BUILD_PHASE2_IMPLEMENTATION_20261010.md
- ROBOT_STUDIO_CATALOGUE_RELEASE_20261011.md; ROBOT_STUDIO_CATALOGUE_PLAN_20261011.md
- STUDIO_PLATES_WORKSHOP_PLANNING_20261011.md; MECHANICAL_TOOLS_20261011.md
- SOFTWARE_LOG_IMPLEMENTATION_20261009.md; ENGINEERING_WORKFLOW_FINAL_20261010.md
- NEXT_PHASES_MASTER_20261010.md (retained detailed future-scope rationale, superseded ordering)
- CAM_WORKFLOW_DECISION_20261009.md
- MOBILE_DISTRIBUTION_GUIDE_20261018.md (store procedures, ownership and readiness gates)

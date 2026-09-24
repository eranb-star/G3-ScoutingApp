# Current phases and handover authority — 24 September 2026

This is the authoritative remaining-phase summary after the three-increment release and the future-season discussion. It supersedes status/order/remaining-effort statements in older roadmap documents. Detailed feature requirements remain in the linked records. This documentation update does not start a new feature or deployment. The user will choose the next increment.

## Read first / verified release boundary

- [Working expectations](WORKING_EXPECTATIONS.md): clear concrete explanations; inspect existing implementation; extend rather than rebuild; meaningful regression checks; UI/UX and EN/HE/mobile are release requirements. Never promise zero defects or infinite scale.
- [Three-increment implementation, failures, corrections, cost and rollback](THREE_INCREMENT_PROGRAMME_20260924.md). Main implementation/handover through `ac4688f`; release through `8dc516a`. Website production source `8fb99dc`, Vercel `NefhtgnnVSdxYfQDPDRTYc3XbaRm`. Later backend changes were deployed separately; their exact final bundle hash is in that record. A preview URL/login screen is not proof of production state.
- Production project `hnqwhuuxlqfyawqymaaz`; synthetic QA `cyooubycafubbnkjcqlw`. Recovery clone `ooqwgylckjvfpkshhexm` contains real data and must not be treated as disposable QA; keep its schedulers disabled.
- Main working branch `codex/release-1-qa`; isolated release branch `codex/knowledge-protection-release` in `docs/staging/knowledge-release.local`. Check current Git state before editing. Do not deploy the accumulated working branch wholesale. Preserve unrelated Android `.idea` edits.
- No new live production audit was performed for this documentation pass; current status below comes from the recorded verification and inspected source. Recheck relevant external state when beginning the next change.

## Already delivered — preserve

- Existing task ownership, collaborators, dependencies, mentor review, artifact verification, requirements and approval controls. Synthetic end-to-end student changes/resubmission/mentor approval/dependency release passed. This is not an actual workshop acceptance sign-off.
- Historical corpus/search, Gemini integration, permissions, Admin general-topic exemption and $25 monthly application cap. Recorded corpus: 1,716 sources / 48,797 passages / 50,157 citation occurrences; not exhaustive top-500/ten-year coverage and not verified robot counts. Last recorded reviewed robot catalogue was empty; do not assume it became populated by ingestion.
- Supported official PDF/HTML text ingestion/versioning via Check now; recorded 18 indexed entries / 17 files / 1,686 passages. [Release and limitations](OFFICIAL_INGESTION_20260924.md).
- Selected-file Software Mentor with exact repository revision and citations; compact optional code attachment followed by question and Send. Selecting files alone does not run AI. [Delivered scope](SOFTWARE_MENTOR_PHASE1_20260924.md). Whole-repository understanding, execution and logs are not implied.
- Decision-answer formatting, source disclosure, and immutable saved question/answer/citations attached to an existing task. Task creation does not approve a design or certify a proposed test as passed.
- Simulator graphics/quality presets, carpet/hall, driver views/eye height/fullscreen, arrow movement, VR prototype, timed practice/results and recorded visual replay; intake contacts, official welded-field tags, inspection, published 6328 Darwin and one computer opponent. Numeric keyboard editing and parallel 1/2/3 shooting; KitBot 40 and Darwin 60/triple defaults. See [remaining simulator scope](NEXT_PRIORITY_20260924.md#deferred-simulator-backlog-not-unfinished-delivered-features) and [latest settings release](SIMULATOR_SETTINGS_20260923.md).
- Focused production permission tightening and fresh encrypted local Storage backup/restore. Full disaster recovery is not complete.

## Recommended next phases / remaining scope

These are workstreams, not a requirement to finish every row before receiving value. Estimates are provisional focused engineering days, not Codex tokens or guaranteed elapsed times. Do not add overlapping estimates. Re-estimate after inspecting the selected subset.

| Priority / workstream | Remaining deliverable | Effort / dependency |
|---|---|---|
| 1. Decision correctness and usable limits | Fix/evaluate mixed-level scoring conclusions; deterministic numeric checks where supported; versioned EN/HE rules/strategy/debugging/follow-up evaluation; explain spend allowance versus remaining question count; Mentor purpose-classifier evaluation. Preserve delivered retrieval/task linkage. | First bounded correction/evaluation: 3–6 days, provisional; remote. More complex rule representation overlaps season foundation. Paid tests require allowance; do not raise limits silently. |
| 2. Reusable season foundation | Season package, versioned structured rules/terminology, generic retrieval/configuration, readiness UI, migration of existing 2026 behavior into the reusable structure and cross-season regression tests. | 8–15 days for knowledge/rules/configuration foundation, provisional; remote. Does not include automatic full physics. |
| 3. Season field import and simulator adapters | Import/validate published field assets, dimensions/transforms/tags/stations; map supported pieces/zones/timing/scoring into shared engine; keep unsupported interactions explicit. | 10–20 additional days for a bounded supported asset/configuration path after asset inspection. Novel game mechanics estimated separately. Physical fidelity requires measurements. |
| Parallel protection: recovery and remaining acceptance | Approved offsite destination/separate key custody; portable clean-machine and complete DB/auth/storage/functions/environment restore; nonempty cloud-object/access rehearsal; measured recovery times. Finish physical/mobile/workshop acceptance of current workflows. | Cannot responsibly give a revised total until destination/access chosen. Prior 4–8-day recovery total is partly delivered; do not quote it as all remaining. Workshop checks need devices/team. |
| Software Mentor next increments | Whole-repository/dependency-aware retrieval and complete diff coverage; then one-format log diagnosis; isolated proposed patches/build/tests; autonomous/vision/PID diagnosis and teaching tied to actual code/configuration. | Whole-repo increment: scope after repo inspection. Log diagnosis 10–20 days; bounded coding assistance 10–20 additional; subsystem/autonomous tuning integration 15–30 additional plus robot sessions. Overlap with twin work. |
| Engineering Twin / camera advisor | Manual camera placement, cones and occlusion/coverage first; then rank locations/counts for localization and game-piece vision. Measured subsystem/motor/controller/PID/WPILib integration. Concept layouts before manufacturable CAD generation. | Camera scope needs geometry/motion/camera-input inspection before estimate. First calibrated subsystem 20–40 days is a separate broad estimate, with physical testing. |
| CAD / Onshape | Read-only version-linked assemblies, findings and task/review linkage first; later controlled generation/edits with branch/review/approval. Public permitted demo possible without private team CAD. | 8–15 days read-only once access available; 20–40+ additional for bounded controlled edits. GitHub access and Onshape authorization differ. |
| Deferred simulator completion | Measured team robot calibration, reproducible input replay/ghost/comparison, complete match rules, richer multi-robot/opponent behavior; physical VR/phone/controller checks. | Re-estimate chosen subset: old 10–20 and 20–40-day bundles include now-delivered work. Actual robot/device data required for realism claims. |
| Manufacturing | Versioned BOM/drawings, reservations, manufacturing/QC/install/spare lineage, scrap/rework; later reviewed machine-specific CAM. | 15–30 days core; 20–40+ additional CAM, physical validation. Reuse inventory/workshop; no autonomous machine start. |
| Orchestration and future AI job controls | One proven cross-system workflow with bounded jobs, least privilege, budgets, cancellation, idempotence/recovery and human approvals. Extend controls before new paid background jobs/CAD writes. | 15–30 days for one workflow; broad expansion 40–80+; selected governance extension 5–10 overlapping days. Existing chat controls are delivered. |
| Mobile release/distribution | Refresh packaged APK from verified production source; physical upgrade/session/GPS/push/EN-HE/simulator tests; official Android/iOS distribution separately. | Rebuild is a small separately scoped release; 10–20 days refers to broader distribution/device acceptance plus store/account waits, not rebuild alone. |
| Optional later | Historical playable seasons; finance reversals/reconciliation/restricted funds/receipts/period close; separately validated automatic checkout. | Historical simulation requires each season's assets/rules/physics, not merely documents. Finance 5–15 days per selected increment. Checkout scope/effort requires separate review. |

Historical evidence curation and reviewed robot-mechanism records remain ongoing bounded work. More records alone do not fix answer reasoning. No measured storage basis has been established for automatically reducing the top-500 ambition to 300. Confirm live capacity for a concrete expansion rather than relying on subscription name.

## Future-season agreement — reusable, not an annual rebuild

User intent: for 2027 and later, select/add season and press Check now; reuse the knowledge, AI, engineering and simulator capabilities with minimal annual intervention. All future features should use shared engines and versioned season data. A new season must not overwrite historical configurations or tests. This is agreed architecture direction, not implementation completed in this documentation turn.

Current code evidence:
- `configure_frc_season` supports adding seasons/publication watches; Check now validates season and processes configured accessible official sources. It has bounded size/count/parser limits and explicit failure states; no five-minute polling.
- `officialSeasonEvidence` first queries season-indexed database evidence, but its HTML fallback registry contains only 2026. Search has scoped 2026 tower/traversal terms. Remove configuration assumptions as part of the shared foundation; do not claim only-2026 database retrieval.
- Driver station coordinates, AprilTags and field assets explicitly contain 2026 configuration. They are not generated from a PDF by Check now.
- Text extraction does not reliably interpret arbitrary drawings, scanned pages, CAD assemblies, moving mechanisms or physical properties. Source changes and unsupported formats require attention.

Season package contents:
1. Season identity and effective revision; official publisher registry and document/Team Update/Q&A provenance, hashes, authority and supersession rules.
2. Terminology, structured scoring/RP/period conditions, units, eligibility and exceptions. AI may propose extraction; deterministic validation and review precede authoritative rule activation. Preserve document citations for each rule.
3. Field assets and licenses, dimensions, units, coordinate origin/orientation, alliance transforms, AprilTag family/IDs/poses, driver stations, scoring zones and colliders.
4. Game-piece geometry and measured/assumed physical parameters; supported mechanism/interaction adapters; timing/scoring rules and tests. Imported appearance alone is not calibrated behavior.
5. Versioned evaluation cases and readiness, with compatibility IDs for robot profiles, saved runs, replay and derived recommendations.

Admin flow: **select/add season → Check now → inspect discovery/indexing results → review extracted rules and field preview → activate verified capabilities**. Reuse existing administration and source workflow; no parallel portal. Show independent **Knowledge ready / Field ready / Simulation ready / Needs attention** states with actionable missing items. Knowledge can be used before simulation is ready. New document revisions invalidate affected derived rules/results until rechecked; do not silently rewrite saved evidence or replay configurations. Publication should be atomic per verified version with a rollback path.

Readiness checks: old/new season isolation; explicit season and conversational context; unsupported/failed/oversized documents; revisions and supersession; numerical mixed-combination calculations; units/transforms/tag identity; field geometry versus scoring/physics; saved replay compatibility; permissions/budgets; EN/HE/RTL and mobile. Test the existing 2026 package through the shared path, then a synthetic different-season fixture with changed names/scoring/geometry. Never present synthetic fixtures as actual 2027 rules before publication.

Annual expectation: most seasons should require data/assets/configuration and a short reviewed readiness report, not rebuilding the application. Novel physical interactions or publisher formats can still require reusable engineering additions. Do not promise instant complete discovery, autonomous perfect field generation or zero annual code changes.

## APK status — separate from website

Latest recorded artifact is **2.2.0 / versionCode 24**, September 21, `releases/G3-Team-Hub-2.2.0.apk`, bundled from web source `877208b`. It predates later VR, practice/fidelity/settings and Software Mentor/decision UI releases. Website deployment does not replace bundled APK frontend assets; compatible shared backend updates may still affect it.

[APK record](APK_MILESTONE_20260921.md) contains package ID, file size/SHA256, signing-certificate hash, 39-file bundle comparison, Gradle/lint/signature checks and Java 21 requirement. Physical in-place upgrade, sessions, GPS, push, knowledge, EN/HE and simulator checks remain pending; Google Play distribution not performed. Keep signing credentials private, preserve signing identity, increase version code on a new release, use isolated verified production code and keep APK binaries ignored. This pass did not rebuild or rehash the artifact.

## Regression lessons / unresolved issues

- Read [exact acceptance and failures](THREE_INCREMENT_PROGRAMME_20260924.md) before touching assistant/review/recovery. Long-question truncation hid scoring concepts; generic pages displaced point tables; adjacent table pages must remain together. Repeated short follow-ups lost the season anchor; bounded user-only context now restores it and stops on new topic/year.
- Correct citations/numbers do not prove the recommendation. Hebrew conversation still overstated necessary alliance conditions despite correct sources; this remains open. Prompt corrections are not proof of resolution. An additional clean evaluation was blocked by daily spend allowance. Seven paid tests cost $0.119027; no outstanding attempts or cap increase. Existing bad saved answers are not automatically corrected.
- AI-proposed cycle/time targets are not measured team capability. Reject unsupported numeric mass/performance claims and physically impossible acceptance criteria. Keep human review/test approval explicit.
- Owned-message provenance, immutable snapshot, task-reader sharing notice, atomic task creation and changed-payload retry rejection must remain. Preserve checks for hidden projects, inactive members, self/unauthorized approval, stale requirements and dependency blocking.
- Permission fixes closed exposed direct helper execution and NULL-role guard gaps. Do not undo secure grants as a rollback shortcut. Focused audit is not exhaustive security certification.
- Backup restored 12 objects with verified hashes locally; profile-bound local backup is not portable/offsite/full service recovery. Never commit keys, credentials, private restored objects or downloaded corpora.
- Simulator visual improvements must not change physics by quality tier. Preserve input/focus, intake/shooter/count-conservation, driver fullscreen area, model/tag provenance and profile defaults. Desktop checks do not establish physical headset performance or exact robot fidelity.
- Use relevant behavioral tests from each feature's release record; run additional tests when changed dependencies/new evidence justify them, not every historical suite by default. Preserve rollback source, migration order, release IDs and honest implemented/tested/deployed/physically-accepted distinctions.

## Inputs still needed later

- Owner-approved independent backup destination and separate key custody.
- Current offseason software repository/branch and representative logs/units/configuration: owner will identify with the team at the workshop; do not repeatedly ask remotely.
- Authorized actual CAD/Onshape access and measured robot data for private model work/calibration. Public permitted examples remain labelled.
- Physical Android/Quest/controller/workshop access and store accounts when those releases are selected.

Detailed long-term feature requirements: [September 21 agreement](NEXT_PHASES_AGREEMENT_20260921.md); legacy programme/V5.2: [master handover](PAUSE_HANDOVER_20260913.md). Their older current-status/selected-next statements are superseded by this file. Documentation and tests reduce regression risk; they do not guarantee zero regressions or complete automatic understanding without reading the relevant code.

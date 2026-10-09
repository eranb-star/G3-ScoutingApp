# Robot Build — authoritative pre-development and implementation plan

Date: 9 October 2026. Status: **implementation in progress; local changes are not yet deployed**. The user authorized end-to-end development. This document remains the execution authority; the implementation checkpoint records actual delivery and unresolved acceptance. No design document can guarantee no regressions; the mandatory gates below make completion demonstrable.

## 0. Reading order, precedence and change control

1. This master plan: scope, execution order, invariants, traceability and release gates.
2. [Complete UX/domain design](ROBOT_BUILD_COMPLETE_DESIGN_20261009.md): screen behavior and all subsequent challenge amendments. Latest direct-entry amendments supersede the initial five-view/nested-entry proposal.
3. [System integration review](ROBOT_BUILD_SYSTEM_INTEGRATION_REVIEW_20261009.md): S01–S11 cross-system contracts.
4. [Current production release](ROBOT_BUILD_RELEASE_20261009.md): delivered baseline and actual evidence, never overwritten by proposed behavior.
5. [Historical implementation specification](ROBOT_BUILD_SPEC_20261009.md) and [working expectations](WORKING_EXPECTATIONS.md).

When new information conflicts with this plan, record the affected requirement, evidence, decision and acceptance change here before implementing it. Preserve history; do not quietly drop a requirement, weaken a server gate, or declare a dependency resolved without evidence. Update START_NEXT_SESSION.md at each meaningful milestone. Do not make a new list of phases that loses G/S requirements.

Execution statuses: planned → implemented locally → verified locally → deployed to preview/QA → accepted there → deployed → production-verified. Physical/device acceptance is separately recorded. “Implemented” is not “released”; a passing build is not workflow acceptance. Every unfinished requirement retains an owner role, next action and blocker when applicable.

## 1. Baseline to preserve

Recorded production implementation source 589943e, release d0e6231, Vercel DSp5YL17bBRgWr95RiLVRn3jqJiV; CI300/301 passed. Nine additive Robot Build migrations and connector update deployed. Real acceptance covered a small rake assembly, two distinct part revisions/three occurrences and a persisted private project draft. It did not execute live manufacturing, purchases, inventory, student assignments or physical acceptance. APK 2.3.1/code26 predates later changes and has no Robot Build device acceptance.

Already delivered: structural Onshape import; private draft and scoped metadata sharing; make/buy/reuse/exclude and manual requirements; overlap decisions; existing task/release/QC links; operation reporting; material plans/actual consumption; scrap/rework history; whole-job accepted output; stock reservations and purchase linking; existing-stock verification; kits/installations/replacement retest; EN/HE presentation. Extend these, do not rebuild parallel systems.

Before coding, verify actual branch/worktree status, live schema/RPC definitions and latest production source. Recorded baseline may advance. Preserve unrelated Android IDE files and local research/assets. Do not deploy the whole working tree or commit screenshots/secrets/private exports indiscriminately.

## 2. Product boundary and final navigation

Work → **Robot Build** opens a dedicated project-backed workspace directly. One accessible active build opens immediately; several produce a compact chooser with explicit current context. No build gives an appropriate leader setup or student empty state. Existing Projects → Open Robot Build and old CAD/task/build links remain valid; no duplicate project or job is created to adopt the new UI.

Four primary views: **Overview / Parts / Workshop / Assembly & tests**. **Build details** and **Activity** are secondary visible links. Source changes and pending decisions surface in their working view and Overview, not only in Activity. Workshop exposes My work / Team work / Inspections as authorized. Existing Home/Work remains the cross-build action/reviewer inbox.

Build = project delivery scope and purpose; physical robot = identifiable real asset; configuration = design/built/installed state at a revision. Offseason may modify the same physical robot. Onshape sources, code repositories and simulator profiles are references, not alternate robot identities. Current assets are project-scoped: cross-project continuity requires a reviewed link/transfer, not inferred duplicate assets.

No complete robot assembly is required to begin. Partial assemblies, mechanisms and manual wiring/fastener requirements are supported. Structural import coverage is explicit; a sketch or Part Studio does not invent assembly quantities. Season setup, Knowledge, Academy, simulation, finance and purchasing retain their existing purposes.

## 3. Screen contracts

| Screen | Visible default | Primary action and prerequisites | Mandatory failure/edge behavior |
|---|---|---|---|
| Build entry | Name, purpose/season, current subsystem; recent accessible builds if multiple | Open or continue setup | Archived read-only, denied access, no assignment, no build and failed load are distinct |
| Setup / Build details | Existing project/name/members; physical asset or not built yet; sources/subsystems | Save draft; confirm scope | Resume draft; detect existing linked scope; do not require physical asset before design work |
| Overview | Named blockers, owners/dates, separate release/supply/install/test measures | Resolve highest applicable blocker | Unknown coverage shown; no bolt-weighted robot-ready percentage |
| Parts | Compact rows: identity, material/process, required quantity, next action/status | Prepare work, source or review change according to row | Search/filter state persists; all authorized pages counted; add manual part is visible |
| Part detail | Relevant preview/drawing, revision, quantities and next action | Make/buy/reuse-specific operation | Missing export distinct from no solid geometry; supported alternate actions remain available |
| Prepare work | Quantity/destination, approved files/instructions, operations, owner, criteria/date | Prepare/release through existing review policy | Required-only fields by operation; no hidden task-review setup prerequisite |
| Student operation | Current step, quantity, drawing/instructions, material/location | Report quantity or submit inspection | Persistent server receipt; problem reporting; data retained on failure; no duplicate task report |
| Inspection | Exact lot/release/criteria and evidence | Accept/rework/scrap/hold permitted quantity | Partial dispositions conserved; independent authority enforced where required |
| Sourcing | Available eligible stock, allocations and linked request/receipt status | Reserve/request/link purchase | No duplicate demand coverage; unauthorized stock action has valid request route |
| Assembly & tests | Requirements, eligible kits/batches, installed configuration and required tests | Kit/install/replace/open existing test | Wrong accepted part rejected; installation is not test completion |
| Changes | Candidate vs released revision, affected demand/work/stock/installations | Review scoped disposition | Old releases preserved; stale/partial comparison cannot overwrite current work |
| Activity | Human-readable immutable events and links | Open referenced record | Corrections append, protected evidence not silently deleted |

Consistent G3 controls and restrained magenta accent. No giant action grids or permanent competing large panels. Model/detail opens on selection; fullscreen uses viewport with current part/revision and relevant controls. Phone layout uses stacked rows and task pages, not squeezed desktop tables. No nested drawers or nested accordion dependency for routine work. Required input/button baselines align. Touch targets >=44px, visible keyboard focus, accessible labels/announcements, contrast, 200% zoom and reduced-motion support where applicable.

Use Settings language only. Hebrew RTL, LTR part IDs/units as appropriate, translated structured templates and original technical names. Dates include date and relevant local time. Browser Back, refresh, post-login return and specific record links preserve authorized context. Unsaved build switching offers save/discard/stay. A floating widget must not cover actions. No unrequested global UI redesign.

## 4. End-to-end ownership and data contracts

| Concept | Authority / implementation approach | Forbidden shortcut |
|---|---|---|
| Project/task/assignee/reviewer | Existing project and engineering records | Second task or approval engine |
| Candidate CAD snapshot | Onshape connector, immutable source/configuration references | Treating a webhook payload or displayed mesh as complete BOM |
| Part identity/revision | Reviewed mapping, source IDs and occurrence paths | Name-only merging or equating part number with physical serial |
| Demand | Destination-specific requirement, required quantity and source scope | Double count overlapping assembly roots or spares |
| Release package | Existing approval plus immutable files/instructions manifest | Swapping latest CAD into a running job |
| Supply/batch/lot | Existing build/stock records extended compatibly | Mixing accepted, rejected, on-order and installed as available stock |
| Materials | Existing inventory ledger and shared availability | Separate Robot Build filament catalogue or double consumption |
| Purchase/order/payment | Existing purchasing/finance | Job consumption posting another supplier expense |
| Physical component/configuration | Explicit links among assets, maintained components and installed records | Implicitly assigning legacy history to active robot |
| Tests/issues/repairs | Existing reliability/trials/engineering/issue records | Separate Build test store or auto-closure without required retest |
| Training/authorization | Existing Academy and explicit practical policy | Quiz/certificate automatically authorizing machinery |
| AI evidence | Authorized revision-specific context, existing budgets | Automatic AI disclosure/calls on sync or AI release approval |

Proposed additive concepts to validate against deployed schema: build/subsystem scopes; reviewed cross-registry identity links; release file manifests/grants; CAD change sets/dispositions; demand-to-supply allocations; partial QC lots; raw-material reservations/remnants; linked source references on issue/test/action records; read models for queues/readiness. Final schema/RPC names must be added to the implementation ledger before migration; these concepts are not asserted to be existing tables.

## 5. State transitions and quantity invariants

Use separate dimensions rather than a single overloaded status:

- Source: candidate → complete/attention → reviewed. Release: draft → pending review → approved → superseded/withdrawn. New candidate is advisory; explicit release withdrawal/hold blocks affected work.
- Work: planned → ready → in progress → inspection pending → accepted/remaining disposition. Blocked/cancelled preserve history and require allocation reconciliation.
- Lot: submitted quantity = accepted + rework + scrap + held + pending. Rework reinspection moves a disposition; replacement production adds traceable new supply, not another copy of the original pieces.
- Physical stock: available → reserved → issued/in process → accepted output or consumed/disposed as appropriate. Return requires actual eligible quantity; scrap/failure never automatically refunds material.
- Installation: accepted eligible components → kit → installed configuration → required verification. Removed components require disposition before reusable stock. Replacement preserves previous configuration.

Additional hard invariants:
1. Sum of allocations never exceeds eligible supply. Two destinations cannot both claim the same part.
2. Units have dimensions and explicit conversions; packs differ from pieces. Compatible material specification/shape is required, not merely equal mass.
3. Stock assembly transformation consumes its child components and produces accepted parent quantity once. Disassembly is explicit.
4. Output inventory mapping matches released identity; kit validates exact requirement/revision/destination, not just any accepted batch.
5. Inspection acceptance and stock receipt occur exactly once, combined atomically only where actor has both permissions.
6. Required independent reviewer policy remains intact. A new shortcut is not new authority.
7. Source refresh never edits approved work, paid records or installed history. Quantity reductions after purchase/work need disposition, not destructive edits.
8. Prototype/simulator observations remain labeled and cannot silently satisfy physical acceptance.
9. Every mutation checks current server authority and expected state. Idempotency keys bind payload and operation; conflicting replay rejects.
10. Parent task completion reflects accepted work under applicable policy; acknowledgement/reminder completion cannot release work.

## 6. Role and permission matrix

| Capability | Student/worker | Scoped leader | Reviewer | Stock/buyer | Admin |
|---|---|---|---|---|---|
| Read work | Authorized assigned/project scope | Authorized project | Assigned review scope | Relevant sourcing scope | Existing permitted scope |
| Report progress/problem | Own/authorized work | As permitted | Not substitute worker reporting | As permitted | No automatic fake evidence |
| Prepare demand/work | No default grant | Yes if existing capability | Separate capability | Separate capability | Existing capability |
| Approve release/inspection | Only separately authorized | Not automatic from title | Existing gate authority | Receipt is not engineering approval | Existing override policy only |
| Move stock / place purchase | Request route | Separate stock/buy grant | Separate stock grant | Existing scoped authority | Existing authority |
| Share released private CAD | No | Explicit delegated capability only | No implied sharing right | No | Existing owner/explicit scope; not blanket sharing |
| Send private data to AI | No implied grant | No implied grant | No implied grant | No | Existing explicit authorization boundaries |

Use capability checks on server and UI. Do not grant access just to make a demo pass. Show responsible role and permitted next action when a necessary step is unavailable; do not reveal inaccessible source/project metadata. Member departure, reviewer absence, connection revocation and shared-device logout have defined recovery. Current private CAD ownership and newer dedicated fundraising permission must be preserved.

## 7. Provider, files and background work

Before enabling automation validate actual team examples: nested/configured assembly, metadata/custom properties, drawing associations, export types/units, immutable version behavior, account permissions/quota and webhook registration/authentication. Unsupported capability has a documented manual approved-file/check path; no false feature-success state.

Pipeline: authorized event/check → deduplicated durable refresh job → complete pinned snapshot → comparison → human disposition → approved package. Debounce and reconcile missed/out-of-order events; retain last good snapshot on failure. Show last success separately from last attempt. No promised one-second SLA without measurement.

File manifest: source document/element/configuration/revision, part association, format/units, checksum, generator/upload provenance, approval and access scope. Export states pending/ready/failed/retry. Drawing association must be verified, not inferred from filename. Use short-lived authorized URLs or authorization-checked delivery as appropriate; document revocation window. Already downloaded/printed files cannot be recalled; label revision/date and authenticated live-status link.

Cache/storage policy: avoid exposing private data in logs, public caches, QR payloads or telemetry; minimal account-scoped drafts; no consequential offline success/replay. Large model failure does not block metadata/instruction reporting; structural counts independent of viewer limits. Restore testing includes files and manifests, not only database rows. Connection-owner handover preserves scope and does not transfer private data implicitly.

## 8. Requirement traceability — no silent omissions

Each row is required unless explicitly listed optional. Delivery packages P0–P6 below are execution units, not new independent products.

| ID | Requirement | Package | Acceptance evidence |
|---|---|---|---|
| G01 | Guided setup, direct entry and single work flow | P1/P2 | Old/new links; leader setup; student one report |
| G02 | Metadata/provenance mapping | P0/P2 | Real property examples + missing-field behavior |
| G03 | Released files/scoped student access | P2 | Exact revision manifest + denied access tests |
| G04 | Part/model selection/fullscreen | P2 | Correct occurrence; phone/fullscreen; missing geometry |
| G05 | CAD changes and downstream decisions | P4 | Edit during manufacture/install; preserved old work |
| G06 | Subsystem readiness | P4/P5 | Complete scoped totals and evidence-derived gates |
| G07 | Personal/team/inspection queues | P1/P3 | Multi-role/cross-build entry and no hidden actions |
| G08 | Raw-material reservation | P3 | Concurrent fundraising/build shared-stock test |
| G09 | Partial lot QC/rework | P3 | Conservation, partial accept, repeat/rework cases |
| G10 | Purchase continuation/export | P3/P5 | Pack/partial/cancel/duplicate coverage; specific links |
| G11 | Initial installed/WIP reconciliation | P0/P5 | Existing robot; no fabricated stock/history |
| G12 | Linked issue journey | P5 | Single issue, repair, retest, protected evidence |
| G13 | Full operational/device acceptance | P6 | Representative provider/team/device release evidence |
| G14 | Allocations/units/remnants/stock assemblies | P0/P3 | Correct dimensions/destinations; parent-child stock |
| G15 | Substitution/holds/operation dependencies | P3/P4 | Old-screen hold; authorized scoped substitution |
| G16 | Role-aware UX/actions/context | P1–P6 | Empty/denied/Back/notification/role scenarios |
| G17 | File/connection/recovery lifecycle | P0/P2/P4/P6 | Revoke/reconnect/restore/old-client tests |
| S01 | Maintenance/build physical identity | P0/P5 | Replacement and removal agree in both views |
| S02 | Existing test/readiness evidence | P0/P5 | Old configuration cannot certify new one |
| S03 | Issue repair and retention | P5 | Linked deletion/closure guarded server-side |
| S04 | Shared printing ownership/resources | P3 | One job owner/one consumption; printer contention |
| S05 | Shared purchasing/finance | P3/P5 | No duplicate request/expense; partial order coverage |
| S06 | Existing Home/Work/action sources | P1/P3 | No duplicate task; acknowledgement not completion |
| S07 | Academy/practical evidence reuse | P2/P5 | Existing completion reused; no auto-enrollment |
| S08 | Code/log/simulator/AI context | P2/P4/P5 | Revision provenance; no inferred calibration/disclosure |
| S09 | Calendar/attendance/reporting boundaries | P1/P5 | No fake progress, qualification or duplicate contributions |
| S10 | Pit/competition continuity | P5 | Exact-robot replacement and retest handoff |
| S11 | Season/knowledge/APK lifecycle | P2/P6 | Season-history preservation and client compatibility |

Optional later: Onshape side panel, external FRC Orders catalogue connector, advanced automatic machine scheduling/nesting, native CAD editing, automatic printer control, universal per-piece serial tracking. These are not silently included in core completion. Simple resource availability, relevant asset serial tracking and supplier grouping remain in the core where specified. Automatic calibrated simulation or robot-ready autonomous generation is not delivered by this BOM programme.

## 9. Execution packages with stop/go gates

### P0 — Verify baseline and settle integration contracts
Read deployed schema/functions; record branch/source/production versions. Inventory existing records and relation constraints without exposing secrets. Confirm live permission behavior using authorized tests, not historical role assumptions. Map G/S ownership and identity links. Validate real provider metadata/export examples. Identify old-client compatibility and backup/restore readiness. Capture baseline UI flows and test results.

Deliverables: schema/identity/mutation map; exact proposed migrations; provider capability matrix (verified/unsupported/unknown); baseline results. Stop consequential implementation if unresolved identity could duplicate physical stock or if release-file authenticity cannot be established. Continue independent UI design using labeled fixtures, not fake production records.

### P1 — Workspace entry and role journeys
Dedicated Robot Build route/layout; existing project summary entry and preserved deep links; build context/chooser; four views; empty/permission/loading states; setup draft; scoped queues over existing records. Prototype desktop/phone/RTL and new-student flow before extending transaction forms. No replacement of existing authority.

Gate: existing populated builds open without re-import, old links and login return pass, unsaved switching safe, role-specific entrances work. UI verification includes no assignment, multiple/archived build, missing reviewer and failed request. Do not ship a sole entrance that hides existing capabilities.

### P2 — Usable released work packages
Reviewed metadata/mappings; immutable export/upload package; explicit scoped file access; model/part linkage; guided Prepare work over existing tasks/reviews; student instructions/current operation; contextual Knowledge/Academy/CAD/Assist links. Keep grants separate from UI discovery.

Gate: real representative part and drawing refer to the same revision/configuration; unauthorized downloads denied; missing instructions block affected release; ordinary bought part stays simple; no duplicate task/course enrollment or automatic AI request.

### P3 — Production, materials and purchasing
Compatible lots and disposition extension; operation dependencies/rework; raw-material allocations and actual usage; destination allocation; stock-assembly transformation; shared printing resources/ownership; procurement coverage/pack/partial fulfillment; one reporting/inspection route with receipts.

Gate: combined existing schema integration passes quantity/permission/retry/concurrency cases. Confirm legacy whole-job semantics remain. Do not substitute front-end-only checks for atomic ledger rules. External order/export actions must have explicit outcomes and retry boundaries.

### P4 — Change review and trustworthy progress
Queued refresh/webhooks if supported with fallback checks, freshness and failures; semantic change set; affected work/stock/orders/installed evidence; scoped decisions/holds; compatibility approval; complete readiness aggregates and blockers. No automatic revision rewrite.

Gate: out-of-order events, missing source, quota failure, CAD change mid-job and old cached submission are handled; unaffected work stays usable; installed and candidate states remain distinct; no fake complete counts from truncated queries.

### P5 — Reconciliation and system handoffs
Existing installed/WIP/order adoption; links to maintenance assets/batteries as applicable; existing tests/trials/reviews; single linked issue and archive protection; pit replacement; learning evidence reuse; contribution/calendar boundaries; precise sourcing and return navigation. Preserve independent authorization policies.

Gate: walkthrough from existing physical robot → maintenance fault → issue → replacement sourcing/build → inspection → installation → retest → verified closure, with no duplicate issue/task/stock/finance effects. Existing student qualifications and attendance are unchanged unless explicitly acted on through their own flow.

### P6 — Release acceptance and handover
Full focused regression/CI; supported-device acceptance; live provider read tests and authorized pilot; migration rehearsal and recovery; feature rollout/monitoring; APK build and device verification where required. Record exact version/evidence and remaining physical requirements. Feature toggles never bypass server gates. Keep unfinished features explicitly marked, not advertised as complete.

Gate: all required traceability rows have evidence, known exceptions are named, no unresolved critical integrity/access issue, migration/schema checks pass, deployment source matches tested release and post-release checks pass. A production pilot must not create fake student qualifications, purchases or physical evidence. If real pilot input is unavailable, mark it outstanding rather than manufacture acceptance.

## 10. Regression inventory and test execution

Baseline scripts exist under apps/dashboard_web/scripts. Inspect each script's prerequisites and side effects before execution. `npm run build` in apps/dashboard_web runs TypeScript plus Vite. No tests are represented as executed by creation of this document.

Mandatory touched-domain suites:
- test-robot-build-bom.mjs, test-robot-build-bom-storage.mjs, test-robot-build-jobs.mjs, test-robot-build-manual.mjs.
- test-robot-build-stock.mjs, test-robot-build-reconciliation.mjs, test-robot-build-manufacturing.mjs, test-robot-build-operations.mjs, test-robot-build-purchase-reuse.mjs, test-robot-build-installation.mjs, test-robot-build-integration.mjs.
- test-onshape-handler.mjs, test-onshape-security.mjs, test-onshape-storage.mjs, test-onshape-snapshot.mjs, test-cad-inspection.mjs, test-cad-review.mjs.
- test-engineering-records.mjs and existing actual-schema engineering/review chain acceptance.
- test-fundraising.mjs and verify-finance-receiving.mjs for shared stock/purchase changes.

Relevant cross-system suites: test-team-learning.mjs, test-knowledge-academy.mjs, test-private-repositories.mjs, test-browser-attendance.mjs, verify-mobile-notification-stability.mjs; run when touching their contracts and in final release regression as applicable. Existing simulator/VR tests must remain green when shared navigation/viewer code changes; physical headset validation is separate. Discover current CI and device scripts rather than invent command names. Add behavioral tests for uncovered requirements below; source-string assertions alone do not validate workflows.

| Test ID | Scenario | Required result |
|---|---|---|
| A01 | Old populated project and CAD links | Same records open in correct build; no re-import |
| A02 | Two builds, draft, Back, login return | No context or quantity leakage |
| A03 | Nested/configured/suppressed/overlapping sources; large BOM | Correct complete quantities independent of geometry/paging |
| A04 | Missing or wrong-revision drawing | Affected release blocked with actionable message |
| A05 | Student, leader without stock right, reviewer, inactive/revoked member | Correct scoped actions and denied direct mutations/downloads |
| A06 | 10 submitted: 6 accepted/2 rework/1 scrap/1 pending | Six usable; conserved quantities after reinspection/replacement |
| A07 | Two workers and fundraising contend for last stock | No negative/double consumption; useful conflict response |
| A08 | Retry after lost response; altered retry; stale revision | Original receipt or explicit conflict, never duplicate effects |
| A09 | Pack buy/partial receipt/cancel/return/existing order | Exact coverage; no duplicate purchase/expense |
| A10 | Shared batches, stock assembly, wrong kit part | Allocation conserved; parent/children not double available; wrong identity blocked |
| A11 | CAD edit during machining and after installation | Preserved release/history; scoped leader decision/retest |
| A12 | Notification duplicate/out-of-order/provider revocation | Last good data kept; bounded retry; no false freshness |
| A13 | Existing installed robot and old evidence | No fabricated warehouse history or new-configuration pass |
| A14 | Maintenance/pit removal and replacement | Same physical identity, disposition and retest across views |
| A15 | Existing course/certificate and work evidence | No duplicate learning, no machine authority by quiz alone |
| A16 | Reminder acknowledgement, absence, task contribution | No false job completion or inflated reporting |
| A17 | Linked issue deletion and failed repair | Retained evidence and required verification |
| A18 | Wrong-repository log, simulator result, AI budget/access | Provenance/authority preserved; no automatic private disclosure |
| A19 | Season switch and source-reference update | Historical release preserved; relevant review flagged |
| A20 | File/DB restore and older client | Restored traceability; no server-gate bypass |
| A21 | English/Hebrew phone, desktop, fullscreen, keyboard/zoom | Readable, aligned, accessible, primary action unobscured |
| A22 | Android physical device and browser downloads/login links | Correct flow and version; absence of testing reported honestly |

Run targeted tests after meaningful changes; broaden at integration/release gates. Do not repeatedly run expensive unrelated suites without changes or evidence justifying it. CI failures are investigated, not muted or bypassed. New tests must validate behavior/invariants, not mirror implementation.

## 11. Migration, rollback and release procedure

1. Record actual production schema/RPC/trigger versions and data counts; use read-only inspection first. Separate actual schema from historical SQL.
2. Design additive migrations and explicit old→new mapping. Preserve historical whole-job output and asset IDs. Mark uncertain matches unresolved. No destructive automatic deduplication.
3. Rehearse on appropriate test data/QA including legacy records and concurrent mutations. Verify migration rerun, grants/RLS, old client calls, shared stock trigger interactions and failure rollback.
4. Establish approved backup and tested restore of relational data plus protected files before consequential migrations. Do not claim recovery proved by an untested backup. Never store keys/secrets in docs.
5. Deploy server-compatible changes before dependent clients where needed. Gate new writes until schema and authorized behavior are verified. Capture migration checksum and exact tested source.
6. Preview/QA acceptance, focused production preflight, then authorized deployment. No role-default expansion or private sharing assumed from feature implementation.
7. Post-release verify entry/auth/read/source freshness and authorized representative interactions without fake physical transactions. Observe errors, retry queues, synchronization age and invariant alerts. Define operational thresholds from measured baseline, not fabricated SLAs.
8. On regression, disable new entry/write paths or revert compatible frontend/connector as appropriate. Do not drop audit/stock history. Database repair may require a forward corrective migration; document which rollback cannot undo real physical/financial activity.

## 12. Required milestone record

For each package record: date; G/S/A IDs; changed files/RPCs/migrations; exact commit and preview/release identifiers; schema preflight; tests with results; screenshots/observed role journeys; permissions/grants affected; migration/rollback notes; provider/device/physical limits; unresolved items with next action. Never paste credentials, private source payloads or unnecessary personal data.

Current execution ledger — reconciled against pushed source `698bea9`. Historical checkpoint entries do not override this table. All expanded work remains undeployed. Recorded production baseline: `d0e6231` / implementation `589943e`; reading this ledger is not a new live verification.

| Package | Status | Evidence / next action |
|---|---|---|
| P0 | In progress | Live function fingerprints and constraints captured; 34 function bodies matched, dynamic review-context body inspected. Provider/recovery gates remain. See implementation checkpoint. |
| P1 | In progress, local only | Direct entry, scope setup, role queues, guided preparation, accessible leave dialog and Back guard implemented. Full role/auth/device acceptance and all-form draft contract remain. |
| P2 | In progress, local only | Observed metadata and immutable uploaded files/scoped downloads verified in isolated tests. Provider association/export and live file acceptance remain. |
| P3 | In progress, local only | Reservations, partial lots, exact kits, ordered operations, shared equipment, pack purchasing and whole stock-assembly receipt tested. Material specification/dimension matching and measured same-unit remnants now pass actual-schema tests. Partial assembly output and independently inspected disassembly/recovery now pass actual-schema tests. Scoped substitutions and integrated acceptance remain. |
| P4 | In progress, local only | Imported revision comparison, source freshness, separate property observations, downstream holds, linked impact view and subsystem coverage implemented. Approved downstream dispositions/compatibility and complete source-failure/readiness acceptance remain. Impact visibility is not disposition approval. |
| P5 | In progress, local only | Maintenance links, protected repair/retest closure, existing-installation and initial WIP adoption tested. Remaining learning/code/simulator/pit handoffs and complete existing-robot repair journey acceptance remain. |
| P6 | In progress, not released | TypeScript and combined migration rehearsal (latest two additions require final rerun) passed. Existing recovery schema reconstructed, but current data/cloud-file recovery is unproven. Final-source CI/regression, live provider/file/role acceptance, deployment and production verification remain. APK/device evidence is separate. |

Execution order: finish functional gaps; validate the connected lifecycle and failures; complete provider/recovery/permission acceptance; deploy database, backend and frontend in dependency order; verify production and record exact evidence. Existing authorization is sufficient. No new paid recovery project is authorized. Do not narrow G/S/A scope or equate a commit with completion.

## 13. Completion definition

Execution evidence and unresolved work: [ROBOT_BUILD_IMPLEMENTATION_20261009.md](ROBOT_BUILD_IMPLEMENTATION_20261009.md). No new production release from this checkpoint.

Complete means required G01–G17 and S01–S11 are implemented or have an explicit user-approved scope disposition, mapped A01–A22 acceptance has evidence, required regressions/CI and deployment checks pass, and device/provider/physical boundaries are reported accurately. Optional later conveniences remain explicitly outside this milestone. Do not call a phase complete because the budget or turn is ending.

The initial design, two challenge passes, subsequent discoverability/direct-entry reviews and system integration findings are incorporated by reference and traceability above. Before each package, check its dependencies and referenced details; after it, reconcile implementation back to this ledger. New discoveries extend the plan with evidence, rather than disappearing into chat history.

### Partial-lot execution evidence — 9 October
P3 partial QC is implemented and locally tested, including holds, conserved splits, independent child inspection, partial receipt/issue and replacement after scrap. Four new migrations passed a combined isolated rehearsal and rerun. P3 as a whole and production acceptance remain open. See implementation checkpoint for exact evidence and remaining gates.

### Controlled files execution evidence — 9 October
P2 manual uploaded-file path implemented with immutable manifests, server-calculated fingerprints, explicit worker scope and release-bound downloads. SQL/handler/synthetic UI acceptance is recorded in the implementation checkpoint. Automatic provider export/drawing association, production storage recovery and physical phone acceptance are not certified.

# Robot Build: system-wide pre-development integration review

Execution authority: [ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md](ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md); S01–S11 below are mapped there to delivery packages and acceptance gates.

Status: design review only, 9 October 2026. No runtime, production data, permissions or deployments changed. Supplements ROBOT_BUILD_COMPLETE_DESIGN_20261009.md. Scope is how the proposed workspace affects the existing system, not certification of every feature or a new full live acceptance test.

Evidence: current route inventory in src/main.tsx; START_NEXT_SESSION.md and WORKING_EXPECTATIONS.md; Robot Build, practical learning/trials, Knowledge/Academy, fundraising and simulator release records; source inspection of ProjectBuildWork, ProjectTaskReview, ProjectConfigurations, HomeActionInbox, FrcWorkPage, RobotIssuesPage, RobotMaintenancePage, RobotReliabilityPage and FrcOperationsPage. Deployment statements rely on recorded release evidence. Older release restrictions are superseded where the handover records later changes, particularly dedicated fundraising permissions.

## Findings that change the integration design

### S01 — Physical identity crosses existing registries (required before installation integration)

Robot Build uses project_physical_assets, project_robot_configurations and accepted batch/kit records. Maintenance uses robot_components, component events and batteries. Reliability has its own plans/runs and readiness sessions. These are different record types and cannot be treated as automatically synchronized.

Add explicit reviewed links between tracked service components and the relevant physical asset/installed part or batch. Preserve old IDs and histories. Do not merge by name or part number alone. Inventory item = stock type; batch = physical supply; service component = individually maintained asset; configuration = what was installed at a time. Many routine fasteners need only batch identity; motors/controllers may have individual serials. Historical unlinked records remain explicitly unlinked until reconciled, never silently assigned to the active robot.

A replacement initiated from either Maintenance or Robot Build uses one coordinated operation and preserves both histories. Inspect the actual deployed schema/triggers before implementation; UI calls alone cannot establish backend synchronization. Source risk requiring acceptance: maintenance currently presents removed components as spare in its client update path, whereas Robot Build requires disposition before reuse. Unify semantics so removal never automatically certifies stock as usable.

### S02 — Existing readiness/test views must share evidence (required)

Do not create another test-results store in Assembly & tests. Link existing reliability plans/runs, shared trial sessions and engineering review evidence with exact physical configuration, software reference when applicable and evidence type. Old test records lacking a configuration remain valid historical observations but cannot silently prove the new build passed.

Robot Build reports build/installation readiness. Reliability owns measured tests and applicable readiness evidence. Competition/pit views add event packing, battery and unresolved fault context. Clearly distinguish those meanings; none may overwrite the others with a generic ready flag. Failed required test or relevant replacement surfaces an actionable hold/retest without deleting prior passing evidence. Statistical comparisons exclude incompatible configurations/conditions unless explicitly compared with differences shown.

### S03 — Issues, repairs and evidence retention (required)

Reuse Robot Issues and existing project work rather than opening independent CAD/build/maintenance tickets. A job blocker links one issue with affected part, lot, configuration and task. CAD suggestions become issues only through an explicit human action; preserve private-source boundaries. Resolution and verified repair are separate when a retest is required.

Source exposes an administrator permanent-delete action in RobotIssuesPage; do not assume it is safe for newly referenced release/test evidence. Enforce retention/archive or audited tombstone behavior for linked issues and files, including direct backend mutations. Inspect existing constraints before claiming an actual deletion defect. A reference retained in a build must not point to silently erased evidence.

### S04 — Shared printing resources without merging business workflows (required)

Fundraising already has product recipes, printing results, filament reservations, finished sales stock and finance posting. Robot Build should use the same inventory availability and, where a shared printer queue is added, the same resource availability. A manufacturing job has one owning workflow; avoid creating both a fundraising print job and a build job that each deduct filament for the same print.

A robot part is not automatically a fundraising product and has no sale-income action. A purchased filament spool remains one stock record. Raw material reservation extensions must preserve fundraising's current reservation floor and permissions. Resource contention should show a resolvable schedule conflict; stock availability alone is not printer availability. Automatic printer control/telemetry remains outside delivered scope.

### S05 — Purchase links and finance remain authoritative (required)

Existing purchase editing/cancellation, approval, partial chains, receiving and finance are retained. Build shortages, maintenance spare requests and ordinary inventory requests need shared linked coverage checks before creating another request. Procurement matching is reviewed, never inferred solely from similar names.

Build shows estimated/committed/received information according to permission. It must not post a second expense when material is consumed or output accepted. No fundraising income for robot manufacture. Cancelling build demand releases its allocation, not someone else's order; ordered quantities require buyer disposition. Receipts fulfill only their eligible linked demand, not every matching part automatically.

### S06 — Home and Work already aggregate responsibility (required)

HomeActionInbox and Work are existing cross-system entry points. Add build-aware destinations and labels to existing task/review sources, not a second notification inbox. Current source distinguishes reminder completion from task status; preserve it. Acknowledge/snooze cannot complete manufacturing or accept QC.

Work currently uses bounded project/task fetches: new readiness totals must use complete authorized aggregate queries, not infer totals from the first loaded page. UI pagination and total counts must agree. Deduplicate one task displayed in Project, Workshop and Home. Preserve collaborators, reassignment, absence and review authority. Add explicit coverage/error state rather than interpreting a failed query as no work.

### S07 — Learning connects to operations without duplicate courses (required connection; preserve delivered learning)

Academy, official certificate verification, practical review and existing course-source links are already delivered. Reuse their qualification state. Attach relevant learning to operation templates, reuse approved prior completion and offer a return to the job. Do not auto-enroll everybody or force a completed official theory course again.

Practical machine authority is explicit and scoped; certificate/quiz completion does not grant it. Approved work evidence may be offered for a relevant practical submission with context and permission, but manufacturing completion does not automatically award a qualification. Published reference robots remain learning examples, not G3's released designs.

### S08 — Software, logs, simulator and AI need precise context (required boundaries; deeper automation separate)

Private repository access and grounded selected-code Assist are already delivered. Build links the intended repository/commit; code present on GitHub does not prove it was deployed. Test configuration records actual software/calibration references. Preserve the distinction among season, practice and offseason repositories and the supplied log's provenance.

Simulator/VR and autonomous scaffold export are already delivered with documented limitations. CAD import does not automatically create calibrated collision, inertia, drivetrain, camera, intake or shooter behavior. Build geometry changes can flag an explicitly linked simulation profile as needing review; they must not overwrite or invent physical parameters. Simulated results remain distinct from real verification. Repository-bound executable autonomous integration and measured calibration remain separate outstanding work.

CAD Mentor and G3 Assist receive only authorized selected evidence, with visible part/build/revision context and referenced sources. A Robot Build permission is not blanket permission to send private CAD to AI. Preserve budgets, disclosure boundaries and no automatic paid AI call on synchronization. AI recommendations do not release work or certify design correctness.

### S09 — Calendar, attendance, member roles and reporting (required boundaries)

Calendar dates can inform job due dates and supervised work plans; meeting cancellation or an absence can prompt reassignment but cannot silently change approvals or fail a student. Checked-in attendance is not a qualification or permission, and offsite work must not be impossible solely because someone is not checked in.

Contribution/management reports count the existing task once; adding operation events must not inflate task completion or compare students by raw part counts. Preserve separate attendance, learning and work metrics. Role names alone do not imply inventory/finance/CAD permission; setup can identify missing responsibility but only existing authorized administration grants it. UI labels must not imply every reviewer must be a mentor if existing policy permits another qualified role.

### S10 — Competition and pit handoff (required continuity, no competition redesign)

Existing competition, scouting, assignments, pit/packing and maintenance views remain. Packing links the correct robot/spares where tracked, and a packed item is not a new inventory issue automatically. Pit replacement opens the same physical part/configuration flow. Readiness names event, robot and evidence scope; scouting observations do not automatically change internal build configuration or quality disposition.

### S11 — Seasons, knowledge, files and app lifecycle (required regression contract)

Season setup/official-source checks are delivered and remain separate from build setup. A build's season/rules reference is explicit; changing the global selected season must not rewrite historical releases, evidence or simulator configuration. Knowledge remains the reference catalogue, Academy the learning flow; no third article library in Robot Build. Link approved reference revisions and flag affected instructions for review when a relevant source changes, rather than automatically rewriting them.

Maintain one Settings language preference. Web/APK deep links, login return, protected attachments, file retention, backups and prior client compatibility require acceptance. New server gates cannot depend on a new client being installed. Existing APK status remains unchanged by design work; rebuild and physical acceptance are delivery tasks. Admin reports/media/feedback/announcements/profile and ordinary scouting need no feature rewrite for Robot Build; test shared navigation, access and overlays for regressions.

## System coverage disposition

| Existing area | Decision |
|---|---|
| Projects, tasks, engineering reviews | Extend presentation and linking; retain authority |
| Home, Work, notifications, updates | Reuse action sources and contextual destinations; deduplicate |
| CAD Mentor, Onshape | Add released scoped access/change handoff; preserve private working data |
| Robot Build | New direct workspace over existing and extended records |
| Inventory, tools, purchasing, finance | Shared allocations/coverage; no parallel ledgers |
| Fundraising & Production | Preserve business flow; coordinate stock/resources |
| Maintenance, batteries, issues | Explicit identity/event links and evidence retention |
| Reliability, shared trials, readiness | Reuse results with configuration/conditions; no new competing test store |
| Academy, official training, robot learning lab | Reuse learning/qualification and reference examples |
| Knowledge, season planning/source checks | Preserve; contextual versioned references |
| Software Mentor, private repositories, Assist | Authorized source context; code and deployment remain distinct |
| Field Studio, simulation, VR, autonomous plans | Preserve; explicit profile compatibility, no inferred hardware calibration |
| Competition, pit, packing, scouting, analysis | Link relevant actual robot/spares; no unrelated redesign |
| Calendar, attendance, absences, assignments | Availability context; no manufactured progress or permission |
| Contribution and attendance reports | Existing semantics; no double-counted task/operation output |
| Members, permissions, settings, profile | Existing authority/language; lifecycle and role regression checks |
| Media, feedback, announcements | Preserve; no required new workflow from this design |
| APK, authentication, recovery/files | Cross-client compatibility and acceptance; no release claim |

## Development ordering and acceptance

Before new UI writes installation/test/stock state, define shared identity links, operation ownership and evidence contracts (S01–S05). Build screens can be prototyped in parallel conceptually, but no additional agents or implementation are implied. Next implement coherent entry, action and role flows (S06–S07/S09), then contextual change/AI/simulation boundaries (S08/S11) and pit continuity (S10). These refine existing delivery packages rather than create eleven additional phases.

Cross-system acceptance must cover: maintenance removal/replacement reflected in build; old test not certifying new configuration; robot print competing with fundraising for last material; duplicate shortage from maintenance and build; completed course reused without bypassing practical authority; Home acknowledgement not completing job; failure issue and evidence retained; pit replacement requiring retest; cancelled workshop not erasing work; wrong-repository log rejected as evidence; season switch preserving release; old APK unable to bypass gates.

Conclusion: another menu redesign is not needed. The significant remaining work is consistent physical identity, quantities, evidence and responsibilities across already existing features. These are identified integration risks/requirements from code and records, not claims that every listed case currently fails in production. Verify deployed schemas and real journeys during implementation before applying migrations or marking acceptance passed.

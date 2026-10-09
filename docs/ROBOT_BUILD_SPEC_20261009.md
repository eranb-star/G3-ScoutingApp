# Robot Build — implementation contract

Status: integrated Robot Build workflow deployed 9 October 2026. See ROBOT_BUILD_RELEASE_20261009.md for exact evidence and operational boundaries. Historical increments below are retained as history.

## Integration and ownership

Extend existing team_projects, project_tasks, engineering records (requirements/interfaces/decisions), review gates, physical assets and designed/as-built/as-installed configurations. Do not create parallel assignment, approval, inventory, purchasing or finance systems. Onshape owns design geometry; immutable released build records own manufacturing instructions. Manufacturing events own accepted quantities; task completion must not bypass required acceptance. Existing configured test evidence owns physical verification.

Current CAD access remains private to the connecting admin. Project sharing needs explicit scoped grants and server enforcement. A task link must not broaden access to CAD or finance. No Onshape edits, additional AI disclosure or production permission changes are authorized implicitly by this implementation.

## Flow

Existing project/requirement → reconcile existing work → design/prototype → review/release → allocate/make/buy → inspect → kit/assemble → test → maintain.

Students enter through existing personal work: ready, continuing, waiting and response needed. Leaders use the project build view. Preserve project/subsystem/part/revision context when opening CAD, purchases, learning or Assist. Prefer one next action with advanced details progressively disclosed. EN/HE via existing Settings; mobile/RTL, persistent save receipts and explicit pending/error states required.

## Required records and invariants

- Structural assembly import independent of geometry limits. Immutable source document/element/configuration/microversion and occurrence paths. Never infer completeness from rendered meshes.
- Stable reviewed part mappings; no automatic name-only inventory matches. Quantities deduplicated across overlapping source scopes. Repeated instances count; suppression excludes descendants. Make/buy boundaries prevent exploding purchased assemblies into manufacturing demand.
- Released BOM/instruction/file snapshot separate from moving CAD. No automatic rewrite of released jobs. Manual non-CAD requirements supported with provenance.
- Initial reconciliation of existing stock/purchases/manufactured/installed items; unknown history stays unverified.
- Jobs tied to existing tasks, process templates, operations, quantities and locations. Batch allocation across demands; serial tracking only where required. Prototype results never automatically production accepted.
- Stock reservations/issues/consumption/returns/scrap and accepted outputs through the existing ledger. Cancellation reconciles allocations. Finance purchase and consumption never double-expense.
- Review severity and authority use existing gates. Reviewer fallback, resource/supervision blocks, corrections and reassignment retain audit history.
- Assembly kits and installation link accepted batches to existing physical configurations; replacement creates a new installed revision and affected retest actions.
- A single linked issue journey across blocker, CAD finding, rework and test failure. Preserve original evidence and closure verification.
- Revision impact targets changed requirements/parts/interfaces and downstream work; historical acceptance remains evidence, not an automatic pass for a new revision.
- Sensitive transitions require server confirmation; idempotency and optimistic revisions. Offline notes may remain drafts, never falsely saved transactions. Provider failure retains last valid snapshot with freshness warning.

## Acceptance journeys

1. Student opens assigned job from Home, completes operations and submits inspection without duplicate task entry.
2. Repeated part across nested assemblies counts correctly; overlapping roots cannot double demand.
3. Partial import cannot release; >60 unique parts/>1000 instances never truncate structural quantities to viewer limits.
4. Purchased assembly stops expansion at reviewed make/buy boundary; manual wiring requirements remain visible.
5. CAD change while manufacturing preserves released drawing; leader resolves impacted quantities/jobs.
6. Concurrent/retried updates do not duplicate stock, accepted quantity or purchases; stale decisions rejected.
7. Partial failure/rework/return correction remains traceable and maintains quantity conservation.
8. Receipt fulfills linked shortage without student access to private finance details.
9. Existing built robot reconciliation does not fabricate history or recreate fulfilled demand.
10. Installation/test/repair references exact physical configuration; changed configuration requires appropriate rechecks.
11. Role access, revoked connection, empty/error/large-model states, phone EN/HE and supported APK verified separately.

## Implementation progress (historical increments; latest status below)

- Structural extraction module started; no geometry dependency, explicit unresolved coverage, pinned part keys and occurrence paths. This is a candidate leaf-parts list, NOT a released manufacturing BOM: metadata mapping, make/buy boundaries, source-scope reconciliation and provider acceptance remain required.
- Pending: project database/RPC lifecycle, task coupling, inventory allocation integration, releases/inspection/installation, team grants, complete UI journeys and deployment. Do not describe these as implemented.
- Added private `bom` connector action using existing active-admin/connection/source/snapshot boundaries, and EN/HE Assembly parts tab. No new grants or database mutations. Loading, unsupported Part Studio, empty, incomplete and retry states; no release button.
- Local structural tests, existing CAD review/security/snapshot/handler tests, TypeScript and Vite build passed. Existing bundle-size warnings remain. Handler test loader updated for the new module and verifies unauthenticated/member BOM denial. CI includes structural tests. Live provider BOM comparison and visual phone/browser acceptance not yet performed. No production deployment or APK build.

### Project task coupling increment (9 October)

Implemented locally: additive robot_build_jobs/progress migration and project-level EN/HE manufacturing panel. Jobs attach to existing QC tasks and pin an existing approved released_for_manufacturing submission in the same project. Creation retries return the existing identical job; conflicting setup is rejected. Owners/managers report absolute completed counts with optimistic revisions and request IDs. Corrections need reasons; submitted inspection quantities cannot be changed without reopening. Existing task completion additionally requires all quantities, a current pinned release and accepted QC at the same revision. Existing task triggers still execute atomically; no new approval engine.

Job records and audit cannot be directly modified by authenticated clients. Task deletion with manufacturing history is deliberately restricted by foreign keys; friendly deletion UI remains pending. Project-wide metadata follows existing task access; no private CAD payload is copied into it. No stock is created/consumed by this increment. Reported quantities are NOT accepted inventory. Input instructions are manually supplied and must not be described as an automatically released CAD drawing package.

SQL fixture tests cover rerun, retry/conflict, stale update, worker scope, invalid quantities, correction, release invalidation, QC gating, direct-write denial, atomic rollback and history deletion restriction. Existing engineering regression suite, TypeScript and Vite passed independently. Full combined real-schema lifecycle and visual acceptance remain outstanding. CI includes SQL tests. Migration NOT applied to production; source branch only. Remaining: BOM-to-job reviewed mappings/scope/make-buy reconciliation, stock/purchase integration, complete operation/rework/installation lifecycle, shared CAD permissions and release acceptance.

### BOM / stock integration (9 October, local only)

Supersedes earlier statements that all mapping/stock work is pending:

- Server recomputes a complete structural import from the owned immutable snapshot. Purchased subassembly boundaries stop child expansion; invalid or contradictory boundaries reject import. Existing reviewed imports cannot be silently replaced with different boundaries.
- Private project BOM drafts, explicit share of parts metadata, immutable imported quantities/identities, reviewed make/buy/reuse/exclude decisions, and links to existing manufacturing jobs. Sharing does not expose CAD geometry, credentials or AI reviews. Only the importing active admin can share; scoped project managers can review shared rows.
- Shared piece-counted buy/reuse lines support reservations, release, issue and return through existing inventory and stock movements. Immutable events, retries and optimistic allocation revisions; project plus inventory permissions required. Active printing and build reservations share the stock floor. Issuing is not installation, quality acceptance or financial expenditure.
- Buy lines create existing purchase requests only for uncovered quantities after allocations, available stock and linked purchase/remainder chains. Existing approval/receiving/finance flows remain authoritative. Identity guards prevent repurposing linked requests or detaching their remainder chains. Requirements with purchasing history retain their part/quantity; changes need a new reviewed requirement.
- Project work expands to the parent card width. EN/HE layouts, persistent progress receipt, existing task/inspection navigation, source-review and stock controls. Purchase-only users start on the purchase action.

Migration order after existing production prerequisites: `robot_build_jobs_20261009.sql`, `robot_build_bom_20261009.sql`, `robot_build_stock_20261009.sql`, `robot_build_manual_20261009.sql`. Stock migration assumes existing fundraising reservation trigger and partial purchasing columns. Manual requirements are project-shared, created by scoped managers, retain original quantities/source reasons and enter the same sourcing review; they are piece-counted requirements, not raw material recipes. Retry, unauthorized creation, provenance preservation and exclusion tests pass. No migration has been applied live. No source/code uploaded to AI. No new runtime permissions enabled.

Validation: structural cases, actual connector handler authorization, jobs/BOM/stock SQL suites, TypeScript and Vite production build passed. New `test-robot-build-integration.mjs` loads the existing engineering migration/test chain and verifies actual release approval, partial/full reporting, physical configuration-backed QC, automatic task completion and changed-release denial. Stock tests cover retry/stale writes, printing conflict, issue/return conservation, partial purchase/remainder coverage and identity protection. All new tests added to CI; remote CI not yet run. Existing large-bundle warnings remain. Synthetic EN/HE browser review passed; Hebrew DOM width and scroll width both 304px. Screenshot: `staging/robot-build-mobile-he-20261009.png`. This is isolated UI evidence, not live provider or production acceptance.

### Previous remaining scope — superseded by lifecycle implementation below

1. Cross-root overlap reconciliation and superseded BOM change impact. Separate imported lists are currently not summed automatically, but that alone does not prevent duplicate work across sources. Add reviewed scope and demand identity before calling this a complete BOM system.
2. Initial reconciliation of existing stock, purchased, built and installed quantities without fabricating history. Manual non-CAD piece-counted requirements are now implemented; measurable raw-material requirements are still pending.
3. Process/operation templates, partial rejection/scrap/rework, raw-material recipes/consumption, accepted-output stock and batch allocation. Current absolute progress plus whole-job QC does not implement these.
4. Kits and exact accepted-batch installation links to existing physical configurations, replacement/retest actions and linked issue closure. Existing engineering records provide configuration/testing, but build quantities are not yet connected to them.
5. Complete student next-action journey and manager setup, actionable localized errors, friendly history-protected task deletion, source freshness/change explanations, purchase status and exact request navigation. Current setup still requires separate existing release/QC configuration.
6. Real Onshape BOM comparison, combined inventory/purchasing/finance production-schema acceptance, cancellation/receipt/revision scenarios, broader phone/browser and APK regression acceptance, additive deployment with green CI and documented live verification.

The user has already authorized this remaining development. Do not ask whether to continue, call the whole feature complete, or repeat these implemented increments as new proposals.

### Integrated lifecycle implementation — 9 October, release acceptance underway

Implemented after the historical list above:
- Demand overlap review detects logical parts across revisions and parent/child assembly sources. Explicit independent/additional/covered decisions block execution until current. Covered demand cannot be restored silently or have its covering requirement reduced. Existing work/history remains immutable; automatic geometric equivalence is not inferred.
- Verified existing stock enters accepted batches through an existing physical QC task without increasing inventory. Existing open purchase requests can be adopted without a duplicate order (original requests without partial-order children; previously received stock follows stock reconciliation).
- Optional editable operation templates (cutting, printing, assembly), per-step partial counts, immutable work events and final quantity gating. Scrap reduces finished/operation counts; replacement work repeats its operations. Released instructions and existing supervision/review requirements remain authoritative.
- Raw materials are planned in the inventory unit, with audited plan changes and actual consumption/return through the stock ledger. Plans do not reserve raw materials. Both active printing and build allocations protect availability. Finished stock is received once, only after the existing physical QC and exact released revision pass.
- Accepted batches enter installation kits through atomic issue/return. Installation requires an existing passed installation review referencing the exact as-installed configuration. Replacements preserve the old kit and require an open robot-verification task; removed pieces are not automatically returned to usable stock.
- Project workflow separates Parts & sourcing, Manufacture & inspect, Assemble & install. Existing task/review links remain the entry to assignment, evidence, blockers and approvals. History-protected deletion has an actionable archive message. BOM reads paginate independently of viewer limits.

Migration order: jobs, bom, stock, manual, reconciliation, manufacturing, installation, operations, purchase_reuse (all `robot_build_<name>_20261009.sql`). Nine additive migrations; do not omit the final operations/purchase reuse files. No role-permission defaults, CAD geometry visibility, finance approvals or AI disclosures change. Imported CAD metadata is private until its owner explicitly shares it with its existing project.

Validation so far: full SQL fixture lifecycle and actual existing engineering release → manufacturing → physical QC → stock → kit → exact installation chain pass. Tests cover retries, stale writes, protected stock, scrap, existing-stock conservation, replacement retest requirement and existing-purchase adoption. TypeScript and Vite pass; existing bundle-size warnings remain. Production schema preflight of all nine migrations passed inside a rollback-only transaction. EN/HE synthetic browser flow checked at phone width (client/scroll both 375px); proof `staging/robot-build-lifecycle-he-20261009.png`. These are not claims of live operational acceptance or physical robot verification.

Release checks subsequently completed: nine migrations applied, connector/frontend deployed, CI 300/301 passed, real rake assembly structural quantities and private project draft persistence verified. See ROBOT_BUILD_RELEASE_20261009.md. APK is still 2.3.1/code26 and has not been rebuilt or device-tested for Robot Build.

Operational boundaries: whole-job final QC is required before an output batch; split independent inspection lots into separate existing tasks/jobs. Parent/child scope warnings are conservative and require a leader decision. Purchased components need physical QC before becoming installation batches. Machine scheduling, native Onshape editing, inferred CAD geometry equivalence and automatic robot certification are not provided. Existing issue/dependency/review/configuration systems remain authoritative rather than being replaced by new approval engines.

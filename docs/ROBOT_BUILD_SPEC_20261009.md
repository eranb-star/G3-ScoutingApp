# Robot Build — implementation contract

Status: development authorized 9 October 2026. Not deployed. This document consolidates the agreed design; it is not a completion claim.

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

## Implementation progress

- Structural extraction module started; no geometry dependency, explicit unresolved coverage, pinned part keys and occurrence paths. This is a candidate leaf-parts list, NOT a released manufacturing BOM: metadata mapping, make/buy boundaries, source-scope reconciliation and provider acceptance remain required.
- Pending: project database/RPC lifecycle, task coupling, inventory allocation integration, releases/inspection/installation, team grants, complete UI journeys and deployment. Do not describe these as implemented.
- Added private `bom` connector action using existing active-admin/connection/source/snapshot boundaries, and EN/HE Assembly parts tab. No new grants or database mutations. Loading, unsupported Part Studio, empty, incomplete and retry states; no release button.
- Local structural tests, existing CAD review/security/snapshot/handler tests, TypeScript and Vite build passed. Existing bundle-size warnings remain. Handler test loader updated for the new module and verifies unauthenticated/member BOM denial. CI includes structural tests. Live provider BOM comparison and visual phone/browser acceptance not yet performed. No production deployment or APK build.

### Project task coupling increment (9 October)

Implemented locally: additive robot_build_jobs/progress migration and project-level EN/HE manufacturing panel. Jobs attach to existing QC tasks and pin an existing approved released_for_manufacturing submission in the same project. Creation retries return the existing identical job; conflicting setup is rejected. Owners/managers report absolute completed counts with optimistic revisions and request IDs. Corrections need reasons; submitted inspection quantities cannot be changed without reopening. Existing task completion additionally requires all quantities, a current pinned release and accepted QC at the same revision. Existing task triggers still execute atomically; no new approval engine.

Job records and audit cannot be directly modified by authenticated clients. Task deletion with manufacturing history is deliberately restricted by foreign keys; friendly deletion UI remains pending. Project-wide metadata follows existing task access; no private CAD payload is copied into it. No stock is created/consumed by this increment. Reported quantities are NOT accepted inventory. Input instructions are manually supplied and must not be described as an automatically released CAD drawing package.

SQL fixture tests cover rerun, retry/conflict, stale update, worker scope, invalid quantities, correction, release invalidation, QC gating, direct-write denial, atomic rollback and history deletion restriction. Existing engineering regression suite, TypeScript and Vite passed independently. Full combined real-schema lifecycle and visual acceptance remain outstanding. CI includes SQL tests. Migration NOT applied to production; source branch only. Remaining: BOM-to-job reviewed mappings/scope/make-buy reconciliation, stock/purchase integration, complete operation/rework/installation lifecycle, shared CAD permissions and release acceptance.

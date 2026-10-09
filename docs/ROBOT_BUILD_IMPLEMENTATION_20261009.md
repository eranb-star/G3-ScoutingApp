# Robot Build implementation checkpoint — 9 October 2026

Status: development in progress. Frontend and five additive SQL migrations are local, not a production release or completion of P0/P1/P3. Follow ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md for the complete scope. The user has authorized end-to-end execution; do not ask for another phase-selection approval.

## CAD metadata continuation — local, provider acceptance pending

- Added a server-only observation cache (cad_part_metadata_20261009.sql), bounded one-group-per-request collection at the exact document/microversion/element/configuration, and material/part-number/vendor/revision display. Purchased assembly boundaries are explicitly unsupported for this metadata path; missing fields stay unknown. Manufacturing process is never inferred.
- Import waits for the metadata check, embeds observed values/provenance in the existing source_identity, and preserves previously imported rows on retry. Existing imports are not silently backfilled. Metadata timestamps are separate from geometry identity. The cache retains its first observation; refreshing metadata independently of unchanged geometry remains part of the P4 change workflow.
- Browser verified the synthetic selected-part view displays material, part number, vendor, source revision and observation time (staging/robot-build-metadata-local-20261009.png). This is not live provider acceptance.
- Local tests passed: normalization/missing/ambiguous/revision mismatch, bounded resumed reads, purchased-boundary changes, immutable BOM metadata, cache denied to browser roles, existing connector authentication and security. The handler test loader was extended for the new module. These do not certify an actual Onshape response for team designs.
- Final Vite build passed after hold/split and metadata additions; existing large-chunk warning remains. TypeScript passed after the final metadata UI changes.
- Deployment now requires five new SQL files: workspace, material reservations, preparation, lots, CAD metadata, followed by the updated connector (including partMetadata.ts) and frontend. This is still local development, not a released or complete P2/P3 programme.

## Partial inspection continuation — local verification

- Added inspection lots using existing review tasks, physical evidence, stock batches and kit transactions. A job can receive and issue accepted pieces while other pieces await inspection or rework. Old whole-job receipt is blocked once partial lots exist; the legacy internal function is not callable by clients.
- Hold, return-to-inspection, scrap and conserved two-way splitting preserve parent history. Split children receive fresh checkpoints without inherited approval; held/rework state is retained. Accepted lots cannot be rewritten. Current release and QC are rechecked before stock issue.
- Added visible quantity totals, reviewer filtering, result forms, split explanation and protection for unfinished notes when switching lots. Existing parent job closeout approval remains required; no automated physical acceptance.
- Combined isolated database rehearsal applied workspace, reservations, preparation and lots twice on the real engineering fixture. It passed release → manufacturing → partial physical QC → stock → early kit issue, 6 accepted/2 rework/1 scrap/1 pending, replacement conservation, hold/split lineage, fresh child review, permissions and exact-once retries. This is not production restore or simultaneous-session stress testing.
- Browser confirmed rework/split actions and Stay/Discard note retention in synthetic data. Screenshot: staging/robot-build-lot-split-local-20261009.png. TypeScript passed after hold/split UI. Vite passed before hold/split additions and must run again before release.
- Fourth new migration: robot_build_lots_20261009.sql, after workspace/material-reservations/preparation and the existing nine migrations. None of these new increments is deployed. P2 metadata/packages, remaining P3 sourcing/material quantities, P4/P5 and full P6 remain.

## Latest continuation (supersedes earlier navigation-test status below)

- Added guided scope/type/year setup with optional existing physical asset, optimistic revision and immutable idempotent receipts (`robot_build_workspace_20261009.sql`). Build discovery includes scope/preparation records, so a new build needs neither a BOM nor an existing job to be found.
- Added My work / Team work / Inspections and selected-task review using the existing engineering review engine. Invalid queue values fall back to My work. No new role grants.
- Added preparation that creates existing release and manufacturing/inspection tasks, dependency and structured requirements together (`robot_build_preparation_20261009.sql`). Creating a job still requires an independently approved release. Optional reviewed shared BOM requirement selection binds the eventual job; legacy attachment remains.
- Added raw-material reserve/release and transactional consumption of the job's own reservation (`robot_build_material_reservations_20261009.sql`). The shared reservation function includes component allocations and raw material; active fundraising jobs retain their stock floor. No finance mutation.
- Replaced native confirm with an accessible dialog. Migrated the root router to createBrowserRouter/RouterProvider while retaining existing descendant routes/providers, allowing useBlocker to protect Browser Back and global SPA links. External/new-tab links are no longer incorrectly intercepted and passed to navigate. Full-document navigation retains beforeunload.
- Scope and preparation forms retain account/project-scoped session drafts. Explicit logout removes these new draft prefixes. Explicit discard clears the applicable draft. This does not implement durable drafts for every legacy form; coarse dirty tracking can still warn after a successful child form save.
- Fixed duplicate React sibling keys found in the preview. Existing work remains mounted during same-project refresh.

### Checks actually performed

- Local implementation commit: `1135779` on `codex/release-1-qa`. Not pushed or deployed.
- TypeScript and Vite production build passed after the final BOM selector addition. Existing large-chunk warning remains; this does not substitute for pending role/auth/device acceptance.
- New scope, preparation and raw-material-reservation database suites passed, including migration rerun, authorization, stale writes/idempotency, independent release approval, premature-start denial and shared print/build reservation floors. These use isolated database fixtures, not production writes or concurrent multi-connection stress tests.
- Existing Robot Build integration and operations suites passed: actual review chain from release through QC, stock, kit and exact physical installation; changed release invalidates completion. Existing fundraising suite passed.
- `verify-finance-receiving.mjs` still fails three source-text checks: old Attendance label, old personal-debt heading and old commitments heading. The affected FinanceAdminPage/WebPortalShell files have no changes in this continuation; inspection confirms renamed headings and existing calculations/commitment filters. Do not call this script green or silently weaken its checks.
- Isolated browser confirmed Back → Stay retains the typed manufacturing note; Back → Discard removes the selected task and reaches the previous route. A Work link also raised the dialog. Scope edits → Parts → Stay retained purpose/description. Evidence: `docs/staging/robot-build-scope-local-20261009.png` (synthetic local data).
- Live read-only preflight captured 35 function fingerprints and 61 constraint/trigger records in staging JSON files. 34 function bodies match repository definitions (including CRLF handling); the dynamic review-context definition was inspected separately. This is not a backup/restore rehearsal.

### Deployment order and remaining release gates

Existing nine production migrations remain unchanged. Before the dependent frontend, apply and verify the three new migrations in order: workspace, material reservations, preparation. Rehearse combined migration/rollback compatibility first. Do not deploy this client against a backend missing the new tables. Production backup/restore evidence, full role/auth/mobile/router regression, preview acceptance, CI/push and production verification are still outstanding. Nothing in this continuation is deployed, and no real stock, finance, student task, approval or CAD-sharing transaction was created.

The full programme remains incomplete: exact-revision source metadata/file packages and scoped student downloads (P2); partial QC lots/rework and remaining quantity workflows (P3); semantic CAD change impacts and readiness (P4); cross-registry maintenance/reliability handoffs (P5); full acceptance and production/device rollout (P6). Existing whole-job QC remains authoritative. Never label that partial-lot completion.

## Implemented locally

- Direct `/robot-build` member route and visible Work entrance, plus a link from existing project build work.
- Explicit project context in the URL. A single active existing build is selected automatically; multiple builds require a choice. An inaccessible explicit project never silently resolves to a different build. No projects, parts or tasks are copied or automatically created.
- Overview, Parts, Workshop, Assembly & tests, and a visible secondary Build details action. Existing physical asset/configuration registration is accessible to the same authorized managers.
- Compact parts rows with quantity and sourcing, selected-part details, existing stock/purchasing/review actions retained. Private parts sharing remains an explicit existing action; geometry is not implicitly shared.
- Existing workshop instructions open directly. Manufacturing and assembly RPCs and server authority are unchanged.
- Paginated project/task/job/approval reads, bounded identifier batches and stale-response protection. Closed projects route to historical records rather than expose new build writes.
- Initial form-change warnings for workspace switches, outgoing links, refresh and part selection. This is conservative warning behavior, NOT persisted drafts or the complete save/discard/stay contract.
- Responsive English/Hebrew layouts and isolated synthetic preview on port 4258.

## Actual production preflight

Read-only SQL in the authenticated production Supabase dashboard confirmed these eight tables and enabled RLS: project_physical_assets, project_robot_configurations, robot_build_jobs, robot_build_batches, robot_build_kits, robot_components, robot_test_runs, robot_trial_sessions.

Observed contracts include separate maintenance component and project asset registries; configuration identity_snapshot; whole-job build output with qc_submission_id; kit configuration/install/retirement/retest fields; separate legacy test runs and trial sessions. This is a column/RLS preflight only. It does not prove all constraints, function definitions, policies or restore readiness. No migration, new grant, private source disclosure or production data transaction was performed for this increment.

## Validation

- TypeScript build passed after the final code edit.
- Vite production bundle passed before the final form-warning wiring; repeat bundle before release. Existing large-chunk warning remains.
- Behavioral workspace helper tests passed: explicit/single/multiple/denied/archived context, 1,201-row pagination, null/error/overflow rejection.
- Existing robot-build integration, stock and operations suites passed during this increment, including release/physical-QC/output/installation chain. They do not certify the new UI or pending schema work.
- Isolated browser: overview, direct workshop with instructions, compact parts selection, Hebrew phone at 390×844; measured document width matched client width (375px), with no horizontal overflow. No console errors observed before final warning test.
- Final draft-warning interaction encountered a browser automation timeout while opening a native confirm. Cancellation/retained-draft behavior is NOT accepted; do not claim it passed. Retest manually or replace with an accessible in-page navigation dialog before release.
- Physical Android, APK, headset, real student permissions and live write acceptance were not tested. Synthetic preview does not prove server permissions.

## Remaining work and next execution order

1. Finish P0: compare deployed functions/constraints/policies, verify provider metadata/file/configuration capabilities, map migration dependencies and rehearse recovery. No inferred completion from column checks.
2. Finish P1: guided build setup/type/season/physical identity; role-relevant My work/team/inspection queues; durable filters/deep links; browser Back/login restoration; reliable draft guard; full empty/error/permission journeys and visual acceptance. Current chooser can open any accessible project intentionally and does not yet establish a distinct build record/type.
3. P2: pinned metadata and release packages, drawing/export correctness, scoped student access. Do not widen CAD access by default.
4. P3: partial inspection lots and conserved accepted/rework/scrap quantities; reservations and shared finance/inventory transactions. Preserve whole-job historical records.
5. P4/P5: change impact, freshness, readiness, and explicit maintenance/reliability identity/evidence integration, following the master contracts.
6. P6: required acceptance matrix, production-compatible migration/release, documentation and device/physical limits.

No full-scope completion claim or deployment is justified by this checkpoint. Existing production source/release remains 589943e/d0e6231 as recorded in ROBOT_BUILD_RELEASE_20261009.md.

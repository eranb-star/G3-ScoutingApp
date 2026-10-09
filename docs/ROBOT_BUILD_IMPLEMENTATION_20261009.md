# Robot Build implementation checkpoint — 9 October 2026

Status: development in progress. This is a local frontend increment, not a production release or completion of P0/P1. Follow ROBOT_BUILD_PREDEVELOPMENT_MASTER_20261009.md for the complete scope.

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

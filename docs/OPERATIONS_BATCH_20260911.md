# Combined operations batch — September 11, 2026

## Release order
1. Supabase SQL Editor: run `backend/supabase/operations_readiness_batch_20260911.sql` once. Additive schema; prior migrations must already be applied (owner confirmed).
2. Commit/push the 17 product/documentation files (19 files total in Git status); exclude `android/.idea/deploymentTargetSelector.xml` and `android/.idea/misc.xml`.
3. Open the new preview and use the focused checks below. No production promotion until accepted.
4. Promote once, then prepare one final APK using the existing signing workflow. This batch has not copied Android assets or changed the version.

Suggested commit: `Add service schedules, event robot tests and replenishment planning`.

## Where to find the features
- **Robot Maintenance → Components → select an existing component → Service schedule.** Choose responsible member, repeat interval and first service date; click Save schedule. Existing components are editable. After an actual service, use Record lifecycle event → serviced → Record event. This atomically appends existing history and updates the baseline. Inspections do not reset it; spare/failed/retired statuses are preserved. Explicit service_due changes to installed after service. With no completed service and no first date, the editor explicitly reports no configured due date. No due alert is invented.
- **Calendar → open an existing event → Required robot tests → Add required test.** Choose an existing active Robot Reliability test plan, assigned tester and deadline before the event. This works for meetings and festivals as well as competitions; no event recreation. If no plans exist, create one in Robot Reliability first. Assigned tester or permitted subsystem manager can open Record test, read procedure/safety/success criteria, choose a result and Save result. No default Pass selection. Ordinary historical tests never satisfy this event; latest linked result wins. Changes to procedure, criteria or safety notes require a retest. Unused requirements can be removed; recorded results prevent deletion of their requirement. Requirement editing/reassignment after recorded results is not provided in this batch.
- **Home → Required robot tests.** Shows visible upcoming events within 30 days for the tester or team-risk viewer, with an Open event action. It is a test-status summary, not a declaration that the entire robot is safe or ready. Existing source access applies. No notification/task duplication.
- **Inventory → Parts & stock → item → Stock monitoring.** Configure optional replenishment target at least equal to its reorder threshold, in the item’s existing unit. Monitored low-stock items appear in Replenishment planning. Suggested quantity = max(0, target − stock − approved quantity − ordered quantity). Pending quantities are displayed separately and need review. Draft request opens the normal purchasing form with linked item, supplier and editable quantity. Nothing is auto-submitted. No delivery-date forecast or unit conversion. Only aggregate quantities are shared under the existing count-view permissions, never purchase identities or finances.
- **Home task controls.** Open task is prominent, reminder controls separate, source-status note underneath. Completion still belongs to Projects.

## Focused preview acceptance
1. Configure one existing component’s service settings and confirm they persist. Do not record a fictitious service on a real component just to test.
2. Add a requirement to an existing appropriate event; confirm the assigned tester can see it and that status starts Not tested. Record a result only after a real test or on a clearly designated QA record.
3. Set one inventory target and open its suggested draft; verify the quantity and incoming figures, then cancel unless a real request is needed.
4. Confirm Home buttons remain readable and Open task reaches Projects.

## Validation and limits
TypeScript, Vite, focused operations-planning tests and expanded PGlite migration/RLS tests passed. Tests cover winter Jerusalem date boundary, service baseline/interval, spare exclusion, quantity calculations, service update denial/history preservation, event tester permissions, hidden-event privacy, unrelated pass exclusion, latest failure, changed-plan retest, aggregate quantity refresh, target validation and rerun. Browser fixtures checked mobile service editor, event form on desktop/Hebrew mobile and inventory draft quantity; fixture writes are disabled. No live backend mutation or production promotion performed. Existing Vite chunk-size warning remains.

Home data refreshes on page load; no background scheduler or email/push added. Maintenance retains existing source RLS; this batch does not redesign the historical maintenance permission model. Service intervals are elapsed days after a recorded service; the first-date boundary is Jerusalem calendar midnight. Stock target does not enable monitoring automatically. Production and preview share the backend, so SQL changes are additive and older clients remain compatible.

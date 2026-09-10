# Home competition readiness — Phase 1

## Status

Implemented and locally verified on September 10, 2026. Owner confirmed the SQL migration succeeded in Supabase. Commit/push, authenticated preview acceptance, promotion and Android bundling remain pending. Firebase remains Spark; no paid services were enabled.

## Behavior

- Edit an existing Calendar event, including Off-Season, without recreating it. Set its type to competition, enable Feature on Home, choose the countdown window and priority, and retain its existing audience. Existing IDs remain unchanged.
- An optional Competition Center link makes that competition's dates authoritative. Linked dates cannot be edited in Calendar. Inactive linked competitions and cancelled events are excluded from Home.
- Home chooses one eligible event using audience, dates and priority. It displays days until the event or the current event day. This is context, not a daily notification or unread item.
- Critical unresolved robot issues and explicitly monitored low inventory generate persistent, source-linked signals. Changes resolve/reopen the same signal; status/severity transitions are audited.
- Assigned critical issues appear once in Home priorities, including when the old Inbox item was completed or snoozed. Fix the source issue to clear the risk. Existing acknowledgement remains available; Home does not offer task completion for a critical risk.
- Inventory monitoring is OFF by default for existing and new items. Enable it per item and set its reorder threshold in the item's existing unit. Quantity at or below the threshold triggers a warning; zero stock is high severity. Existing inventory indicators retain their behavior.
- Safe pending-purchase counts show requested/approved/ordered counts without exposing request contents, people, reasons or prices.
- Existing Home workshop/cards, purchasing reuse, feedback and Inbox remain in place.

## Permissions and limits

`view_team_risks` defaults on for admin, mentor and team leader; members see their own assigned critical priorities. Role Permissions can change the capability. Signals additionally require source-record visibility under existing RLS. This phase does not introduce new department-level source restrictions: a leader's risk visibility follows their existing source access.

Only two signal types are implemented. There is no general overdue engine, maintenance/test engine, AI greeting, daily push or global risk dismissal. Source mutation triggers maintain these two rules; countdown dates are evaluated when read. The new readiness data uses one RPC; older Home card queries remain unchanged. Risk summaries can contain English source descriptions in Hebrew views.

## Local verification

- TypeScript and production Vite build.
- PostgreSQL-compatible PGlite migration tests: existing-event edit/link/reschedule, audience/cancellation/inactive competition, stock opt-in and exact threshold, resolve/reopen/audit/idempotency, ownership/source RLS, rejected client writes and private reconciliation calls, safe purchase counts.
- Priority tests: no duplicate issue, critical-first order, restoration of hidden responsibilities, ownership and no input mutation.
- Thirteen existing offline regression scripts and purchase-reuse tests passed.
- Isolated browser fixtures: Calendar editor and linked date locks, stock settings, Home counts, member visibility, explicit RPC error state, Hebrew mobile layout without horizontal overflow. Fixture writes were disabled. These are not authenticated deployment acceptance tests.

## Release order — resume here

1. DONE: owner confirmed `backend/supabase/home_readiness_phase1_20260910.sql` succeeded. Do not repeat migrations. Existing event featuring and inventory monitoring stay disabled until configured.
2. Commit/push this phase after SQL succeeds. Include the feature files and documentation listed below. Exclude both Android `.idea` files and the pre-existing Android `app/build.gradle` release preparation from this feature commit.
3. Owner supplies the new Vercel preview URL and signs in. Verify real authentication/RLS and existing Home/Inbox, feedback, purchasing and Calendar flows. Use explicitly agreed QA records for writes.
4. Verify an existing event can be marked competition/featured and still has the same identity/audience. Test one inventory threshold and critical issue lifecycle with QA data; confirm no duplicated Inbox/unread alerts or private purchase details.
5. Owner accepts preview, then promotes production.
6. Prepare Android from the accepted final web build, copy assets, verify the bundle and select an appropriate next version after confirming whether prior 2.1.4 was installed. Only then ask owner to build a signed release APK with the existing keystore. This phase's web assets have NOT been copied to Android.

## Feature commit files (18)

Suggested message: `Add competition context and source-linked Home readiness`

- PROJECT_HANDOFF.md
- docs/HOME_READINESS_PHASE1_20260910.md
- backend/supabase/home_readiness_phase1_20260910.sql
- apps/dashboard_web/src/components/HomeReadiness.tsx
- apps/dashboard_web/src/components/StockAlertEditor.tsx
- apps/dashboard_web/src/components/HomeActionInbox.tsx
- apps/dashboard_web/src/lib/readiness.ts
- apps/dashboard_web/src/lib/accessControl.ts
- apps/dashboard_web/src/pages/ProductivityHomePage.tsx
- apps/dashboard_web/src/pages/UnifiedCalendarPage.tsx
- apps/dashboard_web/src/pages/ToolsInventoryPage.tsx
- apps/dashboard_web/src/teamHub.css
- apps/dashboard_web/scripts/preview-home-readiness.mjs
- apps/dashboard_web/scripts/test-home-readiness-sql.mjs
- apps/dashboard_web/scripts/test-readiness-priorities.mjs
- apps/dashboard_web/scripts/preview-purchase-reuse.mjs
- apps/dashboard_web/scripts/verify-mobile-notification-stability.mjs
- apps/dashboard_web/scripts/verify-phase-1-2.mjs

The two existing verification scripts were adjusted to accept the already prepared Android version and Home inbox props, rather than stale exact strings. All four pre-existing modified files were preserved. The handoff contains prior Android-release preparation history as well as this checkpoint.

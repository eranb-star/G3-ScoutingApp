# Feedback review and purchase reuse — release checkpoint

Implemented locally on 2026-09-10. Not committed, deployed, promoted or packaged in Android yet.

## Changes

- Feedback insertion creates one member-targeted review action for each active administrator. Existing unique action IDs are preserved through updates. Closing/resolving cancels the review; reopening resets its unread state. Administrator membership changes synchronize open reports. Deleting a report cancels its review actions through recipient cleanup.
- Submission requests push delivery through the existing `send-action-push` function, using a narrowly scoped RPC to obtain delivery IDs without granting the submitter read access to administrator actions. No new edge function or Firebase service is required. Push preferences/tokens still apply; this is not a guarantee of device delivery.
- Opening an administrator report acknowledges its review and emits the existing notification refresh event. Existing submitter status-update behavior is preserved.
- New submissions no longer create the additional legacy administrator announcement. Previously created announcements are preserved because they have no reliable report foreign key; do not delete them by title matching. Migration backfills open feedback review items without sending phone pushes.
- Purchasing adds product/supplier/SKU search, inventory-category filtering and Request again. A fresh draft copies name, supplier, product link and an available inventory association, with quantity 1, blank estimated total and blank justification. Previous request/approval/payment data is not copied or modified.
- Inventory Request purchase uses the latest received purchase by request creation date for that exact inventory ID. No name-based product merging. Unavailable/archived inventory associations become new-item drafts.
- Received product history is available to active members with purchase-request permission through a product-only RPC. It excludes requester identity, justification, estimated cost and finance/payment data. Existing purchase RLS remains requester/admin scoped. Uncategorized and non-inventory purchases remain discoverable. Category/SKU come from linked inventory, including archived inventory in the RPC.

## Verification performed

- TypeScript check and Vite production build passed. Existing large-bundle warning remains.
- All existing offline `verify-*.mjs` suites passed except the intentionally excluded live-schema probe and Android Firebase artifact verifier (no Android changes).
- `node scripts/test-purchase-reuse.mjs` passed executable helper tests: reset fields, preserve old request, latest received selection, product/supplier/SKU search, categories and unavailable inventory.
- `scripts/test-feedback-purchase-sql.mjs` passed in an in-memory PGlite PostgreSQL instance with representative baseline tables/RLS and the repository's actual `sync_team_action` function. Tested new report, private targeting, scoped delivery IDs, acknowledge/close/reopen, admin demotion/promotion/new membership, idempotent rerun, report deletion and safe purchase history. This is not a test of the live Supabase instance or all historical migrations.
- Isolated browser fixture (`node scripts/preview-purchase-reuse.mjs`, localhost:4182) used the real purchasing component with synthetic data and backend writes disabled. Received history and Request again verified via browser; observed link/supplier/inventory populated, quantity 1, cost/reason blank, no private cost/requester on shared card. Desktop visual check performed. Full authenticated preview and physical-phone checks remain pending.
- PGlite was installed only in Windows Temp for test execution; no production dependency added. To rerun SQL tests, set PGLITE_MODULE to the installed PGlite `dist/index.js` and run the script with Node.

## Activation and acceptance

1. Owner runs `backend/supabase/feedback_review_notifications_20260910.sql`, then `backend/supabase/purchase_reuse_history_20260910.sql` in the existing project's Supabase SQL editor. Report both results. The first adds in-app review items for existing open reports. No historical reports/purchases are deleted.
2. Commit/push the 12 files in this release, excluding both existing Android `.idea` changes. Suggested message: `Notify admins about feedback and add reusable purchase history`.
3. Inspect the exact resulting Vercel preview with administrator and authorized requester roles. Do not promote before validation. Preview uses the SAME live backend.
4. Check a consented feedback submission: admin-only Home/Inbox item, equal bell/unread count, exact report link, read acknowledgment, close/reopen, phone push/deep link. A live test sends real administrator notifications; agree on the QA report before submitting it. Existing reports can be inspected read-only first.
5. Check shared history as authorized requester, search/category, Request again changed quantity, inventory shortcut, fresh approval and no copied financial details. Full receiving/payment mutations should use reviewed QA records, not existing team purchases. Confirm Hebrew and phone widths.
6. Owner promotes after acceptance. Then prepare next version and sync final web assets before owner's normal signed release APK build/install. Current installed release is still 2.1.3; no new APK prepared in this task.

## Exact commit files (12)

- PROJECT_HANDOFF.md
- docs/FEEDBACK_PURCHASE_REUSE_20260910.md
- apps/dashboard_web/src/pages/FeedbackCenterPage.tsx
- apps/dashboard_web/src/pages/ToolsInventoryPage.tsx
- apps/dashboard_web/src/lib/feedbackNotifications.ts
- apps/dashboard_web/src/lib/purchaseReuse.ts
- apps/dashboard_web/src/teamHub.css
- apps/dashboard_web/scripts/test-purchase-reuse.mjs
- apps/dashboard_web/scripts/test-feedback-purchase-sql.mjs
- apps/dashboard_web/scripts/preview-purchase-reuse.mjs
- backend/supabase/feedback_review_notifications_20260910.sql
- backend/supabase/purchase_reuse_history_20260910.sql

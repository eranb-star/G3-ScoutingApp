# Member workflow corrections — 11 October 2026

Scope: Home/Updates read consistency, official-training bulk assignment feedback, administrator forgotten checkouts, and task explanations. No unrelated Studio/catalogue development.

## Behavior
- Dismissing or acknowledging an announcement reminder records its read receipt in the same transaction. Opening an announcement acknowledges its linked reminder. Existing completed/acknowledged announcement reminders are backfilled; deferred reminders remain deferred. Read writes now surface errors instead of pretending to succeed.
- Official training offers **Select all members**, **Select members + team leaders**, individual selection and clear selection. Groups respect the instructor's existing assignable-member scope. The selected count appears before preview and confirmation. Success/results appear beside the assignment action; already-verified/pending evidence is reused. Confirmation means an in-app assignment, not guaranteed push/email delivery.
- Admin close-out is available in Current/Last Workshop, Schedule/session controls and the admin attendance dashboard. It previews remaining attendees, takes an actual departure datetime and audit reason, checks out only open attendance rows and closes the session atomically. Ended sessions also support forgotten-checkout correction. Existing checkouts remain unchanged. Active admin role is checked server-side. Late self check-ins serialize against closure. Invalid/future/before-check-in times are rejected. Mentors/leaders retain their existing ordinary close/extend behavior.
- Project task creation has a multiline **Task explanation** (up to 10,000 characters), stored atomically with assignment/Assist context. Existing tasks display it and authorized assigners can edit it. Existing review requirements and Assist request-id checks remain intact.

## Verification
- TypeScript build and Vite build passed (existing large-chunk warning).
- Five recipient-selection assertions passed: members, optional leaders, permission scope, empty scope and excluded roles.
- Production-schema transaction rolled back all fixtures: admin/member authorization, checkout time rejection and atomic rollback, preserved existing checkouts, per-person audit, retry count, late check-in rejection, task explanation create/edit, announcement synchronization and preserved deferral.
- Actual components exercised with synthetic browser data: group selection, preview, successful assignment and disabled repeat confirmation, admin checkout confirmation, explanation editing. Hebrew 390px layout inspected; group controls wrap and recipient list is bounded.
- No real student training assignment or attendance correction was used as a test.

## Deployment
`backend/supabase/member_workflow_fixes_20261011.sql` applied successfully to production after rolled-back QA. Frontend release identity and live acceptance are recorded in the authoritative checkpoint after promotion.

## Boundaries
- Android 2.5.0/code28 predates these frontend controls. The server-side announcement reconciliation applies to old clients, but new forms require the updated website or a subsequent APK. Do not claim the previously generated APK includes this release.
- Studio catalogue expansion remains OPEN; no catalogue gap was resolved here.
- Rollback frontend independently if needed. Retain additive database functions/read receipts/audit records; do not delete user history to roll back UI.

# QA account switching — setup and acceptance

Status: SQL succeeded (owner confirmation) and qa-test-session deployed successfully to hnqwhuuxlqfyawqymaaz on 2026-09-12. Setup steps 1–2 below are complete. Commit/push and live preview acceptance remain. No web production promotion or APK included.

## Setup

1. In the app's Supabase project, open **SQL Editor → New query**. Paste and run `backend/supabase/qa_test_sessions_20260912.sql`.
2. Open **Edge Functions → Deploy a new function → Via Editor**. Name it **qa-test-session**. Replace the editor's `index.ts` with `supabase/functions/qa-test-session/index.ts`, then deploy. It uses the standard server environment variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; never put the service-role key in the web app. Keep JWT verification enabled, consistent with the existing authenticated functions.
3. Commit/push the feature files (exclude the two existing Android `.idea` files). Suggested commit: `Add QA-only account switching and fix review status layout`.
4. Open the new Vercel preview as admin. **Settings → Test as a QA user** has the three available designated accounts. Missing/inactive accounts are not created automatically.
5. Test **QA Student**, submit a QA-owned checkpoint with an evidence link, then **Return to admin**. Test **QA Mentor** assigned to that checkpoint, review the submission, then return. Use a QA project, because these are real changes to the connected database. Test the QA Team Leader's existing team scope separately.
6. Only promote after the role switching and return have been accepted. No APK required for the web preview.

## Scope and safeguards

- Exact designated emails: `qa.student.20260905@g3-test.invalid`, `qa.mentor.20260905@g3-test.invalid`, `qa.leader.20260905@g3-test.invalid`. Display names never authorize access. Account role, active status and Auth identity must match on every start.
- Admin authorization is checked in the Edge Function. The returned session belongs to the real QA Auth user; existing RLS and role permissions continue to apply. No role override and no real-member impersonation.
- A generated one-time link is verified server-side; no email is sent and no QA password is requested or changed. The temporary-password setup screen is skipped only within this QA session. The stored password-change requirement remains intact for normal login.
- Admin auth remains in its original storage. QA auth uses a separate sessionStorage key and a separate offline database per test session. A full reload clears application state on switching. Native admin push-token registration is skipped in QA mode.
- A persistent banner identifies testing and provides Return to admin. QA requests stop at the issued token's expiry. Return attempts server sign-out of the QA session and records its end. If network/auth failure prevents confirmation, the explicitly labelled local-return fallback clears this tab's QA credentials and returns to the original admin session/login.
- Supabase access JWTs can remain valid until expiry after server sign-out; this is not an instantaneous server-wide revocation system. Browser storage is not protection against malicious same-origin code.
- `qa_test_sessions` records the initiating administrator and target. `qa_test_changes` records table, row identifier and operation for the project, review, dependency, feedback, purchasing, inventory, expense and action-state tables listed in the migration. This is scoped audit coverage, not a claim that every app operation is audited. Values/evidence/passwords are not copied into that log.
- No paid Firebase changes, extra push messages, automatic purchase approval, or production deployment.

## Validation

Focused PGlite checks use the actual migration twice to check repeatability, exact-email seeding, nonadmin access restrictions, active/role filtering and actor/session attribution. The actual Edge handler is run with bounded auth/database mocks to check nonadmin rejection, disabled designation, Auth identity mismatch and fail-closed credential issuance on audit failure. TypeScript and production Vite build passed; the existing bundle-size advisory remains. Phone-width QA buttons were visually checked in the isolated synthetic fixture. Live Supabase session switching remains an acceptance step after deployment.

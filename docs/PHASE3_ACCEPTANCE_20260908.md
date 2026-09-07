# Phase 3 acceptance — started 2026-09-08

Baseline: `87c3bfd`, production promotion and Android `2.1.3` installation confirmed by owner. Browser checks use the accepted preview `https://g3-scouting-app-5qpe-5grv7zac7-eranbos-projects.vercel.app` against the existing backend. A preview deployment is not an isolated test database.

## Exact stopping point

Owner is concluding for the day. Last known app session is **QA Student**, Updates/Inbox. The next requested action is **Full navigation → Sign out → sign in as the owner's administrator account → “admin in.”** This has not happened yet. Inspect the actual session on resume rather than relying on tab ID 9.

After administrator sign-in, prepare a QA-only learning test containing single-answer, multiple-answer and written/manual-review questions. Show the owner its exact contents and QA Student-only recipient before publishing notifications. No test course, quiz or assignment has been created yet. Do not modify Ofir's existing real enrollment for this test.

Owner authorized resets for the three existing QA accounts. Only QA Student was reset by the owner and successfully signed in. QA Mentor and QA Team Leader resets/sign-ins remain pending. Existing emails:

- QA Student: `qa.student.20260905@g3-test.invalid` (access recovered; do not reset again).
- QA Mentor: `qa.mentor.20260905@g3-test.invalid`.
- QA Team Leader: `qa.leader.20260905@g3-test.invalid`.

No passwords are stored in documentation. The owner performs credential changes under the browser tool's handoff rules; prior reset authorization does not need repeating. The earlier assistant, not the owner, originally used these accounts.

## Evidence so far

- QA Student recovery completed by owner; owner signed in after password change. Direct browser observation: QA Home, no Administration navigation, no Academy create/edit/assign/instructor-gradebook controls, My progress with zero assigned courses. Direct `/admin/finance` and `/admin/members` navigation both returned to Home without rendering protected content. These verify browser route guards, not independent database/RLS resistance to crafted requests. No test submission/grading is possible until QA learning content is assigned; no source records were modified in these checks.
- Earlier administrator inspection: Skills Academy loads its ten existing courses and assignment controls. Current last-known session is QA Student.
- QA Student, QA Mentor and QA Team Leader are listed in the assignment selector. Student sign-in is verified; mentor/team-leader sign-ins remain unverified.
- QA Student Home and Inbox both showed 3 unread: two meeting responsibilities plus one announcement. Inbox showed 2 open responsibilities; admin-only absence/scouting responsibilities and the cancelled milestone were absent. No items were opened/acknowledged to change their state during this check.
- Administrator Gradebook loads one existing real enrollment, at Not started with 0/3 modules and 0/0 assessments. No grades or enrollment records were changed.
- These are navigation/data-loading checks only. They do not establish grading correctness, student privacy or backend authorization enforcement.

## Execution order

1. Return to administrator to prepare QA learning content; student access is already recovered. Recover mentor/team-leader access later using the already-authorized owner reset flow. Enter credentials only in the app.
2. Prepare explicitly identified QA-only learning content and assignments: single-answer quiz, multiple-answer quiz, and manual-review response. Confirm the test recipients before publishing notifications.
3. Test student submission, scoring, answer-key privacy, attempt limits and Home/Updates behavior; test mentor review and team-leader access separately.
4. Test purchasing/finance role boundaries and notification delivery using QA records, with no real payments or purchases.
5. Test competition/scouting assignment boundaries, phone layouts, English/Hebrew, navigation and offline recovery. Physical phone and school GPS/Wi-Fi checks need owner participation.
6. Record each pass/failure and any corrective release. Keep `RELEASE_ACCEPTANCE_20260906.md` as the underlying learning acceptance checklist.

No QA accounts, team records or history may be deleted without explicit owner approval. Do not mark full Phase 3 acceptance complete from source checks or administrator-only inspection.

# Isolated Release 1 QA — 2026-09-13

Created under the user's authorization to prepare hosted acceptance without changing production.

- Supabase Free organization: G3 Isolated QA (`rsyzdqvlxkdwrrksshhs`).
- Supabase project: G3 Release QA (`cyooubycafubbnkjcqlw`), Nano, Tokyo.
- Schema-only export from recovery installed successfully: 116 public tables, 132 application functions, 13 views, constraints, policies and triggers. No application rows, Auth users, Storage objects, cron jobs, Edge secrets or deployed functions copied.
- Permission catalog and role rules copied without updater identities. Four new synthetic Auth accounts created through the dashboard without sending email: student, mentor, mentor2, admin at `g3-qa.invalid`. These are unrelated to production QA accounts. Password is held only in the active test session; reset through the QA dashboard if needed later.
- Synthetic CAD and Mechanical projects seeded, with a two-mentor checkpoint, physical configuration and prerequisite link.
- Branch: `codex/release-1-qa`; initial release commit `c7fb82f`.
- Vercel project: existing `eranbos-projects/g3-scouting-app-5qpe`; overrides for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` apply ONLY to Preview branch `codex/release-1-qa`. Production and other branch values unchanged.
- Isolated rebuild: `CyeyaFtSE1xdztZGSce5kyYzzTqV`, URL `https://g3-scouting-app-5qpe-m64kgwb9u-eranbos-projects.vercel.app` (acceptance pending at time of writing).

Do not directly promote a QA-configured build. Production requires the six migrations plus a fresh build using production environment values, after acceptance.

The free project is for synthetic acceptance, not production or backup. No new paid project was created. Local schema/seed exports are ignored by Git. The clipboard helper serves only those exports on localhost and should be stopped after setup.

Scope limits: Storage policies/objects, Edge functions and cron were not copied. Full external integrations and device push are not part of this review-flow acceptance. Existing Android IDE edits remain uncommitted.

## Acceptance result
Tested commit 1ee69ae: https://g3-scouting-app-5qpe-lhugwqwwg-eranbos-projects.vercel.app. Core authenticated student/two-mentor/dependency/Home flow passed. Secondary reviewer queue bug fixed and retested. Final synthetic source is approved/done, dependent is in_progress. First profile fetch hit a transient JWT-issued-at-future error; reload and later sign-ins succeeded. Physical phone and external integrations remain unverified. Production acceptance remains with the user.


## QA configuration correction — 2026-09-13
User accepted Student and Mentor previews. Admin Home exposed a missing singleton seed: purchase_approval_settings had zero rows. Restored id=true, threshold_hours=72 in isolated QA only, using ON CONFLICT DO NOTHING. Hosted Admin Home now shows 0 pending / 0 overdue. No production change or frontend rebuild needed.
The Settings QA switcher has zero registered qa_test_accounts in this schema-only environment; its Edge function was not deployed. Synthetic acceptance accounts use direct Auth sign-in. This switcher remains outside acceptance coverage; do not imply it was tested or that production QA accounts disappeared.


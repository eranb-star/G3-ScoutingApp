# Focused operational updates — 17 October 2026

## Scope and decision

Five requested corrections only: configurable Limited Mentor operational grants, student attendance/missing rosters, supplier-order allocation clarity, absence decision attribution and compact expandable absence rows.

User clarification: all operational permissions configurable; account/password management, role-permission administration and security audit remain administrator-only. No existing role grants are changed or automatically enabled. Assigned project/work/reliability scope remains enforced. Training/profile restrictions respond to explicitly granted training/report permissions; revocation restores the restriction. Attendance correction is an operational permission and retains concurrency checks, reason, actual-time validation and immutable audit.

## Delivered behavior

- Current/last workshop and selected meeting identify missing students separately from recorded attendees. Only member/team_leader identities are included. Registered QA accounts are excluded using `qa_test_accounts`, not display-name guesses. Existing mentor/QA attendance records are preserved.
- Meeting targeting (whole team, subteam including secondary teams, individual) and join date are respected. Historical missing rosters use **current active membership**, not a historical enrollment snapshot; this is labelled. Attended former students remain visible in recorded history. Past member activation/team changes cannot be reconstructed from data that was never stored.
- CSV includes missing students, approved absence labels and the historical-roster qualification; selected meeting export uses that meeting. Timezone remains Asia/Jerusalem.
- Absence table shows student, meeting/date, status and decision actor/date/time; details expand to reason, submission and reviewer response. Historical missing attribution is explicitly unknown. A minimal RPC reveals only the reviewer display name for requests the caller may see.
- Supplier invoice order choices use checkboxes and product names, show remaining eligible coverage, and reveal labelled partial-allocation inputs when selected. Defaults respect invoice remainder and existing expense/other-invoice coverage. Server-side allocation/concurrency/idempotency rules remain unchanged. No financial records or owed balances are altered by this release.

## Verification and release

- Focused PGlite `test-operational-permissions.mjs`: default denial, explicit grant/revocation, security denial even with an incorrect grant, assigned project scope, QA/mentor roster exclusion, reviewer-name privacy and inactive-account denial passed.
- `test-student-roster.mjs`, `test-attendance-reporting.mjs`, `test-supplier-bills.mjs` passed.
- TypeScript passed; final release build/CI status recorded below when available.
- Production schema rehearsal for both new migrations passed in a rolled-back transaction. No production records modified during rehearsal.
- Synthetic browser checks: missing students visible, compact decisions with actor/time, expandable reason/response, invoice split/partial/deselect calculations. No real decisions, notifications, grants or financial writes used for testing.
- Required migrations: `operational_permission_controls_20261017.sql`, `attendance_student_roster_20261017.sql`.
- Release status: implementation and focused checks complete; production installation/deployment verification pending.

## Boundaries

No catalogue, CAD, robot software, notification delivery or APK rebuild is included. APK 2.6.0 has older bundled frontend; new frontend controls require the website until subsequent packaging. Existing server authorization applies to both clients. No paid project created.

Rollback: revert the frontend commit if needed; both new directory functions are additive. Permission-function/policy rollback must restore the previous `limited_mentor_20261015.sql` definitions and admin-only attendance-correction guard, without rerunning its role-constraint/seed section. Preserve audit and all existing records/grants.

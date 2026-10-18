# Hanadiv festival implementation — 18 October 2026

Authorized by the user's “יאללה”. Extend Projects; do not create another main-menu entry. All active student members/leaders participate, excluding registered QA identities. Admins and active team leaders manage scheduling across teams; admin can appoint named project schedulers (Libi/Tuval selected from verified accounts, never guessed by name). Scheduling grants convey no finance/security administration.

## Accepted operational contract
- Elementary sales point serves internal amphitheatre and Indigo/grass. Main auditorium serves Jazz/world music and its alternate venue label.
- Public source snapshot: exact street החורש and houseNumber 36; 35 events across Oct29–31 at review. Preserve event IDs, venue, duration and source URL. Times use Asia/Jerusalem, including DST (festival is UTC+02, not today's UTC+03).
- Setup begins at least 60 minutes before the first activity for each point/day, or earlier opening. Explicit staffed setup and closing shifts; no fabricated staffing/working-hour requirements.
- Draft → publish → individual acknowledgment → actual arrival/departure. Cancellation and material edits reset acknowledgment and update only affected personal actions. Swap requests retain the original responsibility until a scheduler changes it.
- Student availability is planning input; official absence uses existing Attendance Center/calendar records. No workshop records or cutoff rules are changed. Festival attendance is separately labeled and must not be added blindly to workshop totals.
- Concurrency/version protection, authoritative server permissions, cross-point overlap detection, QA exclusion, historical audit, no direct client writes. No real notifications/assignments during testing.
- Compact bilingual phone/desktop interface; filled pink actions, selected tabs, readable errors, preserved drafts after conflict.

## Implementation and acceptance checklist
- [x] Live schema inspected; rollback rehearsal passed; additive migration installed successfully.
- [ ] Project workspace, source schedule, date/point filters and provenance.
- [ ] Scheduler grants, student roster, availability and participation totals.
- [ ] Draft shifts, staffing, roles, setup gate, overlap prevention and publish.
- [ ] Personal action/calendar links, acknowledgment, absence and change requests.
- [ ] Recorded festival attendance/corrections and audit; no 23:00 closure.
- [ ] Preparation checklist and contextual links to existing project/finance modules.
- [ ] Source-change review without silent changes to published staffing.
- [ ] Focused SQL authorization/concurrency/lifecycle tests; TypeScript/build; bilingual phone/desktop acceptance.
- [ ] Release, production verification and durable handover; physical participation remains real-world acceptance.

Status: implementation and focused SQL/TypeScript checks passed; migration installed. Frontend release and live setup pending.

## Verification and operational details
- PGlite: admin/leader/delegated scheduler grants and revocation, QA exclusion, direct-table denial, other-student draft privacy, overlap and stale-write rejection, setup gate, publish/calendar creation, acknowledgment/change request/response, cancellation, archive/calendar consistency guards, actual checkout at 23:30 and inactive denial passed.
- Browser fixture: save draft, publish and student acknowledgment persisted via actual SQL RPC; Hebrew student and English manager views checked. No real student assignments or notifications used for tests.
- Published changes use explicit cancel + create replacement + publish. Original history/calendar cancellation is retained; the new assignment requires fresh acknowledgment. This avoids silently withdrawing an existing assignment into an unpublished draft.
- Change-request response is visible on the shift; a response alone does not change the assignment. Scheduler must cancel/replace when granting a change.
- Source refresh is manual, with reviewed diff before import. Existing assignments are never silently moved. Festival source can change; review again before publishing shifts.
- Student availability is advisory and shown when scheduling; missing availability is not an absence approval.
- Festival actual attendance is recorded/corrected by schedulers with a reason, independently of workshop attendance. No automatic 23:00 checkout.
- No new Android package in this web release. Current bundled APK needs a later frontend rebuild to include this new screen.
- Rollback: revert frontend release only; retain additive workspace/audit/calendar records. Do not drop tables containing assignments.


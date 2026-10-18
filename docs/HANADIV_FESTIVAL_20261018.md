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
- [x] Project workspace, source schedule, date/point filters and provenance.
- [x] Scheduler grants, student roster, availability and participation totals.
- [x] Draft shifts, staffing, roles, setup gate, overlap prevention and publish.
- [x] Personal action/calendar links, acknowledgment, absence and change requests.
- [x] Recorded festival attendance/corrections and audit; no 23:00 closure.
- [x] Preparation checklist and contextual links to existing project/finance modules.
- [x] Source-change review without silent changes to published staffing.
- [x] Focused SQL authorization/concurrency/lifecycle tests; TypeScript/build; bilingual phone/desktop acceptance.
- [x] Release, production verification and durable handover; physical participation remains real-world acceptance.

Status: deployed and configured on 18 October 2026. Production f5e061c; development 972e6f6; Vercel 269iCFmYVBZUi2Bsp83eLEs5DuMK, Ready on g3-6740.com. Release CI392 passed.

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

## Live acceptance and handover
- Reused existing project **הכנות לפסטיבל הנדיב**, ID 9430557b-664a-45ea-b926-b6eb0e7d9cdb; no duplicate project created. Open Work → Team Projects → Hanadiv festival, choose the existing project, or use /projects/festival?project=9430557b-664a-45ea-b926-b6eb0e7d9cdb.
- Imported live API programme: **35 events** (7 Thursday / 9 Friday / 19 Saturday; 27 elementary / 8 main). Import persisted at 18 October 19:23:42 Israel time. Source review/fetch works from production origin.
- Verified names against primary subteam: **ליבי / Software** was granted, not **ליבי רווה / Mechanical**. **תובל שבתאי / team_leader** also explicitly listed; all active team leaders/admins already qualify. Grants persisted after reload. No global role or security permission changed.
- Live production transaction rehearsed draft → publish → canonical team_calendar_events action/deep link → cancel, then rolled back. Assertions passed; no test assignments or notifications persisted.
- Actual production 390px phone viewport measured innerWidth390/documentWidth375, no horizontal overflow; programme rows and tabs inspected. Hebrew student/English manager fixture checked. Real phone push receipt/physical festival operation remain unverified.
- Entry opens an explicit project selector if no exact default title match; select the existing preparation project. Direct assignment links already identify the project and shift.
- No actual shifts published. Scheduling leads still choose staffing quantities, shift lengths, people, roles, target hours and closing times. Setup deadlines are calculated from programme per day/point and enforced when publishing.
- Existing workshop attendance, purchases, money owed and robot modules were not changed.
- Evidence screenshot: docs/staging/hanadiv-production-20261018.jpg (local).
- Source CI391 failed in the existing catalogue fixture after previously local APK changes were pushed: missing Android asset/cache module imports. Focused catalogue test repaired and passed (93 real catalogue entries); test-only fix43c4ebe pushed. This does not affect isolated production festival CI392. Source CI393 passed after that test-fixture repair.

# G3 Scouting App — Authoritative Handoff

Last updated: 2026-09-06 (Asia/Jerusalem)

This is the single source of truth for resuming development. Read this file before changing the app. Do not reconstruct the roadmap from chat memory.

## Exact current state

- Working branch: `web-portal-preview`
- Latest pushed product commit: `c6063d3 Fix calendar audiences and event deletion`.
- Supabase Skills Academy resource-catalog migration, production web promotion and signed APK installation for version `1.5.0` (code `8`): confirmed complete by the product owner on 2026-09-06.
- Canonical production web domain: `https://g3-6740.com`. Vercel serves production on this domain and `https://www.g3-6740.com` redirects to the apex domain.
- Supabase Authentication URL configuration was directly updated and verified on 2026-09-06: Site URL is `https://g3-6740.com`; allowed redirects are `https://g3-6740.com/**`, `https://www.g3-6740.com/**`, and the legacy production fallback `https://g3-scouting-app-5qpe.vercel.app/**`.
- Operational UX release was committed, pushed, promoted to production and installed on Android by the product owner. Released Android identity: version `1.6.0`, code `9`.
- Team Media + Feedback Center was committed, pushed, promoted to production and installed on Android by the product owner.
- Purchase Reliability + Attendance Reliability + Engineering Hub is committed and pushed in `ee3efbb`. Its exact authenticated Vercel preview passed, including purchase quantity `1`, all 10 GitHub repositories and the web attendance boundary.
- Navigation/calendar/member-feedback refinement is committed and pushed across `f5c0d2a` and `c6063d3`. The exact preview was accepted by the product owner, including human-readable calendar audiences and successful event deletion.
- The product owner confirmed production promotion and creation of the Android `1.8.0` (code `11`) APK on 2026-09-06. Installation of that APK on a physical phone has not yet been stated separately; treat installation as pending unless confirmed.
- There are no uncommitted product-code changes after `c6063d3`; only the two excluded Android Studio `.idea` files and this handoff status correction are local changes.
- Local non-product changes: Android Studio may modify `android/.idea/deploymentTargetSelector.xml` and `android/.idea/misc.xml`. Never include these files in a product commit.
- Live quiz-engine schema verified on 2026-09-06: `training_assessments.due_at`, `training_assessments.max_attempts`, `training_assessment_answer_keys`, `training_assessment_assignments` and `submit_training_quiz` are present and responding through Supabase. Do not rerun the migration merely for confirmation.

## Verified readiness checkpoint — 2026-09-06

- TypeScript and Vite production build: passed.
- Phase 1–2 regression suite: passed.
- Phase 4–5 regression suite: passed.
- Phase 6 regression suite: passed.
- Skills Assessment Engine suite: passed, including private answers and single/multiple-answer grading semantics.
- Live Supabase REST schema check: passed (`HTTP 200`).
- Live quiz-engine tables and columns: passed (`HTTP 200`).
- Live `submit_training_quiz` RPC presence: confirmed; the unauthenticated probe reached application validation and was correctly rejected as unassigned.
- Skills Academy resource-catalog migration: executed successfully by the product owner.
- Exact Vercel preview for commit `8a3b33b` authenticated and inspected before promotion: passed.
- Live catalog returned all 12 seeded approved resources; search, filtering, administrator review form, course-attachment controls and narrow/mobile rendering were directly verified without mutating production records.
- Skills catalog verification suite: passed all 10 checks. Existing Phase 1–2, Skills Assessment, Gradebook and Learning Automation suites also passed before release.
- Android assets were explicitly synchronized from the validated final web `dist` before the APK was built.
- Android release identity: version code `8`, version name `1.5.0`.
- Release product source state was clean. The only current product change is this handoff update; the two Android Studio `.idea` files remain excluded.
- Result: Skills Academy gradebook, learning automation and reviewed resource-catalog foundation are released. Proceed to the real multi-role acceptance matrix, followed by the remaining production-hardening work.

## Completed capabilities — do not schedule them again

The following are already represented by committed code and regression checks:

- Responsive web portal and Android app from the shared React application.
- Role and permission administration, separated admin/mentor/team-leader/member roles, multi-team membership, access boundaries and temporary-password flow.
- Home responsibility aggregation and source deep-links for projects, training, calendar, competition assignments, robot issues and announcements.
- Team schedule, attendance administration, workshop presence/history/corrections and operating dashboards.
- Purchasing and inventory workflow with administrator approval boundaries and request notifications.
- Robot reliability, issue tracking, maintenance, analytics and export.
- Skills Academy course governance, curated courses, member/team assignment, modules, evidence, instructor review and course ordering.
- Skills Academy assignments, quizzes and grading foundation.
- Reviewed Skills Academy learning-resource catalog, administrator governance, approved-only member visibility, search/filtering and course resource attachment.
- Secure quiz engine: private answer keys, single-answer questions, multiple-answer questions, written answers, automatic server grading, manual review, due dates, passing score and attempt limits.
- Competition assignments, replacements, event context, live command state, pit display and offline competition cache/control.
- Guided offline pit scouting, event-scoped pit teams, unique pit assignments, verification/conflict review and separation of pit evidence from match evidence.
- Advanced scouting coverage, analysis, quality views, picklist evidence and worldwide TBA match/video library.
- G3 Assistant multimodal/history/knowledge workflows previously implemented. Provider capacity remains an external operational risk and must not be presented as a UI-only defect without checking function logs.

## Operational UX release — COMPLETE

Prepared on 2026-09-06 as one web/Android batch; it is not production-released until the product owner confirms promotion and installation.

- Tools & Equipment now records **Model** and **Amount**; legacy asset-tag values are migrated into Model.
- Equipment return dates use a calendar picker.
- Skills Academy assignments and tests can target the whole team, multiple teams or multiple individual members. Publishing enrolls eligible recipients, creates their assessment assignment and Home responsibility, and removes recipients excluded by a narrowed target.
- Skills Academy Home/deep links now open directly to the requested Academy view.
- Multi-day calendar events render on every covered date, with range validation and visible start/end times.
- Lazy-route loading has a slow-load explanation, Retry action and a recoverable error boundary. The service worker uses refreshed network-first application assets to reduce stale deployment chunks.
- Supabase migration `backend/supabase/operational_ux_release_20260906.sql` was directly observed succeeding (`Success. No rows returned`).
- Operational UX verification passed all 11 checks; TypeScript and Vite production build passed. Calendar, inventory and assessment targeting were inspected in the authenticated local preview at narrow/mobile width; the multi-day October 29–31 event appeared on all three dates.
- The exact final web bundle was copied to Android assets and its `index.html` hash matched the build output.
- Released Android identity: version code `9`, version name `1.6.0`.

## Team Media + Feedback Center release — COMPLETE

- Team Media provides one responsive, searchable archive with separate Robot, CAD & Drawings, Workshop Progress, Events and Team Stories collections.
- Authenticated members can upload JPG, PNG, WebP, GIF and PDF files. Large images are compressed client-side before upload; the private bucket limit is 15 MB. Media includes title, caption, collection, date and tags.
- Team members can view the gallery. Uploaders can delete their own items; admins and mentors can manage all items. Storage and database policies enforce these boundaries.
- Feedback Center supports improvement ideas and bug reports, affected area, impact/severity, optional screenshot, threaded conversation and visible status.
- Submitters can only see their own feedback. Admins and mentors see the team inbox, assign an owner and move work through new, reviewing, planned, in progress, resolved and closed states.
- New feedback creates an administrator announcement. Status/owner changes synchronize back to the submitter through the shared Home/Work responsibility engine.
- Supabase migration `backend/supabase/team_media_feedback_center_20260906.sql` was directly run and returned `Success. No rows returned`.
- All existing regression suites passed. The new Team Media + Feedback suite passed all 12 checks; TypeScript and Vite production builds passed.
- Both modules were inspected in the authenticated local phone-width preview after the live schema was installed. They loaded without schema errors and remained single-column/readable.
- The exact final web bundle was synchronized to Android assets and its `index.html` hash matched. Released Android identity: version `1.7.0`, code `10`.

## Purchase + Attendance Reliability + Engineering Hub — PRODUCTION WEB RELEASED; ANDROID APK BUILT

- Purchase requests accept whole quantities such as `1` and decimal quantities, expose a clear saving state, prevent duplicate submission and confirm the database save before reporting push-delivery status.
- Attendance preserves check-out for a member with an active attendance record even when the meeting end time has passed. Expired open meetings are closed automatically without trapping that member.
- Phone attendance now offers explicit GPS and School Wi-Fi verification. Rejected or inaccurate GPS automatically continues to trusted Wi-Fi, with precise status messages.
- The Android Wi-Fi bridge requests Fine/Coarse Location and Android 13+ Nearby Wi-Fi runtime permissions before reading the SSID.
- Engineering Hub is a read-only, department-oriented catalog combining `GlueGunAndGlitter` (software) and `GlueGunGlitter` (CAD/drawings, scouting, experiments and legacy work). Account ownership is shown as source metadata, not separate navigation.
- Repository cards expose repository, commits, issues and releases links plus language, activity, stale/archive signals and a cached last-known catalog for weak connectivity.
- Supabase deployment was directly observed on 2026-09-06: updated `attendance` and new `github-repositories` Edge Functions both show a fresh live deployment. No SQL migration is required.
- All existing automated regression suites passed. The new Attendance + Engineering suite passed all 12 checks; TypeScript and Vite production builds passed.
- The authenticated local preview loaded all 10 repositories across both G3 sources. At 319px phone width it rendered without horizontal overflow and retained usable, single-column repository cards.
- The final web `dist/index.html` and synchronized Android asset `index.html` SHA-256 hashes matched (`CB8299A0DF6097DC856A8F2E82B97DC27C52114146C22EA01E1D50CFA35DAC6C`).
- Android native source compatibility was checked against the installed Capacitor 8 APIs. A command-line Gradle compilation could not be completed because the only command-line JDK is Java 25 while the repository Gradle runtime does not support class-file version 69; use Android Studio's configured compatible Gradle JDK for the signed build.
- Released build identity: Android version `1.8.0`, code `11`. The product owner confirmed the APK was created after exact preview acceptance and final asset synchronization; physical installation is not yet separately confirmed.

## Navigation + Calendar refinement — PRODUCTION WEB RELEASED; ANDROID APK BUILT

- Engineering Hub is a shared cross-department engineering system, displayed between FRC Departments and Team Operations rather than presented as a department.
- Team Media and Feedback Center are no longer duplicated inside Team Operations. They remain available in the web navigation and in the phone More area.
- Web navigation follows task flow: Home, Work, Skills Academy, Competition, Updates, Team Media, FRC Knowledge; Feedback Center is last. The G3 Assist menu entry is removed because the persistent assistant control already opens it everywhere.
- Engineering Hub has explicit readable hover/focus treatment rather than white text on its light special-card background.
- Saving an edited member profile produces a prominent, dismissible success notice.
- Calendar events are interactive in Month and Agenda views. Every permitted viewer can open full details; users with `manage_team_calendar` can edit or logically delete (cancel) an event using existing database policies.
- Event details resolve an individual audience to the member's display name instead of exposing an internal UUID.
- Migration `backend/supabase/calendar_event_management_20260906.sql` adds the permission-checked `cancel_team_calendar_event` RPC so cancellation can pass the visibility boundary and still trigger removal of the associated responsibility. It was directly executed in Supabase on 2026-09-06 and returned `Success. No rows returned`.
- TypeScript, Vite production build and all existing regression suites passed. The corrected web and synchronized Android `index.html` hashes matched: `6B4653EF7F0A94728FA903F1D8C7A47FA9419DB00E8FEB15FA8D2901C9DE24A7`.

## Non-regression contract

Every future change must preserve all of these behaviors:

1. Web and phone use the intended responsive layout. Never allow desktop card grids or tables to compress into one-character-wide phone columns.
2. Test the actual final bundle copied into `android/app/src/main/assets/public`; never assume a web build automatically reached the APK.
3. Pit Scouting renders once, only its own navigation tab is active, and the guided form remains readable on phone and web.
4. Competition Quality uses responsive cards on phone; no squeezed desktop table and no low-contrast secondary text.
5. Pit assignment controls fit the phone viewport, and an event team cannot be assigned twice without explicit removal/reassignment.
6. The active competition/district is visible on every event-specific scouting screen, but not forced into unrelated pages such as Match Library.
7. Home and Work responsibilities are one shared data flow. Do not create duplicate task widgets that disagree.
8. Navigation must open at the top, contextual Back must return to the originating area, and selecting one tab must not visually activate another.
9. FRC Departments and Team Operations start collapsed on phone and remain readable when expanded.
10. Buttons must have visible hover/pressed/focus states on web, readable labels on phone, and accessible contrast. Avoid white-on-white and dark-green-on-dark backgrounds.
11. G3 Assistant history opens the selected conversation, while closing and reopening the assistant starts a new conversation unless the user explicitly resumes history.
12. Quiz answer keys must never be stored in student-readable `training_assessments.questions`. Quiz grading remains server-side.
13. A single-answer quiz uses radio buttons; a multiple-answer quiz uses checkboxes and supports marking every correct option during authoring.
14. Database access control is authoritative. Hiding a button is not a permission boundary.
15. Never say a migration, deployment, APK, notification or live workflow is complete unless it was actually observed or the product owner explicitly confirmed it.

## Required validation gate for every phase

Before asking for a commit:

1. Inspect `git status`, the branch and the latest commits. Preserve unrelated work.
2. Build the web application with TypeScript and Vite.
3. Run all applicable verification scripts, including the existing Phase 1–2, Phase 4–5, Phase 6 and Skills Assessment checks.
4. Inspect the affected flow in the authenticated local preview at desktop and phone widths. Check English and Hebrew when text/layout changes.
5. If shared React/CSS changed, rebuild, copy the exact final `dist` bundle into Android assets, verify the Android index references that bundle, and increment the Android version once per release batch.
6. If SQL changed, validate that it is idempotent and execute it before testing dependent UI. Record whether execution was directly observed.
7. Test at least admin and student boundaries for permissions or assignment changes; include mentor/team leader when their behavior changes.
8. Report the exact product file count, exact file list, exact commit message, whether Vercel promotion is required, and whether a new APK is required.
9. Exclude `.idea` files, temporary Gradle caches, generated scratch data and test accounts from commits/releases.

## Exact remaining phases, in priority order

### Responsibility consistency + governed attendance — IMPLEMENTED; DATABASE MIGRATION VERIFIED; RELEASE PENDING

- Home and Work now use one shared responsibility-visibility rule. Completed, currently snoozed and expired meeting actions can no longer inflate the Home counter while remaining absent from the destination list.
- Attendance is consolidated into one center with Overview, Absence requests and authorized By meeting roster views.
- Members request absence only against an upcoming calendar event and must provide a reason.
- Active administrators and mentors receive a targeted persistent review action. This currently includes Tal Teren because she is an active mentor; the rule is role-based and does not hardcode a person's name.
- Approval and rejection both require a written reviewer response. The member receives a targeted persistent update, and every state is retained in absence history.
- Administrators and mentors can select a meeting, mark the applicable members present with accessible checkboxes, and save the roster with a required audit note.
- Re-saving a roster safely updates present members and removes only prior manually-entered attendance that is now unchecked; both outcomes are recorded in the attendance audit log. GPS/Wi-Fi records are never silently removed by roster editing.
- `absence_attendance_governance_20260907.sql` was executed in Supabase SQL Editor on 2026-09-07 and returned `Success. No rows returned`.
- Production promotion and Android installation are not yet confirmed. Keep this in the same pending release batch as the purchase governance dashboard.

### Purchase governance dashboard — IMPLEMENTED; DATABASE MIGRATION VERIFIED; RELEASE PENDING

- The existing Purchasing tab is now the single purchase-control dashboard; no duplicate navigation area was added.
- Clear status counts and filters cover awaiting review, approved, ordered, received and rejected requests.
- Request cards use strongly differentiated status colors, clear action buttons and a durable per-request audit timeline.
- Rejection requires a written reason; it is stored on the request, recorded in immutable status history and shown to the requester.
- Only administrators can transition purchase status. The database RPC validates every allowed transition, not only the visible buttons.
- Every successful transition creates a persistent requester update in Home/Updates and invokes push delivery. If push is unavailable, the persistent update, saved status and audit remain visible and the UI states this accurately.
- `purchase_audit_dashboard_20260907.sql` was executed in Supabase SQL Editor on 2026-09-07 and returned `Success. No rows returned`.
- Web/Android shared UI is prepared for Android `1.9.0`; production promotion and installation are not yet confirmed.

### Purchase-request reliability fix — RELEASED TO PRODUCTION WEB; ANDROID APK BUILT

- Corrected the browser validation defect that accepted `1.01` but rejected a quantity of `1`; purchase quantities now accept both whole and two-decimal values.
- Added explicit saving state, duplicate-submit protection and accessible progress messaging on web and Android.
- A successful database save is now confirmed immediately; push-notification delivery finishes afterward and reports its own success or failure without making the user wonder whether the request was saved.
- This change does not alter purchasing permissions: authorized team leaders and mentors may submit, while only administrators may approve, reject, order or receive.
- This correction is included in `ee3efbb` and the synchronized Android `1.8.0` bundle. Exact Vercel preview validation confirmed that quantity `1` is valid without creating a test request.

### Phase 1 — Skills Academy gradebook and progress dashboard — COMPLETE

Do not repeat this phase or quiz authoring.

Implemented, committed, promoted to production and installed on Android on 2026-09-06. The Supabase privacy and qualification migration was directly observed succeeding in the SQL Editor.

- Instructor gradebook with course, member and status filters.
- Student/course matrix showing assigned, not started, in progress, submitted, changes requested, passed, failed and overdue.
- Assessment drill-down with all attempts, answers, score, reviewer feedback and timestamps.
- Clear manual-review workflow for written responses and practical work.
- Student-facing progress summary: upcoming work, overdue work, attempts remaining, results and qualification progress.
- Course completion and qualification rules that use assessment/evidence outcomes without exposing private answer keys.
- Useful aggregate metrics and CSV export for authorized leaders.
- Responsive web and phone UX, including Hebrew.

Phase 1 acceptance requires one real admin-created quiz assigned to a QA student, a submitted single-answer and multiple-answer attempt, automatic scoring, one written/manual review, correct Home responsibility behavior, and no student access to answer keys.

### Phase 2 — Skills Academy learning automation — COMPLETE

- Due-soon and overdue reminders without duplicate notifications.
- Changes-requested and retry flow with correct remaining-attempt behavior.
- Pass/fail/qualification transitions and completion history.
- Optional achievements/certificates only after the underlying progression rules are reliable.
- Instructor visibility into members who are blocked or falling behind.

Implemented, committed, migrated successfully in Supabase, promoted to production and installed on Android on 2026-09-06: duplicate-safe due/overdue action refresh, changes-requested/retry escalation, immutable progress history, qualification history, mentor support queue and student timeline.

### Phase 3 — Full multi-role release acceptance — PREPARED, EXECUTION PENDING

- Execute the end-to-end matrix on web and installed Android for admin, mentor, team leader and student.
- Cover online/offline competition flows, task/notification delivery, permissions, assignments, purchasing, Skills Academy and scouting.
- Verify English/Hebrew, phone widths, desktop widths, scrolling, Back behavior and deep links.
- Remove QA accounts and QA data only after tests pass and only with explicit product-owner approval for the deletion.
- Produce a release checklist with evidence, not a verbal “looks good.”

The evidence checklist is `RELEASE_ACCEPTANCE_20260906.md`. Automated source regression suites and the production member-view smoke test pass. Real admin/mentor/team-leader/student execution remains pending.

### Phase 4 — Production hardening and scale — PARTIALLY STARTED

- Performance profiling and route/code splitting for the large web bundle.
- Error monitoring, Edge Function observability, retry/timeout classification and capacity reporting.
- Database index/query review, RLS audit and backup/recovery runbook.
- Accessibility audit and final cross-device polish.
- Competition-day operational drill and documented offline recovery procedure.

Heavy Skills Academy, Assistant and competition screens are now route-split; the initial JS bundle dropped from about 897 KB to 764 KB. Remaining hardening items above are still pending and must not be described as complete.

### Phase 5 — Skills Academy curated learning catalog — COMPLETE (FOUNDATION + STARTER CATALOG)

- Implemented the catalog schema, RLS, review states, metadata, approved-only member access and course-resource attachment controls.
- Added 12 reviewed starter resources from FIRST, WPILib, FRCDesign, Autodesk, CTR Electronics, Spectrum 3847 and The Compass Alliance.
- Added responsive Learning Library UI with search, domain/level filters, direct external links and administrator add/edit/review/retire controls.
- Added approved resources directly to course content through `CourseResourceShelf`.
- Migration executed, exact authenticated preview validated, production promoted and Android `1.5.0` installed on 2026-09-06.

Catalog enrichment remains normal content operations, not a missing implementation phase. Continue reviewing resources for underrepresented domains (mechanical, electrical, strategy/scouting, drive/pit, field build and publicity/awards) before publishing them. Broken-link automation and scheduled stale-content review belong to Phase 4 hardening.

### Phase 6 — Team Media — COMPLETE

- A governed media hub for robot photos, CAD renders/drawings, workshop progress and event albums.
- Supabase Storage policies, upload compression, captions/tags, permissions, retention and usable web/phone galleries.
- Keep robot engineering media and wider team/event media clearly separated inside one Team Media area.

### Phase 7 — Feedback Center — COMPLETE

- Student improvement ideas and bug reports with category, severity, screenshots, status, owner and administrator triage.
- Notifications and lifecycle visibility without mixing product feedback into normal team assignments.

### Phase 8 — Engineering integrations — READ-ONLY GITHUB FOUNDATION RELEASED TO PRODUCTION WEB; ANDROID APK BUILT

- Start with safe links and status summaries for GitHub and the selected CAD platform (for example Onshape), then add authenticated read-only integrations only where they provide clear value.
- Do not expose repository/CAD secrets or attempt full in-app replacement of those specialist tools.

## Next actions

1. Install Android `1.8.0` on a physical phone if not already installed, then explicitly confirm installation.
2. Physically validate GPS and School Wi-Fi check-in/check-out at the school; this cannot be marked complete from remote source/UI checks.
3. Execute the real multi-role acceptance matrix in `RELEASE_ACCEPTANCE_20260906.md`. Do not delete QA users/data without explicit approval.
4. Complete remaining production hardening: observability, database/index/RLS review, accessibility/cross-device audit, catalog link/staleness monitoring, backup/recovery documentation and the competition-day offline recovery drill.

## Definition of truth

- “Implemented” means committed code exists.
- “Verified” means an automated check or direct UI test passed against the final bundle.
- “Deployed” means the product owner or deployment system confirmed production promotion.
- “Phone released” means the product owner confirmed the newly versioned APK was installed.
- Anything else must be described as pending or unverified.

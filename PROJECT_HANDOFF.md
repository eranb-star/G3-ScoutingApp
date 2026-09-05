# G3 Scouting App — Authoritative Handoff

Last updated: 2026-09-05 (Asia/Jerusalem)

This is the single source of truth for resuming development. Read this file before changing the app. Do not reconstruct the roadmap from chat memory.

## Exact current state

- Working branch: `web-portal-preview`
- Latest pushed product commit: `43f0d13 Build secure Skills Academy quiz and assessment engine`
- Production web promotion: confirmed complete by the product owner on 2026-09-05.
- Signed APK installation: confirmed complete and visually acceptable by the product owner on 2026-09-05.
- Local product changes after `43f0d13`: none.
- Local non-product changes: Android Studio may modify `android/.idea/deploymentTargetSelector.xml` and `android/.idea/misc.xml`. Never include these files in a product commit.
- The live execution of `backend/supabase/skills_academy_quiz_engine_20260905.sql` was not independently observable from the repository. Confirm its behavior with the Phase 1 smoke test before extending its schema; do not rerun it blindly merely because this file cannot prove execution.

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
- Secure quiz engine: private answer keys, single-answer questions, multiple-answer questions, written answers, automatic server grading, manual review, due dates, passing score and attempt limits.
- Competition assignments, replacements, event context, live command state, pit display and offline competition cache/control.
- Guided offline pit scouting, event-scoped pit teams, unique pit assignments, verification/conflict review and separation of pit evidence from match evidence.
- Advanced scouting coverage, analysis, quality views, picklist evidence and worldwide TBA match/video library.
- G3 Assistant multimodal/history/knowledge workflows previously implemented. Provider capacity remains an external operational risk and must not be presented as a UI-only defect without checking function logs.

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

### Phase 1 — Skills Academy gradebook and progress dashboard

This is the next implementation phase. Do not repeat quiz authoring.

- Instructor gradebook with course, member and status filters.
- Student/course matrix showing assigned, not started, in progress, submitted, changes requested, passed, failed and overdue.
- Assessment drill-down with all attempts, answers, score, reviewer feedback and timestamps.
- Clear manual-review workflow for written responses and practical work.
- Student-facing progress summary: upcoming work, overdue work, attempts remaining, results and qualification progress.
- Course completion and qualification rules that use assessment/evidence outcomes without exposing private answer keys.
- Useful aggregate metrics and CSV export for authorized leaders.
- Responsive web and phone UX, including Hebrew.

Phase 1 acceptance requires one real admin-created quiz assigned to a QA student, a submitted single-answer and multiple-answer attempt, automatic scoring, one written/manual review, correct Home responsibility behavior, and no student access to answer keys.

### Phase 2 — Skills Academy learning automation

- Due-soon and overdue reminders without duplicate notifications.
- Changes-requested and retry flow with correct remaining-attempt behavior.
- Pass/fail/qualification transitions and completion history.
- Optional achievements/certificates only after the underlying progression rules are reliable.
- Instructor visibility into members who are blocked or falling behind.

### Phase 3 — Full multi-role release acceptance

- Execute the end-to-end matrix on web and installed Android for admin, mentor, team leader and student.
- Cover online/offline competition flows, task/notification delivery, permissions, assignments, purchasing, Skills Academy and scouting.
- Verify English/Hebrew, phone widths, desktop widths, scrolling, Back behavior and deep links.
- Remove QA accounts and QA data only after tests pass and only with explicit product-owner approval for the deletion.
- Produce a release checklist with evidence, not a verbal “looks good.”

### Phase 4 — Production hardening and scale

- Performance profiling and route/code splitting for the large web bundle.
- Error monitoring, Edge Function observability, retry/timeout classification and capacity reporting.
- Database index/query review, RLS audit and backup/recovery runbook.
- Accessibility audit and final cross-device polish.
- Competition-day operational drill and documented offline recovery procedure.

## Tomorrow’s first actions

1. Read this file and run `git status` and `git log -3 --oneline`.
2. Confirm only the two `.idea` files are dirty; do not commit them.
3. Run a small live Skills Academy smoke test to confirm the secure quiz migration is active: create a temporary quiz, verify single/multiple answer authoring, and confirm a student submission reaches server-side grading. Do not create additional production test data if an existing QA course can be reused.
4. Begin Phase 1 only after that smoke test passes.
5. Batch Phase 1 web and phone work into one release so only one Vercel promotion and one signed APK are needed.

## Definition of truth

- “Implemented” means committed code exists.
- “Verified” means an automated check or direct UI test passed against the final bundle.
- “Deployed” means the product owner or deployment system confirmed production promotion.
- “Phone released” means the product owner confirmed the newly versioned APK was installed.
- Anything else must be described as pending or unverified.

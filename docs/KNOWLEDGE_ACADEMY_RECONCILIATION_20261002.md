# Knowledge and Academy workflow review — 2 October 2026

Status: the user subsequently authorized all documented changes. Implementation/release evidence is tracked in KNOWLEDGE_ACADEMY_RELEASE_20261002.md. The review findings below describe the pre-change state. Findings are code-based; duplicate-resource counts, live policy settings and learner frequency have not been audited.

## Agreed direction

Keep FRC Knowledge and Skills Academy as adjacent destinations. Knowledge supports engineering research, troubleshooting, rules and reusable team solutions; Academy supports assigned learning, demonstration, feedback and qualification. Do not bury operational reference access under courses. Shared resources can have multiple entry points without duplicating their maintenance.

Rename Knowledge's misleading "Learn from real robots" to a research-oriented label such as "Research robot designs". The shared CAD tool should be described consistently as "Explore robots in 3D". Connect reviewed robot records to the matching imported model only when one exists; otherwise retain clearly labelled original CAD/source links.

Use shared source identities/revisions with separate teaching metadata, not an indiscriminate table merge. Source verification, approval for teaching and student qualification are distinct states. Knowledge search should expose collection/status distinctions through labelled results and filters; document maintenance remains permission controlled. Avoid nested duplicate navigation.

## Confirmed existing capabilities — do not rebuild

Selected source passages already hand off to G3 Assist with evidence IDs and index generation. Knowledge search already includes team articles and resolved issues. Guided lessons already save dirty drafts before their explicit CAD-launch action. Prepared practical lessons, quizzes, reviewer rubrics and qualification already exist. The same 3D lab already returns observations to a guided lesson draft. Its limitations below are not evidence that the whole workflow is missing.

## First two review passes: agreed improvements

1. P1: Context-aware CAD entry from lessons/research. Current lab defaults to Darwin/all systems; pass robot revision, subsystem and activity, preserving return context.
2. P1: Reliable CAD observation capture. Current lab notes live in component state; lesson attachment appends to the first practical response. Persist notes with model/part provenance, protect unsaved work, and select the actual target demonstration.
3. P2: Group passages by source document. Current results count/display passages; repeated passages can appear as distinct choices. Keep access to individual citations and existing evidence handoff.
4. P2: Source-change impact review. Connect source revisions to dependent lessons; flag affected teaching material for responsible review. Do not rewrite lessons or invalidate historical qualifications automatically.
5. P3: Relevant learning discovery beside research results: existing courses, workshop and matching CAD, clearly separated from evidence. No duplicate AI assistant or new generic resource portal.

Recurring important resolved issues can inform an instructor-reviewed exercise using existing authoring. Do not automatically create a course for every issue.

## Acceptance boundaries for future implementation

Assign lesson → open relevant model/system → inspect → capture observation → choose target demonstration → return with draft intact. Research → matching CAD → return with query/filters intact. Referenced CAD remains reference geometry, not proof of installed wiring or physical competence. Preserve existing AI budgets/roles, explicit prepared-pack enrollment, server grading and human practical review. Verify both EN/HE and reload/back/deep-link behavior. Do not claim implementation merely because this plan is committed.

## Third pass: additional concrete gaps

These are static code findings, not claims of newly reproduced production incidents. Implementation remains pending.

### P1 — Restore the instructor's resource-attachment entry

`TrainingCenterPage.tsx` exposes the catalog through Explore, which clears instructor mode. The catalog requires instructor mode for choosing a course, and `canEdit` (also instructor-only) for attaching resources. Instructor navigation exposes courses/assignments, review and progress, but no catalog action. Thus the ordinary visible navigation does not reach the existing course-resource attachment controls with their required state. This is a workflow regression/gap, not a request to build another catalog.

Acceptance: an authorized instructor opens a course, chooses Add reference, selects an existing resource, and sees it in that course. Learners retain browsing without attachment authority. Preserve backend permission checks; do not broaden roles to compensate for navigation.

### P1 — Protect lesson work during internal navigation

`PracticalLearning.tsx` protects browser unload and saves before its explicit CAD launch. Parent navigation in `TrainingCenterPage.tsx` can instead unmount the lesson through local view changes, without that save/leave guard. Unsaved answers can therefore be lost when switching to Explore or another workspace. This extends the already recorded observation/draft protection issue; it is not evidence that drafts never save.

Acceptance: dirty lesson → Explore, My learning, Instructor workspace, another course, browser Back and CAD → return. Save or an explicit leave decision must preserve intent; failed saves must not silently discard work. Include Hebrew and learner-preview behavior.

### P1 — Make next-action and progress states consistent

`AcademyHome.tsx` takes assessment submissions but no legacy module evidence. It identifies corrections only through latest `changes_requested` attempts and recommends the first non-qualified course, without distinguishing a failed quiz needing another attempt from work awaiting mentor review. Module-only courses can display an unhelpful 0/0 assessment count.

`SkillsGradebook.tsx` derives waiting/correction flags from any historical attempt, whereas the home uses the latest assessment attempt. A historical correction can remain a course attention signal after a later passing attempt when other requirements remain incomplete. This concerns displayed guidance; it does not establish that database qualification is incorrect.

Acceptance: shared interpretation of current actionable states across home, course and gradebook, while retaining full attempt history. Cover failed quiz with/without attempts remaining, submitted practical work, legacy module feedback, corrected-and-passed work with another requirement incomplete, and full qualification. Show the specific next activity or Awaiting review, rather than a generic Continue for every unfinished enrollment. Reuse existing grading/review, do not replace it.

### P2 — Preserve shareable course and activity context

`TrainingCenterPage.tsx` reads URL parameters but `openCourse` and view changes update local state without updating the URL. The visible course/activity can therefore diverge from a copied link or reload, and browser Back does not represent those local navigation steps.

Acceptance: copying a lesson/feedback link, reloading, and Back/Forward restore the intended authorized course/activity. Cross-links from Knowledge and CAD must preserve this context. Never put draft answers or personal feedback text in URLs.

## Recommended implementation order

1. Repair the existing instructor attachment flow, protect unsaved work, and reconcile actionable progress states.
2. Add stable course/activity navigation together with the already agreed contextual CAD entry and reliable observation attachment.
3. Improve research result grouping and shared source/revision linkage, including affected-lesson review.
4. Add contextual learning suggestions only after the underlying links and progress states are reliable.

Do not present these as new versions of already delivered AI controls, course authoring, review queues, CAN lessons, VR or qualification. Keep Knowledge accessible independently of Academy. Shared discovery must respect each destination's permissions; an accessible reference does not imply permission to use paid AI or edit a course.

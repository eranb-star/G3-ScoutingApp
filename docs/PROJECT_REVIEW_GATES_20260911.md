# Mentor review checkpoints

## Delivery
Run `backend/supabase/project_review_gates_20260911.sql` after the previously confirmed project/dependency/synchronization migrations. This additive migration creates no gates for existing tasks.
Commit/push 12 files, excluding the two Android .idea files. Suggested message: `Add revision-based mentor review gates and enforced stage approvals`.
Review the new preview before promotion. Keep one consolidated APK after acceptance; no Android changes are prepared in this batch.

## Configure the flow
1. Work → Team projects → select CAD, Mechanical or the appropriate team.
2. Create or choose an unfinished task representing the review milestone—for example, **Release intake CAD revision**.
3. Expand **Mentor review checkpoint → Enable mentor review**. Select an active mentor/admin and enter concrete acceptance criteria; Save checkpoint.
4. On **Manufacture intake**, expand Prerequisites and link the review milestone. Do this before the dependent work starts. Ordinary task links remain advisory; review checkpoint links enforce approval.
5. The author opens the review checkpoint and chooses **Submit for review**. Enter a unique revision label, a fixed HTTPS drawing/evidence link and relevant test findings. Submit for mentor review.
6. The mentor finds **Awaiting your review** on Home/Work and chooses Review submission. In Projects, inspect the exact revision and criteria, write findings, then Approve revision & release or Request changes.
7. Approval marks the milestone task complete and releases the dependent stage. Changes requested leaves it unreleased; the author submits a new revision.

Not every task needs a gate. Use gates at actual handoffs: design → fabrication, prototype → final manufacture, wiring review → installation, or validated software → robot release. This phase uses existing project tasks; the separate season roadmap is not automatically converted or synchronized into review gates.

## Changes, exceptions and history
- Approval is attached to the submitted revision and criteria snapshot. A new revision replaces the current release; previous submissions/decisions remain in history.
- Reopening an approved milestone or changing its criteria clears current approval. Reopen a completed project before revising its milestone.
- No self-approval. A reviewer who needs to submit their own work must select another mentor.
- Authorized managers may reassign the reviewer, with a written reason. Current assigned reviewer decides; original submission reviewer remains recorded. Inactive or non-mentor accounts cannot approve.
- Admin emergency override requires a reason, is visibly labelled, and completes the checkpoint. It does not pretend to be mentor approval.
- Admin may withdraw an accidentally enabled checkpoint only before any submission, with an audit reason. Review history is retained. Submitted gates cannot be withdrawn; protected review links cannot be unlinked to bypass them. Archive reviewed records rather than hard-delete them.
- A revised approval does not undo physical work already performed. Existing downstream status remains, with prerequisite warnings; subsequent start/completion transitions require the renewed release.
- The app stores revision identifiers and links, not immutable copies of external CAD files. Use a version-specific URL and preserve that external revision.

## Acceptance in preview
Use clearly designated QA work rather than approving a real design that has not been reviewed.
- Create one review milestone and one dependent task; enable/link before starting the dependent task.
- Student/author submits revision A. Attempt to start dependent task: it must refuse with the approval explanation.
- Assigned mentor requests changes. Author submits B. Mentor approves B; milestone completes, mentor queue clears and dependent task can start.
- Submit C or reopen the approved milestone: further dependent completion must be blocked until a new approval.
- Confirm the revision/decision history and named actors. Do not use the emergency override simply to bypass acceptance testing.

## Verification and boundaries
TypeScript and production Vite build passed; existing chunk-size warning remains. PGlite runs actual SQL/functions with representative source RLS and covers ordinary tasks, authorized configuration, mentor role and self-approval, URL validation, direct API enforcement, revision uniqueness, stale decisions, request-changes/resubmit, reviewer reassignment, changed criteria, emergency override reasons, source completion and dependency state, project completion/manual reopening, unused withdrawal, privacy, retained history and rerun. Desktop and Hebrew mobile fixture showed no panel overflow and a written reason was required before enabling approval.
Live multi-role acceptance remains pending. PGlite does not test concurrent database sessions; lock contention may abort an operation for retry rather than commit an inconsistent release. No new background job, paid service, file storage or automated approval. Queue refresh follows existing navigation/focus/local-change behavior, not guaranteed instant delivery across devices.

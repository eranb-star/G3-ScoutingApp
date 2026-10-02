# Skills Academy navigation and language release — 2 October 2026

User approved production release after the Academy prototype review. This supersedes the review-only status in ACADEMY_UX_REVIEW_20261002.md. Release deployment identity will be recorded after production verification.

## Delivered scope

- Default My learning: own assigned courses, next action, latest requested corrections and required-assessment progress. Existing qualification remains authoritative; no fabricated completion or automatic enrollment.
- Explore: existing learning library, real Robot learning lab and available courses. CAD entered from a guided course can return evidence to that course's saved draft. Standalone exploration does not create an assignment.
- My progress: existing gradebook restricted to the signed-in member even when that member has instructor permissions.
- Instructor workspace: existing authorized course creation and editing, course assignment, cross-course review including legacy module evidence, and team progress for permitted reviewers. Team-leader management scope remains separate from mentor validation permission.
- Prepared course contracts remain immutable in generic editors. Guided review opens the exact submitted practical and rubric. Learner layout preview does not impersonate another account, submit results, save drafts or attach CAD evidence.
- Production language comes only from Settings. Bilingual persisted course/assessment fields are rendered in the selected language. Quiz values and answer keys are unchanged. Known generated bilingual feedback is localized; human-authored feedback is not silently translated. Missing translations are explicitly identified. Existing bilingual course/module/assessment title and instruction edits preserve the other language.
- Existing robot-test entry links remain compatible; reliability is linked from that workbench. Simulator, VR, CAD assets, provider, budget, database policies and APK are unchanged.

## Implementation limits and regression rules

This is a navigation and presentation release on existing persistence. It does not introduce draft/publish workflow schema. Custom assessment publishing retains its previous assignment behavior; prepared packs retain explicit enrollment. Do not describe the prototype's separate Publish action as shipped. No new database migration is required.

Never localize stored quiz-option identity: localize labels only. Never store display-localized course objects back as source content during reordering. Learner preview is read-only presentation, not an authorization feature; server policies remain the boundary. Do not flatten instructor and student destinations back into eight competing tabs.

Single-language author content remains in its original language; translation is not invented. Published reference documents retain their original language. Native phone/VR/headset acceptance is not claimed by desktop browser checks. APK remains version 2.2.0 / code 24.

## Validation

TypeScript, Vite production build (existing large-chunk warnings), team-learning PostgreSQL fixture, robot-learning regression, gradebook verification and new language regression pass. Language tests cover preferred display, missing translation, preserved answer identity, preservation of the other authored translation and exact generated-feedback conversion.

Actual component local browser checks: student has three primary destinations and no instructor tools; Continue opens the guided course; Hebrew instructor entry exposes course authoring/review/progress; course creation opens and submits against synthetic local data. No real student assignments or results were created for acceptance.

Production verification and release hashes: pending deployment.

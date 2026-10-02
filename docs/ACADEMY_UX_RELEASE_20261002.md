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

Live acceptance caught CRLF/whitespace variants around the legacy `---HE---` separator in production records. The shared parser now accepts LF, CRLF and space-delimited legacy records; editing preserves their separator and other translation. The added regression cases cover each format. Do not regress to a literal LF-only split or trust synthetic fixtures as proof of live stored-data format.

Final production deployment: `75dcEE3xV46FfgV8UaXcLYsQ3aGz`, source `4a0065c5947571001267b2113ae3fad4b2a64365`, Ready and aliased to https://g3-6740.com on 2 October 2026 at 16:09 Asia/Jerusalem. Main implementation commits: `6da5672` and `b307297`. Rebuilt using production environment through Vercel promotion; no database migration.

Initial navigation release b1b72fc / BhNTnsicVtJbVJdEfUhoceaWRYX8 is superseded. Final live acceptance: cold My learning landing; authorized Instructor workspace and cross-course review; Settings Hebrew switch; all six prepared course titles/descriptions without mixed-language separators; Explore → real guided lesson → ten-question Hebrew quiz. Submission correctly disabled for an unassigned account. Settings restored to the original English preference. No production course, assignment, quiz attempt or practical evidence was created by these checks.

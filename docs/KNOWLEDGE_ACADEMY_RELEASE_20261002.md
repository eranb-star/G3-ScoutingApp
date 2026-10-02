# Connected Knowledge and Academy — 2 October 2026

User authorized all changes from KNOWLEDGE_ACADEMY_RECONCILIATION_20261002.md. Released to https://g3-6740.com on 2 October 2026; authenticated read-only acceptance completed.

## Implemented

- Separate adjacent sidebar destinations: Knowledge for research/reference and Academy for learning/qualification. Embedded Knowledge screens no longer repeat their outer hero/navigation. Reviewed robot search is named Research robot designs.
- Add reference in authorized course editing opens the existing catalogue with course and instructor context; return goes back to the course. Existing backend scope remains authoritative.
- Course, view, instructor mode, guided step and CAD lesson context are URL-backed with Back/Forward behavior. URLs do not contain answers. Learner preview remains presentation-only and cannot attach evidence.
- Guided lesson edits have account/course-scoped tab recovery and debounced cloud saves. Fast internal navigation restores the local draft; failed cloud saves retain recovery and expose retry. Save completion cannot clear a newer edit in the same component. The recovery copy is sessionStorage, not a second remote database or cross-device offline synchronization service. Closing the tab before cloud save can lose that recovery copy; explicit save remains available.
- Home and gradebook interpret current assessment attempts and legacy module feedback together. Old corrections after a passing attempt no longer create attention flags. Home distinguishes retry, attempts exhausted, awaiting review, requirements complete and qualified, and opens the relevant guided step. Server qualification is unchanged.
- Power/CAN lessons open the matching CAD subsystem. Research links only match known robot names/team/season, not team number alone. Published CAD reference revision is explicit; other source/CAD links remain original external links.
- CAD notes persist in the current tab with source revision URL, subsystem and selected part path. Students choose the target practical demonstration; attachment merges with the current draft and returns to Demonstrate. A CAD observation remains explicitly different from a physical demonstration. No simulation/VR/geometry code changed.
- Source search groups the entire matching corpus by source version before paging: ten source versions per page, up to three matching excerpts per source, accurate total source/passages counts. Citation IDs and generation-bound G3 Assist selection remain unchanged. Extra passages remain available in the original source. The legacy passage RPC remains available for old clients.
- Existing course and prepared lesson references resolve to shared document URL/hash identities. Instructor teaching reviews are append-only and checked against the current revision; source changes flag affected course references. Removed references stop participating automatically. Sources without a tracked official-document revision explicitly require manual checking. No lesson rewriting or qualification invalidation.
- Relevant existing course suggestions accompany Knowledge keyword results, clearly separated from evidence and without automatic enrollment.

## Database

Additive migrations: `academy_source_reviews_20261002.sql` and `knowledge_document_search_20261002.sql`. Apply together in one transaction. Review table has RLS, course-scoped management checks and no direct write policy. Helper RPC is inaccessible to clients; review RPC rejects stale or unattached revisions. Search retains the existing research-access check, filters and query limits. AI roles/budgets are unchanged.

Live production prerequisite inspection confirmed referenced columns and the current `has_permission` and `search_frc_corpus` definitions. Combined migration passed a rollback-only transaction, then both migrations were applied together successfully to production project `hnqwhuuxlqfyawqymaaz`. No enrollment, assessment submission or qualification was seeded or changed. A malformed editor-paste attempt failed before the successful transaction; for multiline Monaco SQL use a new blank snippet and clipboard paste, then inspect the query before running.

## Validation and regression lessons

New isolated PostgreSQL/behavior suite: latest-attempt guidance, exhausted retries, waiting review, legacy module corrections, corrected historical attempts, exact robot matching, source grouping, bounded/non-repeating document pagination, teaching revision changes, stale/removed-source rejection and denied permissions. Existing team-learning, robot-learning and language suites pass. TypeScript and Vite build pass; existing large-chunk warnings remain.

Actual-component synthetic browser acceptance: instructor Add reference preserves course and instructor state; lesson → Explore → browser Back restores an unsaved second-demonstration answer; power lesson → CAD carries power context; attaching CAD notes to the second demonstration updates that response and returns to step 2. These are local synthetic checks, not fabricated student production records.

Preserve English/Hebrew source strings and original quiz values. Do not reset CAD context to all systems after the model finishes loading. Do not collapse course navigation back into component-only state. Do not equate passage counts with document counts. Never infer a different robot redesign from team/year alone. Imported revision review does not certify the real robot's wiring or safety.

## Release and rollback

Implementation commit: `4716ac434c9bee00f8c545a0ae3fac6308469661` on `codex/release-1-qa`; equivalent production source `0c1d06aba6a2612db47e4d423be28be88b8f89d3` on `codex/knowledge-protection-release`. Both pushed. Production deployment `CUSBK5AWY7JAB9c83uiQdgFDKsrw` is Ready and assigned to `g3-6740.com`, built using the Production environment through Vercel promotion (not a Preview alias). Preview build: `3dmgTmyHEh5o5LVpz6ooF6MtWK7P`. Exact release TypeScript check and hosted build passed.

Authenticated production acceptance: adjacent Academy/Knowledge navigation; battery search returned 375 source versions / 1,413 passages with grouped excerpts and 38 pages; citation handoff links retain evidence IDs and generation; Power course source-status RPC rendered its two WPILib references as manual/untracked; Add reference retained the selected Power course and instructor controls, loaded the 12 approved catalogue resources, and Return to course restored the course URL. No catalogue attachment, teaching approval or student submission was written merely to test production. Mutation paths are covered by isolated PostgreSQL and synthetic local checks. Production screenshot: `docs/staging/knowledge-academy-production-20261002.png`.

Known data boundary: source grouping uses imported source-version identities. Existing separate imported URLs, including query-string variants of the same manual, can remain separate source versions; this release does not destructively merge corpus records or citation IDs. External-source revision tracking remains manual as explained above.

Previous website release source: `4a0065c5947571001267b2113ae3fad4b2a64365`, deployment `75dcEE3xV46FfgV8UaXcLYsQ3aGz`. Rollback can restore that website while leaving the additive database objects in place; old clients retain their original search RPC. Do not delete teaching review history to roll back UI.

APK remains 2.2.0 / code 24. This change does not rebuild Android or claim physical phone/Quest/workshop acceptance.

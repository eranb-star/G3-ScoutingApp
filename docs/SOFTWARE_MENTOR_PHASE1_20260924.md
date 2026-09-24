# Software Mentor phase 1 — implementation checkpoint, 24 September 2026

## Authorization and repository decision

User selected the recommended Software Mentor phase (“start phase 1”), not the old numbered engineering-controls acceptance workstream. Further simulator development remains deferred. User does not yet know the new offseason software repository because preparation has just begun. Proceed using clearly labelled public historical team code; never present the 2024 code as the current robot.

Verified public organization repositories: GlueGunAndGlitter/6740_robot_2024, 6740_offseason_robot_2024 and Dive_Bot. Live adapter resolved 6740_robot_2024 main to `6d5694217412633b1055e5ff2c3ac9a7adf92f78` and returned its real source-file tree. New offseason/private repository access is not established. No new credentials requested or stored.

## Implemented first bounded increment

Existing G3 Assist now has Software Mentor code context, reusing the Engineering Hub catalogue. Choose repository, branch/tag/commit, purpose (explain, investigate, compare revisions), and up to six source files. Branches resolve to immutable SHA before sending. Change review reads both revisions of the selected files; this is not a whole-repository/PR impact analysis. Public team owners are allowlisted. Files are capped at 24 KB each and combined source context at 22 KB; hidden/generated/unsupported files and symlinks are excluded. Visible limitations and missing-file failures prevent silently claiming comprehensive analysis.

The Edge adapter performs at most 18 GitHub reads per context, with bounded responses/timeouts and a 2 MB / 32 object / 10 minute immutable-public-object cache. Repository visibility is checked live. No GitHub credentials, cloning, execution, background indexing or paid preprocessing. The existing metered Gemini call handles answers; Admin topic exemption, role gate, purpose checks, $25 application budget, cancellation/idempotency remain. Source/comments are untrusted data. Credential-pattern detection is a precaution, not proof that arbitrary source is secret-free.

Code answers must cite supplied file/line ranges. Invalid/absent code references are withheld without an automatic paid retry. Range validation proves an available location, not that every claim is semantically correct. The prompt distinguishes facts, hypotheses, missing logs/hardware, tests and next action. Historical code questions do not require a current official game manual unless the question asks about rules/legality/scoring.

Conversation context is saved in a new nullable `ai_conversations.software_context` JSONB column. Ownership RLS remains; caller-supplied and stored context are validated server-side on each read. A conversation cannot silently change code revisions. JSONB key-order normalization is covered by regression tests. Start New to select newer code.

Findings can be saved through existing knowledge/issue actions or prepared for an existing task's mentor checkpoint. Handoff reuses `reviewDraftKey`, preserves code links/commit IDs and AI-labelled notes, refuses to overwrite existing drafts, and does not submit/approve a review automatically. Existing submission permissions, reviewer assignment, conflict checks and acceptance requirements remain.

## Validation so far

- TypeScript frontend check, frontend build and bundled Edge build passed.
- `test-software-mentor.mjs`: exact revision resolution; public-only/owner/path limits; tree truncation; excluded symlinks/credential patterns; context limits; correct/invalid code citations; two-revision evidence; actual additive migration applied twice; ownership RLS and JSON shape constraints.
- `test-g3-assist-access.mjs`: existing actual-handler access/budget tests, new prepare-action denial, successful saved code context, JSONB-reordered follow-up, rejected revision switch, withheld invalid line reference, and historical code explanation without false official-rule dependency. Provider calls are mocked in these tests.
- Actual GitHub prepare and source retrieval succeeded against the team 2024 repository, without AI generation. ShooterSubsystem.java contained 121 lines; the bounded prompt was 4,969 characters.
- Browser preview verified repository/file selection, immutable-context presentation, synthetic answer/source links, existing-task handoff navigation and Hebrew RTL desktop layout. Preview is explicitly labelled synthetic/no paid calls. Physical phone acceptance and narrow viewport verification are not claimed.
- Additive migration applied successfully to isolated QA `cyooubycafubbnkjcqlw`; column verified as JSONB. Final Edge bundle deployed to QA through the editor, with complete source compared after normalizing line endings. After reload, persisted QA source matched the final bundle. No production changes in this checkpoint.

## Remaining before production release / phase completion

1. Verify authenticated hosted GitHub prepare/context behavior; extend test fixtures for representative command/subsystem/build-version questions and compare-revision cases.
2. Run bounded real-model questions against real selected source; inspect claim support, citations, follow-ups, durable history and settled cost. No live paid answer quality acceptance has occurred yet.
3. Verify actual Projects review draft consumption (not only navigation), declined/unauthorized task flows, narrow-screen EN/HE and restore/reopen behavior.
4. Prepare isolated production candidate. Apply additive migration first, deploy exact Edge bundle, then frontend; verify authenticated production workflow and document deployment/source IDs. Do not deploy main wholesale. Roll back function/frontend together if needed; nullable column may remain.
5. Connect the actual offseason repository when the team identifies it. Private repositories require separately scoped server-side access and repository ACL design; no shared-token widening or treating the public-only prototype as private-access support.

This is the first selected-file implementation, not a completed autonomous software mentor. Whole-repository dependency-aware retrieval, PR discovery/full diff coverage (including removed files), logs, executing builds/tests, code generation/patches and robot deployment are not delivered by it. Log diagnosis and bounded coding assistance remain subsequent increments. No simulator, APK, robot actuation or production billing changes.

## Review artifacts

Local UI preview: http://127.0.0.1:4240/ (synthetic responses). Local release transport: http://127.0.0.1:4241/handler (reviewed source, no credentials). These are development helpers, not production endpoints.

## Flow clarification — 24 September 2026

User found the oversized Software Mentor card and separate welcome/composer confusing. Fixed positional grid sizing (third child was incorrectly given remaining height), moved the optional code picker into the composer immediately above the labelled question, collapsed attached revision/file details, added close-picker and explicit non-submit buttons, and focused the question after attaching files. Selecting repository/purpose/files never starts paid analysis; a question and Send are required. Existing question text is preserved.

Verified TypeScript and diff checks; desktop synthetic browser selection through attachment confirmed no answer is generated and question receives focus. This follow-up has not been deployed. Real-model and mobile acceptance gates above remain. User will identify current offseason software with the team at the workshop; do not repeatedly request that information remotely.

Phase 2 refers to log diagnosis. Sample-based importer development is possible without team logs, but actual team diagnosis cannot be validated without logs, signal definitions/units and relevant code/configuration. Recommended alternative (not yet selected for implementation): extend the existing official season-document lifecycle. Source inspection confirms knowledge-source-check currently discovers links and hashes PDFs but explicitly does not index/review their content. Bounded next deliverable: supported-document extraction, version/page provenance, searchable publication, retry/progress and stale-version handling feeding existing search/Assist. Reuse Check now and existing controls; no frequent polling, second knowledge system or historical-corpus rebuild. Broad existing estimate 6–10 engineering days remains provisional.

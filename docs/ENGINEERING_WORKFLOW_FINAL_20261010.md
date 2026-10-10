# Engineering workflow implementation contract

Approved: complete the final design and follow-up review end to end. Keep GitHub read-only, existing AI permissions/consent and budgets, existing Projects/tasks, test records, CAD Mentor and Studio planner. No robot deployment, paid service, APK or new permission grants.

## Acceptance checklist
- [x] Hub separates Robot Software, CAD Mentor and Engineering Sources. General catalogue is not inside Code & review.
- [x] Code task has repository actual default branch, objective prompts, advanced exact revision, optional base/target change review, visible next action.
- [x] Selection changes invalidate prepared context. Resolve immutable revisions, retrieve bounded evidence, preview exact files/ranges before AI; failures never fall back to generic answers.
- [x] Compare selected changes with base/target evidence; additions/deletions and limited review scope are explicit. Unpublished laptop changes require publication to connected GitHub first.
- [x] Review reuses Assist, private history, existing shared reviewed-task flow; return path and question persist. Follow-ups reprepare automatic evidence at same revision; no silent latest switch.
- [x] Logs remain usable without code. Current context is not assumed to be deployed code.
- [x] Autonomous shows supported target, direct Engineering planner entry/return, independent simulator model, drive/wait versus unsupported mechanisms, manual build and physical test distinction.
- [x] Tests preserve originating route; optional explicit use of working revision, existing evidence/immutable retests; software evidence links stay in Engineering.
- [x] Draft recovery/navigation warning, AI request recovery, clear access/errors, EN/HE and responsive controls.
- [ ] Focused authorization/evidence tests, type/build and required CI, browser workflow verification, production deployment and checkpoint.

Source review is bounded (up to six supported files). Never claim whole-repository analysis, a successful build, physical acceptance or cross-device availability of local files. Reuse saved conversations and team tasks; no new parallel review database. Record production acceptance separately from synthetic validation.

## Implementation and verification

Implemented the three top-level Engineering destinations and four software tabs. Code preparation resolves the actual default branch or explicit ref. Change preparation compares exact complete trees rather than GitHub's merge base; shows added/modified/removed or excluded-side paths, with a six-file selection and base/target numbered excerpts. Renames appear as removal/addition; unsupported/generated/oversized files remain explicitly outside scope. Unpublished laptop changes are not accessible.

Preparing evidence is a read-only endpoint, guarded by existing member/Assist/private-code permissions; it does not call Gemini. Run review re-fetches the immutable evidence server-side, preserving spending controls. Changing the question invalidates the preview. Automatic follow-up selection stays at the same commit; the server permits new file scope but rejects changed repository/base/target/mode. Existing saved private conversation and reviewed-task handoffs remain in use. Draft metadata/question uses member-scoped session storage; raw preview code is not persisted there.

Autonomous opens the existing Engineering planner and has a return link. OFFSEASON_2026 drive/wait support and the independent simulator model are explicit; other repositories are not silently relabelled. No GitHub Actions or robot writes were enabled. Test links preserve Engineering vs Academy origin; associating a working commit is an explicit user choice. Test forms have local recovery and an in-page navigation warning; local drafts are not shared outcomes. Existing refresh/close warning remains.

Verified before release: exact-tree additions/deletions, two-revision evidence budget, default branch resolution, frozen follow-up identity, private allowlist/access/citation boundaries, TypeScript and production build. Synthetic browser journey exercised preparation (0 AI calls), explicit Run review (1 synthetic call), changed-question invalidation, base/target previews, denied permission, reviewed-task entry and unsaved test restore. Hebrew 390px iframe had 375px usable width and 375px content width. No real test record or robot action was created. Existing build size warnings remain.

Production deployment/acceptance is recorded below only after verification. No APK rebuild is included.

## Production acceptance — 10 October 2026

Initial application release b0a5ffe (development 1d493f0), production FqkDHwpUsQGwFHR4m1MqEsabdT1m, Ready/current g3-6740.com at 20:56:57 GMT+3. Release CI349 succeeded. The frc-assistant bundled function was deployed in project hnqwhuuxlqfyawqymaaz without changing authentication settings; prior bundle is retained in ignored local staging.

Live admin acceptance retrieved six actual OFFSEASON_2026 files at 78d277de1977aa9cbfea1abeced668de0e95903b, showed numbered RobotContainer.java lines 1–77 before sending, and ran one Gemini review. The answer identified getAutonomousCommand() returning Autos.exampleAuto(m_exampleSubsystem), cited lines 66–69, and disclosed Autos.java/Robot.java outside scope. Two messages persisted after refresh in private conversation d19fa4e0-ca74-4d10-8ccf-73158d0f871f. This verifies bounded source-based analysis, not complete repository coverage or a robot build. No second paid review is needed for unchanged backend behavior.

Production Autonomous opened Engineering mode with the correct return link. The source catalogue was separate; Logs showed local WPILOG inspection with no repository requirement; Tests loaded existing records. Final screenshot exposed an old last-child selector applying the circular repository counter styling to the remaining title block. The focused correction scopes counter styles to a non-first child; it changes presentation only. Final corrected deployment is recorded below after verification.

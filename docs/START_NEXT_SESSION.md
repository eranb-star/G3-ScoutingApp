**Latest simulator update:** Numeric keyboard editing, simultaneous single/double/triple shooting, KitBot capacity 40 and Darwin capacity 60/triple are deployed. Source `875ea52`, Vercel `A3xNMsgF3tGt7THHoGoxsiTKL1T8` (Ready). [Behavior, tests and rollback](SIMULATOR_SETTINGS_20260923.md).

**Latest production release: simulator fidelity, source `b65e929`, Vercel `2t2Bh17M3CMKA24JmLapC4j6vyZY` (Ready).** [Delivered scope, CAD/tag sources, acceptance and rollback](SIMULATOR_FIDELITY_20260923.md): intake contacts/feeding, 32 official AprilTags, part inspection, published 6328 Darwin and one shared-world computer opponent. Physical Quest/phone acceptance and measured robot calibration remain open; APK unchanged.

**Latest production release: shared timed practice and competition venue, source `7c7759a`, Vercel `FEZ7Svcb4FTfKrXxZzFH6eHE8GgQ` (Ready).** See [scope, validation and release record](SHARED_PRACTICE_VENUE_20260923.md). This extends the existing web/phone-web/VR simulator. Physical-device acceptance and the remaining match-fidelity phases are still open.

**Latest production release: VR phase 1 prototype, source `fcb806e`, Vercel `A6xSdguaqaCcv3FiUoz2XUHERt7Q` (Ready).** See [prototype controls, acceptance and deployment](VR_PROTOTYPE_20260921.md). This supersedes the earlier selected-next and no-further-phase wording below. Physical headset acceptance is pending; graphics and Android milestones remain delivered.

**Android milestone:** Signed APK **2.2.0 / code 24** built and verified. [Artifact, checksum and remaining physical acceptance](APK_MILESTONE_20260921.md). No further phase started.

**Production simulator release:** All graphics/intake/hopper/driver-view/fullscreen changes below are now deployed in `877208b`, Vercel `5z99hJLraPrbKKxzurFsHPEo3UBR`. [Verified release and rollback](SIMULATOR_PRODUCTION_RELEASE_20260921.md). This supersedes earlier not-deployed notices.

**Latest simulator update:** [Open carbon-tube intake, height cap and three driver-station views](DRIVER_VIEWS_20260921.md) implemented and checked locally; not deployed. This supersedes the solid intake tray in the previous scene-polish checkpoint.

**Scene polish update:** [Intake mounting and Step 3 scene polish](SCENE_POLISH_20260921.md) is implemented and checked locally. Not deployed; representative-device acceptance remains open.

**Hopper follow-up:** [Reference robot panels, stored balls and transfer animations](HOPPER_VISUALS_20260921.md) implements the user-selected visual Steps 1–2 locally; not deployed.

**Graphics update (2026-09-21):** The user subsequently authorized graphics A + B and default arrow-key movement. See [implementation and acceptance checkpoint](GRAPHICS_AB_20260921.md). Implemented locally, not deployed; this supersedes the earlier awaiting-start status below.

# Start the next G3 session

Read this file first. Current status below supersedes historical disabled, undeployed and candidate-only wording elsewhere.

1. Read [working expectations](WORKING_EXPECTATIONS.md).
   Read [agreed next phases and detailed acceptance scope](NEXT_PHASES_AGREEMENT_20260921.md) before planning new work. Graphics A + B is the user's selected next increment; this checkpoint authorizes documentation only, with implementation awaiting the user's start instruction. Existing knowledge, review workflows and chat governance must not be rebuilt.
2. Read [verified production release and acceptance](staging/KNOWLEDGE_CONNECTED_RELEASE_20260921.md).
3. Read [controlling knowledge design](CONNECTED_KNOWLEDGE_DESIGN_20260920.md), [master programme handover](PAUSE_HANDOVER_20260913.md), and [collection coverage](research/FULL_COLLECTION_20260920.md) for wider scope.
4. Earlier session checkpoints are preserved in [session history](SESSION_HISTORY_20260921.md); they are historical evidence, not current deployment status.

## Current production state — 2026-09-21

- Website g3-6740.com: commit 73dee1d, Vercel JBcqaNToZxoiQvFXzKwfHBuPFwr4, verified Ready/Current. Connected FRC knowledge workspace and popup loading/error boundary deployed.
- Assistant Edge function: latest code c754f5d on codex/knowledge-protection-release; persisted deployed source matched the bundle. This includes official 2026 manual retrieval, Admin topic exemption and the message-history insertion fix.
- Gemini G3-6740-AI project verified Tier 1 Prepay. Production enabled=true, activation_approved=true, monthly budget 25 USD. Existing other spending/access controls remain. Admins can ask general-topic questions; other roles retain the purpose restriction. Do not re-disable or narrow Admin access without a reason and user discussion.
- Exact production Admin question about building a climber for 2026 completed HTTP 200, cited official scoring/tower sections, and settled 0.010543 USD. The completed answer was restored to conversation history without another paid call; two messages were verified in the UI. This is one live quality case, not comprehensive acceptance.
- Active corpus in QA and production: 1,716 sources, 48,797 distinct passages, 50,157 citations; body hashes and citation mapping verified. Production indexed corpus footprint 137,609,216 bytes. Corpus is not exhaustive top-500 or 10-year coverage. Imported passages are not verified robot configurations.

## Remaining gaps — do not claim these complete

- Live official-manual registry covers 2026 only. Broader season discovery/registration, automatic PDF extraction/indexing, Q&A/update completeness and robust conversational season tracking remain.
- Reviewed robot catalogue is empty in production. Its filters return zero; populated source search is separate. Default search UX still needs correction to avoid directing users into an empty catalogue.
- Non-Admin purpose classifier has produced malformed/ambiguous outputs. Admin bypass is tested; broader Mentor classification quality and structured-output improvements remain.
- No broad paid answer-quality evaluation, real Mentor/Student browser acceptance, full recovery rehearsal or physical-device acceptance has been claimed.
- The successful response uses source citations; numerical targets proposed by the model (e.g. test-cycle targets) are recommendations, not official rules or measured team capability.

## Repository and data handling

Release branch codex/knowledge-protection-release is isolated at docs/staging/knowledge-release.local. Main working branch codex/release-1-qa contains the accumulated implementation/research checkpoint; it is not automatically the production version. Consult git log/status before edits and do not deploy this branch wholesale merely because it contains more files.

Research scripts, census/selection reports, attribution metadata, migrations, tests and design records belong in Git. Downloaded source corpora, local transport SQL/CSV, credentials and publisher manual downloads stay ignored; the corpus is already in Supabase. No credentials should enter documentation. Preserve personal Android .idea edits. Do not re-fetch/re-import the completed corpus or rerun every historical test without a concrete reason.

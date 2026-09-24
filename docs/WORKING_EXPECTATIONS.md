# Working expectations and lessons

These requirements summarize the user's explicit preferences across this session. Read alongside current task instructions; do not infer new authorization from historical documents.

- Use [the agreed phase details](NEXT_PHASES_AGREEMENT_20260921.md) when planning next work. Separate acceptance of delivered functionality from new capabilities. Do not describe knowledge collection, Gemini integration, mentor/task review or chat budgets as work to repeat. Graphics quality is separate from physics fidelity; historical knowledge is separate from playable historical simulation. State estimate boundaries and never equate engineering days with remaining Codex tokens. Record future refinements when authorized; discussion alone is not implementation permission.

- Be precise and concrete. State what works, what failed, what changed, what was actually tested, and what remains. Use ordinary language; avoid vague phases, architecture slogans, superlatives and promises of infinite scale or zero regressions.
- Act on authorized work and carry it through. Do not repeatedly ask for the same approval or offer to do work instead of doing it. Ask only for genuinely missing information or a required approval, explaining the exact reason. Keep updates and tool output short; user token/time cost matters.
- Inspect the existing code, deployed schema and real workflow before designing. Extend existing FRC knowledge, Evidence search and G3 Assist; do not rebuild parallel systems or assume placeholder/kitbot data represents the team's robot.
- UI/UX is a release requirement. Test real entry points, cold loading, EN/HE, meaningful result states and saved history. A filter over an empty reviewed catalogue is not usable historical search. Clearly distinguish source passages from verified robot facts.
- Never equate committed code, successful deployment, permission tests, or cost accounting with a working end-to-end feature. Test the user's exact scenario with real production evidence when authorized; verify answer, citations, persistence and cost. Do not repeatedly send the user back as the only tester after speculative fixes.
- Diagnose errors from actual execution/ledger results before changing limits or prompts. Preserve request IDs/idempotency and do not automatically incur duplicate paid calls. The purpose gate, answer generation and saving are separate failure stages.
- Missing retrieved evidence is not proof a game/document is unreleased. Use current date, season-specific official sources and explicit retrieval-failure handling. Historical community snippets cannot establish current rules. One successful 2026 question does not prove other seasons work.
- Admins explicitly requested unrestricted question topics because they fund the service. Verify Admin role server-side, skip the topic gate for Admins, retain budgets and access security. Other roles keep team-purpose restrictions. Monthly application budget remains 25 USD unless explicitly changed.
- Avoid wasteful polling. Official document checks should be manual/event/season-appropriate; no five-minute recurring checks. Current 15-minute in-process cache is on-demand reuse, not scheduled polling.
- Preserve source provenance/version/hash and honest coverage. Counts must distinguish sources, distinct passages, citation occurrences and robot configurations. Never invent verified robot facts or claim all top-500 teams/10 years are covered.
- Save durable handovers with exact release commits, deployment IDs, migrations, acceptance evidence, remaining gaps and rollback context. Keep one authoritative current summary; retain superseded notes as history. Never commit credentials, private account details or ignored downloaded corpora.
- Decision-support acceptance must inspect the actual retrieved passages before spending on repeated provider tests. Long queries can displace decisive scoring tables; preserve table continuations and verify numerical thresholds. Read the complete answer: a correct citation or successful API response does not prove the strategic conclusion. Check mixed-level arithmetic, sufficient versus necessary conditions, unsupported engineering estimates and physically meaningful test criteria in both English and Hebrew. Record failures and corrections; never present a proposed target as measured performance or one successful answer as universal accuracy.

## Concrete failures to prevent

1. Deployment reported as complete while the requested user workflow/data was missing.
2. A relevance classifier rejected an ordinary climbing strategy question, then returned malformed output; prompt edits alone were not acceptance.
3. Assistant claimed the 2026 game was unreleased because official evidence was not retrieved.
4. Lazy-loaded popup lacked Suspense and crashed on first opening.
5. Bulk message insert omitted a required citations value on one row; answer appeared but was absent from history. Test compatible insert row shapes and actual persistence.

Regression prevention is mandatory engineering work, not a guarantee that no future defect can occur. If a check cannot be completed, name the precise gap and never mark it passed.

- Engineering release lessons and production evidence are in [ENGINEERING_RELEASE_20260924.md](ENGINEERING_RELEASE_20260924.md): test actual request routing and persisted answers, preserve Three.js material shape during mesh cloning, fail transpile diagnostics, verify PDF hashes before parser buffer transfer, and never expand QA permissions to make a test pass. An authorized programme does not need repeated phase-selection approval; continue concrete achievable work and distinguish software limits from missing physical/repository inputs.

- VR acceptance: the user wants useful driver realism, not graphics alone. Keep headset performance, stereo scale, physical floor calibration, visibility and controller usability explicit. Desktop FPS or mocked WebXR tests never prove headset acceptance. Preserve a bounded prototype and require measured headset results before claiming full-match realism.

- Shared simulation: training exercises, scoring, replay and calibrated physics should serve web, phone and VR through the same engine. Keep device-specific inputs and presentation separate. The user selected timed practice/results/replay and requested realistic carpet plus a competition venue; preserve the field-first fullscreen layout. Clearly distinguish a generic illustrative hall from measured event sightlines and visual replay from deterministic physics resimulation.

- Simulator fidelity: keep visible mechanisms and their collision/feeding behavior aligned; distinguish reference proxies from calibrated hardware. AprilTags require official artwork, family, dimensions, field variant and poses. If a requested public CAD source cannot be exported, investigate a licensed usable alternative before making the user solve access. Preserve source versions and original part names for inspection. Opponent inventories and scoring must not contaminate the driver’s practice results. Verify the real asset and visible gameplay, not only a selector or a loading message.

- Simulator settings: validate numeric input on commit without rejecting intermediate typing. Parallel shooters must launch separate balls simultaneously with one volley cooldown, conserved identities and ball-based result counts. User-requested profile defaults are not independently verified hardware specifications.

## Mandatory recommendation reconciliation — 25 September 2026
Failure: after saying the handover was complete, the assistant recommended season setup/Check now and answer corrections in terms that implied they were unfinished. They were already delivered and recorded. A new checkpoint alone did not resolve contradictory historical statements. This wasted user effort and damaged confidence.

Before every next-phase recommendation:
1. Read START_NEXT_SESSION.md, current checkpoint and the latest relevant feature release, then inspect the relevant current code. Use production evidence for deployment claims; if not freshly audited, say the status is recorded evidence.
2. For each proposed item explicitly establish: existing delivered behavior; exact additional missing behavior; evidence/path supporting that distinction; dependency; acceptance outcome. Do not offer a broad phase name with already-shipped work hidden inside it.
3. Reconcile conflicting historical statements against later acceptance; amend the active summary and mark historical records superseded. Never treat the oldest open issue as authoritative over a later verified fix.
4. Separate feature implementation, regression/quality evaluation, deployment and physical acceptance. A broader evaluation gap does not reopen a fixed issue without a failing case.
5. Keep the user's current constraints: private offseason repo not connected; representative logs unavailable until next week; camera/robot/device validation needs real hardware. Do not keep requesting the same missing inputs or prioritize blocked work as immediately executable.
6. Label proposed next priorities versus authorized active work. A discussion about priorities does not start implementation. Preserve earlier A–E authorization but do not silently expand scope.

Required fixed facts: season setup and Check now are shipped; supported official ingestion/versioning is shipped; supported answer/retrieval/mixed-scoring corrections are shipped and tested; chat budgets/permissions and task mentor workflow are shipped. Remaining autonomous code generation is genuinely unimplemented. Do not claim documentation ensures perfect recall or zero future errors: perform this reconciliation, cite the evidence and correct contradictions.

- Team-first direction (25 September): prioritize our robot and student improvement before alliance planning. The delivered planning/practice increment is recorded in TEAM_PLANNING_PRACTICE_20260925.md. Validate complete browser save/reload, not only a successful save message; restart stale preview servers when served modules do not match source. Inspect expanded history tables as well as summary cards for dark-panel contrast. Local simulated history is not measured team performance or cloud synchronization.

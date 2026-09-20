# Working expectations and lessons

These requirements summarize the user's explicit preferences across this session. Read alongside current task instructions; do not infer new authorization from historical documents.

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

## Concrete failures to prevent

1. Deployment reported as complete while the requested user workflow/data was missing.
2. A relevance classifier rejected an ordinary climbing strategy question, then returned malformed output; prompt edits alone were not acceptance.
3. Assistant claimed the 2026 game was unreleased because official evidence was not retrieved.
4. Lazy-loaded popup lacked Suspense and crashed on first opening.
5. Bulk message insert omitted a required citations value on one row; answer appeared but was absent from history. Test compatible insert row shapes and actual persistence.

Regression prevention is mandatory engineering work, not a guarantee that no future defect can occur. If a check cannot be completed, name the precise gap and never mark it passed.

# Workflow reliability — execution status, 15 October 2026

User authorization: complete all seven agreed fixes. Scope remains WORKFLOW_RELIABILITY_DESIGN_20261015.md. No additional phase approval is needed. This file supersedes earlier contradictory implementation summaries.

**Release state: 15 additive database migrations are installed in production.** Deployment transaction confirmed existing expense balances unchanged. Edge Functions and frontend release are in progress; website still d8cdb47 and APK2.5.0/code28. No financial records were matched or marked duplicate; no test push was sent.

## Delivery checklist

| Issue | Implemented locally | Evidence already obtained | Remaining release work |
|---|---|---|---|
| Admin attendance correction | Individual actual departure, historical correction, Israel timezone, reason/audit, conflict detection | Focused database tests: role denial, overlap, future/reopen rejection, other attendees unchanged; DST helper tests passed | Current/historical UI acceptance; deployed-function rollback execution passed |
| Finance | Approval ceiling; actual order; expense links; partial deliveries; cancellation; reversible duplicate corrections; repaid duplicate reallocation | Focused tests passed for 8 requested/5 approved/320 actual, unchanged debt on linking, partial receipts, retry/stale guards, cancellations, original payments preserved during duplicate reassignment, overpayment rejection | Full approved lifecycle remains incomplete: split/consolidated orders, unpaid bills/settlements, returns/refunds and payment cases; purchasing list actual-value clarity; live migration/business rehearsal |
| Duplicate responsibilities | Canonical feedback action, explicit merge reference, retained personal state | Tests passed author/reviewer, same-title distinct reports, snooze, role changes, close/reopen, rerun | Affected Home/Work counts and production acceptance |
| Absence push | Restricted action-ID lookup; registration errors/retry; device ownership transfer; logout cleanup | Reproduced student RLS lookup defect; lookup/registration authorization tests passed | Endpoint outcome diagnostics; updated APK; actual device receipt. Permission for one test push remains unanswered, not a blocker to other work |
| Code review | Embedded flow; dependency retrieval; cloud drafts; immutable evidence; permission-aware history; recovery preserves answer/evidence | Software mentor focused checks passed including private access, citations, cloud concurrency, evidence/recovery access revocation | Findings lifecycle and remaining approved coverage; final actual-answer/browser/recovery acceptance |
| CAD dates | Exact microversion provider date, import/check dates separate, unknown retained | Helper tests passed; provider API path/model reviewed | Actual provider metadata response and unchanged/revised source acceptance |
| Limited Mentor | Additive role; explicit capability ceiling; scoped projects/tasks; minimal assignee directory; role-change remount | Focused scope/denial tests passed; rollback schema rehearsal passed | Full RPC/storage/export/AI denial audit and UI acceptance; no accounts assigned |

## Current execution sequence

1. Finish the named finance gaps and code-review acceptance requirements without expanding beyond the approved design.
2. Complete the remaining access/date/attendance checks. Reuse passing evidence; rerun only changed behavior or failed checks.
3. Review affected phone/desktop Hebrew/English flows; rehearse the final migration set and compare preserved baseline.
4. Commit explicit task files, deploy backend before dependent frontend, verify required CI and production behavior. Package latest APK for bundled notification fixes.
5. Record exact deployment identity and remaining physical phone evidence. Never equate a partial release with completion of all seven.

## Verification and continuity

- Two production-schema rehearsals ran inside BEGIN/ROLLBACK: the original ten migrations, then Limited Mentor and saved review evidence. No schema changes were retained. The final 15-migration set, including cancellation, repayment reallocation and private-task boundary, subsequently passed one rollback rehearsal. Schema compatibility is not business acceptance.
- Latest reconciliation test passed after repaid-duplicate implementation, including a rejected overpayment. Latest software mentor test passed after recovery-access policy additions.
- TypeScript passed after the recovery-result and role-remount edits.
- Synthetic Finance preview inspected on desktop and Hebrew phone width. It demonstrated actual320/covered320/commitment0, amendment340/remaining20, and retained inputs on error. This is not production acceptance.
- Finance save callbacks now propagate refresh failures instead of closing with a false completion message.
- Keep private ignored baseline/audit JSON and rehearsal SQL in docs/staging out of Git. Preserve unrelated Android IDE edits and local scripts/assets.
- No paid recovery project; robot GitHub read-only; no automatic historical matching/dedup; no newly inferred private-data grants.

## Cost discipline

The user explicitly challenged excessive token use. Keep one checklist, batch related edits, avoid repeat investigations and passing checks, and provide concise findings. Do not add parallel agents, new redesigns, or unrelated roadmap work. Required security checks and CI remain; they are not replaced by claims of completion.

- Actual attendance correction executed successfully against an existing record and audit constraint, then rolled back. No retained attendance change.
- Push endpoint now retains valid device tokens on general provider errors; only explicit FCM UNREGISTERED disables them. Focused classification checks passed. Aggregate provider-acceptance logging excludes tokens and message content.
- Legacy generic AI-to-task RPC now rejects private software context and directs callers to the existing reviewed-summary flow. Final security verification remains open.

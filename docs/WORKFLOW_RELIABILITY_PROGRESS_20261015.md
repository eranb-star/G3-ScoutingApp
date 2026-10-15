# Workflow reliability — execution status, 15 October 2026

User authorization: complete all seven agreed fixes. Scope remains WORKFLOW_RELIABILITY_DESIGN_20261015.md. No additional phase approval is needed. This file supersedes earlier contradictory implementation summaries.

**Release state: production website cd2075a is live at https://g3-6740.com (Vercel 9hsxwFeUBJyb7VdQDfw3Azfk8tHm), CI382 passed.** The original 15 migrations and four Edge Functions are installed. Findings schema is now also installed. Additional code-review corrections and finance completion are in progress locally; do not call the whole approved scope complete. APK2.6.0/code29 has been built and signed but needs rebuilding with the final frontend. No real financial matches, attendance edits, or test push were retained.

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

## Live acceptance, current continuation
- Attendance correction UI verified and cancelled; earlier correction/audit transaction rolled back.
- Finance actual-order matching preview verified and cancelled; legacy expenses and repayments preserved.
- Home shows one actionable feedback reminder instead of the duplicate.
- CAD exact provider dates verified: mastersketch 14 October 20:53:03; import/check remain separate.
- Code review: full RobotContainer supplied; initial answers were withheld for citations spanning omitted lines. Explicit allowed-range / single-line instructions produced an actual OFFSEASON_2026 answer with validated citations, saved and reopened after reload. The answer identifies missing drivetrain wiring in RobotContainer and labels uncompiled proposals; it does not establish whole-repository or hardware correctness. Findings lifecycle schema installed after rollback rehearsal; frontend pending.
- Split supplier-order schema now installed after focused tests and rollback rehearsal: aggregate approval caps, per-supplier deliveries and cancellation completion. Frontend pending.
- Retry-safe expense entry with invoice duplicate detection/explicit legitimate split now tested; additive migration rehearsed and installed. Existing expense rows unchanged.
- Added CI checks for split orders, expense idempotency and finding ownership/citation/status history.
- Broader supplier-bill/prepayment/refund lifecycle remains incomplete; it is not silently closed by these improvements.

## Current release candidate and in-progress supplier ledger
- Development f0c8555 / release 0bd0e37 pushed. CI383/384 passed. Not yet promoted; production remains cd2075a.
- 18 migrations installed: original 15 plus findings, split supplier orders, retry-safe invoice-aware expense entry.
- Local supplier-bill extension is NOT deployed: finance_supplier_bills_20261015.sql, SupplierBills.tsx, supplierBills.ts, test-supplier-bills.mjs. Supports unpaid invoices, deposits, partial/mixed payments via atomic existing expense creation, invoice allocation across orders, private attachments. Focused backend tests pass; UI/integration/projection verification underway.
- Finance multi-order correction/cancellation now selects the specific order locally (previous candidate used first order). Include this correction in next release before promotion.
- This candidate is superseded by the finance completion batch below.

## Finance completion batch — 15 October
- Four additional migrations installed after production BEGIN/ROLLBACK rehearsal: supplier bills, actual refunds/member credit recovery, supplier stock returns, and refunded-document guards. Total installed migrations: 22. No existing monetary, repayment, attendance or stock records were changed by installation.
- Supplier invoices/advances support partial and mixed-payer payments, links to existing expenses and multiple confirmed orders, private attachments and retry-safe writes. Invoice cost offsets its linked expense payments; advances are excluded until invoiced. Refunds offset cost only for the expensed share of a payment.
- Actual refunds preserve original expenses/repayments, update cash or named-member net balance according to destination, and expose excess refund credit returned by a member. A refund does not reopen an order. Incorrect refund entries can be reversed with a reason. Returned member-credit receipts are immutable; correcting a mistaken recovery receipt requires an audited administrative repair (no UI reversal currently).
- Returns use original receipt conversion, reject excess/unavailable stock, preserve receipt history and do not infer a refund or replacement order. Existing inventory reservation guards still apply.
- Focused tests passed: invoice/advance settlement, linked-payment double-count guards, refunded-invoice mutation guards, refund-after-reimbursement/credit recovery, partial/full returns, idempotency and access denials. TypeScript passed before the final small projection helper; final compile/CI pending. English desktop and Hebrew 390px invoice forms inspected.
- Frontend completion batch and final signed APK are not yet released. Production is still cd2075a until the next release entry explicitly supersedes it. Actual Android notification receipt remains unverified without an attached device/test authorization.

# Workflow reliability — execution status, 15 October 2026

> Release-history note (18 October): current website/APK and remaining work are in [the checkpoint](CURRENT_CHECKPOINT_20261009.md) and [current plan](REMAINING_WORK_MASTER_20261018.md). APK2.6.1 includes this release. Older pending/build/no-APK entries below describe intermediate or release-time state; final evidence takes precedence.

User authorization: complete all seven agreed fixes. Scope remains WORKFLOW_RELIABILITY_DESIGN_20261015.md. No additional phase approval is needed. This file supersedes earlier contradictory implementation summaries.

**Current production: release 7f3e457 (development bbcf198), Vercel GRGcBkGyRZaxmW2dNjbhrsGqz9Ju, Ready on 15 October 2026 at 15:05 Israel time, https://g3-6740.com. CI385/386 passed.** All 22 workflow migrations and the four required Edge Functions are installed. Signed APK2.6.0/code29 rebuilt from this frontend; see APK_MILESTONE_20261015.md. Historical sections below describe intermediate states, superseded by this summary.

## Delivered fixes and acceptance
| Area | Delivered / verified | Explicit boundary |
|---|---|---|
| Attendance | Individual actual checkout and historical correction with reason, Israel timezone, audit and conflict checks; production correction transaction rolled back; UI inspected | No real attendance edits retained |
| Purchasing / finance | Approval ceilings, actual quantity/price, split orders, selected-order correction, linked existing expenses, duplicate reconciliation, partial deliveries/cancellation, supplier invoices/deposits/partial and mixed payments, private attachments, refund/credit ledger and stock returns | 10 historical purchases still require explicit review; no automatic matching or debt changes. Incorrect member-credit recovery receipts need audited administrative repair; no UI reversal for that rare case |
| Responsibilities | One canonical feedback action; distinct reports retained; snooze/dismiss state preserved | Live duplicate no longer shown |
| Absence notifications | Restricted action lookup, Android registration diagnostics/retry, ownership/logout handling, provider-error classification and delivery outcome logging | Signed APK ready; actual phone receipt unverified. No attached device and test-push permission unanswered |
| Code review | Actual pinned repository excerpts, explicit evidence coverage, validated citations, saved/reopened answers, private cloud drafts/recovery, findings and verification tracking | OFFSEASON_2026 actual answer saved/reopened; no compiled patch or hardware claim; paid calls not repeated after success |
| CAD dates | Provider microversion date separate from import/check date | Actual mastersketch/rake metadata verified |
| Limited Mentor | Scoped project/task access, minimal directory, restrictive sensitive-data boundaries, explicit permission ceiling | Focused database scope/denial tests and production rollback role check passed; no user accounts reassigned. This is not an exhaustive security certification |

## Final release evidence
- Production Finance verified: expenses ₪4,416.70, reimbursed ₪1,298.00, owed ₪3,118.70, funds ₪2.00. Original balances preserved. Confirmed-order commitment ₪0 does not mean no liabilities: 10 legacy purchases visibly require reconciliation.
- Live supplier invoice form and saved code-review/findings entry inspected; no synthetic financial records created in production.
- Focused PGlite suites cover supplier invoice/advance settlement, combined-order allocations, duplicate retry, refund-after-reimbursement, member-credit recovery, immutable audit links, partial/full stock returns and authorization failures. Production schema rehearsal rolled back before additive installation.
- TypeScript, CI385/386, production build, Android assembleRelease/lintRelease and signature verification passed. All126 final web assets match the signed APK byte-for-byte. EN desktop/HE phone form layout inspected.
- APK SHA256 ce53dc1c0229be34a813270fb4b8586c633717896a14207422d524a373ed8e86. Existing signing certificate retained. Physical installation/push acceptance remains separate.
- Proof screenshots: docs/staging/workflow-final-production-20261015.local.png and workflow-final-finance-20261015.local.png (local, not public).
- No paid recovery project, no robot Actions/write access, no unapproved private sharing, no real ledger cleanup, no extra AI acceptance calls after the successful saved review.

## Historical execution notes — superseded by the current release above

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

# Finance and reimbursement redesign — 19 September 2026

## Implemented

- Recipient-first repayment, opened globally, from a member balance or an individual expense. Selecting another recipient clears the previous allocation.
- Full personal ILS balance is shown separately from expense balances and available pooled team funds. Example verified: owed 3,769; repayment 1,150; still owed 2,619; funds 1,300 become 150.
- One payment covers one or more expenses, oldest-first automatically or within an explicit selection. Partial repayment is supported. Up to 100 expense allocations per payment.
- Server transaction validates active administrator, recipient ownership, amount precision, allocation totals, outstanding amounts, available funds and the balances the administrator reviewed. All allocations and balance changes commit together. Request UUID prevents duplicate retry; changed payload with the same UUID is rejected.
- New payment header records recipient identity/name, amount/date/method/source/note, recorder and before/after balance snapshots. Existing per-expense repayments remain visible as legacy history; no invented historic person balances.
- Four compact tabs: Reimbursements, Expenses, Funds & budgets, Purchase commitments. Padded member rows/history, readable nonwrapping status badges, dedicated expense table/filter/export, responsive dialog with fixed footer and focus trap. English/Hebrew supported.
- Paginated reads avoid silently truncating finance ledgers at the API row limit. Refresh balances is available; stale balances fail closed on the server.
- Existing expense/income/budget/purchase-payment workflows and old reimbursement RPCs retained for compatibility. No APK changes.

## Deployment and checks

- Migration: `backend/supabase/finance_recipient_repayments_20260919.sql`; applied successfully to production project `hnqwhuuxlqfyawqymaaz` via SQL editor. Adds schema/functions/policy only; no real repayment or financial record modification was used as a test.
- `scripts/test-recipient-repayment.mjs`: isolated PGlite PostgreSQL checks for exact example, another recipient, multi-expense/partial payment, rollback, overpayment, funds limits, stale balances, duplicate allocation/request, changed request payload, administrator/RLS guards and migration rerun.
- TypeScript build passed. Vite production build passed (existing large simulator bundle warning).
- Real React components reviewed with synthetic records on desktop and phone widths, including Hebrew; action footer visible and example balances correct. Fixture writes disabled.
- Production web deployment details are recorded in the pause handover after promotion.

## Scope and remaining acceptance

This records money already paid; it does not initiate a bank transfer. Funding source/event is a descriptive audit field: funds remain a pooled ILS balance, not separate restricted accounts. No currency conversion is performed.

User acceptance: record the next genuine repayment, verify recipient/expense selection, then compare ledger, person balance and remaining funds to the actual payment. Do not create fake payments in production for acceptance testing.

Broader accounting capabilities are separate future scope: payment reversal with compensating audit entries, bank reconciliation, separately restricted fund accounts, receipt attachments and formal accounting close. Do not label this operational ledger a complete accounting suite. Wider V5.2/simulator/attendance acceptance remains in `PAUSE_HANDOVER_20260913.md`; this increment closes none of those phases.

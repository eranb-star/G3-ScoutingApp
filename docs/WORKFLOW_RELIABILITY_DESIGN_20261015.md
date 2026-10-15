# Workflow reliability — final pre-development design, 15 October 2026

Status: proposed implementation baseline awaiting user review. Documentation only; no application, database, permission or production changes authorized by this document. Covers the seven issues reported on 15 October and the subsequent finance reconciliation decisions. Existing production release remains d8cdb47. This is not a claim of zero undiscovered defects.

## 1. Scope, evidence and constraints

Preserve existing expenses, reimbursements, purchase requests, stock movements, attendance, CAD snapshots and review histories. No silent cleanup, inferred historical checkout, inferred financial match or balance rewrite. GitHub remains read-only; no build dispatch, robot deployment or new paid recovery project. Existing private-data sharing boundaries remain enforced. Catalogue expansion and unrelated roadmap work remain open, outside this scope.

Code findings (not a fresh production database audit):
- FinanceAdminPage.tsx totals commitments from estimated_cost; displays original quantity; includes approved/ordered rows despite linked expenses. Row actual_cost can disagree with total basis.
- PurchaseQuantityApproval.tsx captures quantity/remainder/reason, not a spending ceiling. purchase_quantity_approvals_20260912.sql retains requested quantity and approved quantities.
- purchase_payment_finance_link_20260907.sql couples receiving to expense upsert by purchase. Inspect current deployed function definitions and later migrations before replacing; old SQL alone is not proof of live behavior.
- attendance_reporting.sql individual checkout uses now(); historical roster UI is not a timestamp editor.
- feedback_review_notifications_20260910.sql has reviewer and submitter action producers for the same feedback report.
- memberAuth.tsx silently catches native token registration failures and does not inspect upsert errors. Cause of the reported phone failure remains unconfirmed.
- SoftwareReviewStart.tsx transfers a sessionStorage draft into Assist and caps paths at six; software-context.ts selects by filename/keyword ranking and lowers constants/utilities. This is insufficient coverage for some questions.
- CadReviewWorkspace.tsx labels snapshot.created_at as revision date.
- Existing mentor role shortcuts require a backend authorization audit before introducing restricted mentors.

Reference patterns reviewed: [Odoo order/receipt/bill matching](https://www.odoo.com/documentation/18.0/applications/inventory_and_mrp/purchase/manage_deals/control_bills.html), [GitHub evidence-based reviews](https://docs.github.com/en/pull-requests/get-started/reviewing-pull-requests-quickstart), [GitLab review lifecycle](https://docs.gitlab.com/user/project/merge_requests/reviews/). Adopt relevant controls without reproducing an ERP's complexity. This is operational expense tracking, not certification of statutory accounting.

## 2. Cross-cutting UX and integrity contract

Compact searchable lists, consistent action placement, one obvious next action, expandable detail, responsive phone/desktop layouts, Hebrew RTL and English, keyboard and screen-reader support. Explicit saving/saved/failed feedback. Preserve drafts on failure. No success until server confirmation. Do not optimistically finalize financial/attendance changes while offline.

Backend permission checks, transactional writes, unique request IDs, retry-safe mutations and revision-based conflict handling are required. Money uses fixed precision and explicit currency; quantities use explicit units. Audit records retain actor, event time, effective date, reason and before/after values. Posted financial changes use adjustments/reversals; drafts may be edited. Referenced records are archived, not destructively removed. Signed attachments and exports follow the same access scope as the record.

## 3. Purchasing, finance and reconciliation

### 3.1 Canonical relationships

Keep original request and its lines; separate approval decisions, supplier orders/lines, receipt events/lines, expense or supplier-bill records, allocations between expense and order lines, supplier payments/member-paid evidence, reimbursements and credit/refund adjustments. Extend existing entities where suitable, rather than create parallel ledgers. Final schema follows deployed-schema inspection.

Support one request split between suppliers/orders, several requests consolidated into one order, one invoice allocated across several orders, and several invoices/receipts against one order. Allocation totals cannot exceed their source amount. A historical purchase can remain unresolved without inventing missing events.

Track independent dimensions: approval; ordered/cancelled remainder; received/returned quantities; expense coverage; supplier payment; member reimbursement. Do not overload one status with all of these. Legacy status remains compatible until old APK callers are safely handled.

### 3.2 Normal user flow

1. Request: item, quantity/unit, estimate explicitly labelled unit or total, supplier/link if known, purpose/project. Edit/withdraw pending request with revision checking; approval refers to exact request revision.
2. Approve: quantity, maximum authorized total, deferred/declined remainder, reason. Approval is authority to spend, not cash payment.
3. Confirm order: buyer, supplier/order reference, actual quantity/unit price, tax-inclusive/exclusive choice, shipping/discounts, currency, order date and expected delivery. Show difference from approval. Over-limit changes require authorized amendment; an admin may approve inline with an audit reason.
4. Receive: each delivery records accepted quantity, rejected/damaged quantity, destination and remaining quantity. No inferred payment. Explicitly keep backorder or cancel remainder. Return records reverse the appropriate stock movements; never overwrite receipt history.
5. Record expense: invoice/receipt reference, date, actual amount, allocations and attachment. Identify unpaid supplier bill, team-paid expense or member-paid expense; do not mark an unpaid bill as cash spent. Immediate purchases may use a compact combined form that creates the same separate underlying events.
6. Settle: record supplier payment or reimburse the member, including partial settlement. Reimbursement never creates a second expense. Mixed payers are explicit allocations. Refund destination determines cash/member balance effects.

Purchasing list: item/order, requested-approved-ordered quantities, total basis, delivery state, finance state, next action. Finance and Purchasing open the same detail record; no competing values. Requester sees appropriate purchase status without exposing other members' financial records.

### 3.3 Totals and accounting boundaries

- Approved not ordered: unused authorized spending, separate from contractual orders.
- Open order commitment: confirmed order value not yet covered by allocated recorded expense, adjusted for cancelled scope. Approved-but-unordered amounts are not included again.
- Recorded expenses: posted expense value net of valid credit adjustments, regardless of who paid.
- Supplier amount owed: recorded supplier liabilities less allocated settlements/credits.
- Member amount owed: eligible member-funded expense less reimbursements and applicable refunds/adjustments.
- Recorded team cash: actual recorded cash movements, clearly distinguished from verified bank balance.

Budget view explains consumption and reservation rules; never add expense, liability and reimbursement as three expenditures. Do not aggregate currencies without a recorded conversion rate/date; keep original currency. Define rounding and shipping/tax allocation consistently. A credit/refund must not automatically reopen an order commitment unless replacement scope is explicitly ordered. Unknown order value is labelled unresolved, never treated as verified zero.

### 3.4 Historical reconciliation, explicitly requested by user

Create a Needs reconciliation view. Existing records and current owed balances remain available. Capture a private before-migration financial snapshot and counts/totals by currency/member/status, with no personal amounts committed to Git.

Actions:
- Already recorded in Expenses: select existing expense(s); confirm whole/partial coverage and actual order details; preview exact totals affected; link without new expense, repayment or receipt.
- Correct order details: retain original requested estimate and approval history; record actual quantity/price and reason. Do not infer actual quantity from expense amount.
- Mark expense as duplicate: choose surviving expense; check existing repayments, credits, attachments and allocations; exclude duplicate only after resolving those relationships. Retain reversible audit trail.
- Duplicate purchase request/order: identify whether both are real obligations. Link duplicate reference and cancel only confirmed duplicate outstanding scope; never cancel actual supplier obligations or stock receipts by title similarity.
- Keep separate / investigate later: record decision and preserve unresolved visibility.

Example: requested 8 at ILS65 (520); approved5 within325; actual order5 at60 plus20 delivery (320); existing member-paid expense320. Fully linking gives open commitment0, expense320, owed320 before repayments; receiving3 leaves2 outstanding. Reimbursement200 leaves owed120 without changing expense320. A partial allocation leaves the genuine uncovered commitment. An expense spanning purchases allocates only the correct share.

Reconciliation preview shows before/after expense, commitment, member owed and cash effects separately. A normal link has zero effect on existing expense and member owed. Repaid duplicate expenses cannot be removed from totals by a one-click toggle. Unlinking is an audited correction with recalculation, not deletion. Suggestions are aids, never automatic matches. Preserve a raw historical view and show reconciled/unresolved totals separately instead of claiming unresolved totals are accurate.

### 3.5 Additional edge cases and controls

Pack/spool-to-stock conversion, service/expense-only purchases, zero-cost donations, substitutions requiring approval, shipping-only invoice, partial cancellation, refund after reimbursement, overpayment credit, duplicate invoice detection with override reason, and cost adjustments after stock was received. Never overwrite unrelated inventory valuation from a later invoice without an explicit valuation policy. Reconcile physical quantities independently of cost corrections. Material amendments invalidate stale approvals as appropriate. Admin exceptions remain recorded, not invisible bypasses.

## 4. Repository-grounded code review

### 4.1 Single workspace and normal flow

Engineering Hub > Robot Software > Code & Review. Start with Understand code, Diagnose a problem, or Review changes. Repository/default branch remembered per user; advanced branch/tag/SHA selection collapsed. Show repository purpose to prevent confusing offseason/learning/season code. Choose subsystem/question, then Analyze. Diagnose asks observed vs expected behavior; log attachment optional. Review changes asks base and target; PR input only if readable with existing authorization, otherwise exact revisions. Explicitly distinguish PR merge-base comparison from direct two-revision comparison.

Keep evidence preparation and answer in one workspace. Progress: reading revision, collecting evidence, analyzing, validating references, saving. Show source-sharing scope before sending private code; preserve current consent boundaries. No new sharing authority inferred from this design.

### 4.2 Retrieval and analysis contract

Resolve immutable commits at start. Retrieve question-relevant implementation and dependencies including constants/configuration, command wiring, imports, interfaces, vendor/build versions and tests. Replace arbitrary six-file cap with bounded evidence batches and an explicit coverage manifest. For changes include before/after context, removed/renamed files, dependency changes and callers. Unsupported/large/binary/submodule/LFS content must be reported as excluded, not silently represented as read.

Bound time, tokens and cost; prioritize decisive dependencies. Ask a targeted clarification only if necessary; otherwise analyze supported scope and expose omissions. No unlimited whole-repo promise. Validate cited file paths and ranges against retrieved evidence. Treat repository text as untrusted data, not model instructions; secret-like files excluded/redacted. Do not mix log-runtime identity with selected planning revision.

### 4.3 Result, ownership and lifecycle

Lead with direct answer and scope verdict: completed for stated scope, partial, or failed. Findings include severity, file/line evidence, impact, proposed correction, uncertainty and verification. Explain terminology in student-friendly language without hiding source evidence. Desktop code drawer/mobile focused source panel. No unsupported generic answer presented as actual repository review.

Persist server-side draft, immutable evidence manifest, answer, model/prompt version, request ID, cost status and access scope. Private by default; explicit authorized team sharing. Resume across devices. States distinguish queued/running/partial/completed/failed/cancelled; an AI result is not a human approval. Findings: open, addressed, verified, dismissed with reason. Link follow-up tasks rather than duplicate tasks. New code marks prior review outdated; preserve old evidence and request re-review of affected findings. Do not equate unchanged findings with verified fixes.

Existing GitHub remains read-only: no writes, builds, merges or robot deployment. Clearly label checks not run; attach existing CI evidence only with exact commit and known access. Generated patches are suggestions until separately applied/tested. Historical reviews retain prior privacy; no automatic sharing migration. Permission revocation must stop subsequent access to private reviews and cached evidence.

Retry-safe jobs resume failed stages without unnecessary repeat paid calls. Generation succeeded/save failed must recover the generated result where possible. Refresh/double-click does not create duplicate jobs. Cancellation stops further stages; provider work already incurred may still cost. No success on a timeout or missing response.

## 5. Attendance corrections

Admin action beside each current attendee: Check out with editable actual date/time and required reason. Historical row: Correct times with current/original comparison. Store UTC; display workshop timezone Asia/Jerusalem with explicit date; handle DST and overnight cases. Reject future departure, end before start and conflicting overlap unless an explicit authorized resolution exists. Individual correction never closes workshop or changes peers. Keep automatic23:00 closure distinct from claimed actual departure. Recompute reports/hours and derived summaries; do not fabricate time from schedule. Bulk close remains available and preserves already individually corrected records. Correction history visible to authorized admins and appropriate member view; sensitive reasons not broadcast.

## 6. Responsibilities deduplication

Use source entity + recipient + actionable purpose, not title. For feedback author who is also reviewer, one actionable item shows latest status and review responsibility. Preserve dismissed/snoozed state and destination when consolidating; archive redundant delivery record with link. Genuine new decision/reopened report can re-alert according to explicit event semantics. Distinct reports with same title stay separate. Apply shared logic to Home, Work and counts; historical notifications need not be deleted. Verify push fan-out does not send both duplicates.

## 7. Notification diagnosis and recovery

First inspect deployed send path, authorization, notification preferences, token freshness, provider outcomes and a specific failure example. OS permission is not proof of registration or delivery. Add registration error handling, token refresh/upsert, login/logout/account switching ownership, invalid-token cleanup and multiple-device support. Tokens remain private. Settings show permission, registration and last test result without exposing token. Manual test must not notify the entire team. Report provider accepted vs device observed distinctly. Check foreground/background/channel/battery behavior on actual Android device. Determine whether native code/APK rebuild is necessary from evidence; do not promise web fix resolves a native defect. Keep old APK compatibility or present an explicit minimum-version requirement.

## 8. CAD source dates

Display exact microversion/version, verified source change timestamp with scope (document/element where available), imported timestamp and last successful check separately. Inspect actual Onshape API metadata before choosing fields. Opening/rechecking cannot masquerade as source modification. Immutable snapshot dedup key includes source/reference/configuration/microversion as appropriate. Existing unknown source dates labelled unknown, not backfilled from import time. Failed check shows stale/error state without updating last-success. Distinguish branch/workspace changes and selected historical revision. Tests must compare source metadata rather than infer visual differences from timestamps.

## 9. Limited Mentor access

Visible Limited Mentor profile, implemented through explicit server-side capabilities and scope; storage representation decided after role-shortcut audit. Default only assigned/scoped engineering/projects and authorized CAD/training content. No student grades, private member details, absence review, finance, admin or broad reports. Minimum assignee identity can be exposed where necessary without full member profile. Do not automatically grant all private CAD/repositories; use explicit existing grants and scope.

Audit RPCs, RLS, storage, exports, search, AI context, notification recipients and direct URLs. Revoke access immediately including cached queries/session state. Existing mentors keep current permissions unless admin deliberately changes profile. No UI-only restrictions and no new role string without updating role checks and old-client behavior. Test allowed and denied access for every sensitive surface.

## 10. Priority, sequence and indicative effort

Effort is engineering work, not a token estimate or fixed delivery promise. Live schema/legacy records may change it. No development starts until user proceeds.

| Order | Work | Effort | Dependency / benefit |
|---|---|---|---|
| 0 | Inspect deployed schema/functions and preserve financial baseline; diagnose push | Medium | Prevent incorrect migration; identify actual phone failure |
| 1A | Finance reconciliation and corrected approved/order totals | Large | Restore trustworthy existing records before expanding flows |
| 1B | Individual/historical attendance; reminder dedup; CAD date fix | Medium combined | Immediate operational accuracy; independently releasable |
| 2 | Complete purchase/order/receipt/expense/settlement lifecycle | Large | Partial events, returns and reliable inventory/finance links; builds on1A |
| 3 | Unified code review, retrieval, persistent jobs and findings | Large | Actual evidence-based results and clear student experience |
| 4 | Limited Mentor authorization/profile | Medium-large | Backend scope audit and explicit access boundaries |
| Across | Push repair and APK if required, release evidence and handover | Evidence-dependent | Actual device validation, not presumed fixed by rebuild |

Finance1A must be designed against phase2 entities to avoid throwaway reconciliation. Limited-mentor permission mapping is done early even if rollout follows. Do not expand this into unrelated robot/CAM/catalogue work. Separate releases may reduce risk, but none constitutes completion of all seven.

## 11. Acceptance matrix and completion gates

| Area | Required focused evidence |
|---|---|
| Finance | Reduced approval; price amendment; combined invoice; split order; partial receipt/payment; prepayment; shipping/tax; currencies; duplicate detection; return/refund after reimbursement; exact before/after legacy reconciliation; no double stock or expense on retry; concurrent edits rejected |
| Attendance | Remote individual departure; historical automatic-checkout correction; timezone boundary; invalid interval; audit; hours recalculation; other attendees unaffected; non-admin denied |
| Reminders | Admin author receives one item; distinct reports preserved; snooze/dismiss retained; legitimate new status re-alert; counts agree |
| Push | Token registration failure surfaced; refresh/account switch; test to one device; provider outcome; foreground/background actual phone receipt; no token leakage |
| Code | Dependency outside first6; relevant constants; large diff; deleted file; same/different commits; missing access; partial evidence; validated citations; follow-up at pinned revision; saved/reopened across devices; shared/private denial; failure recovery without duplicate paid generation |
| CAD | Reopen unchanged source; actual new source revision; historical revision; unknown source date; failed refresh; timestamp scope accurately labelled |
| Limited Mentor | Allowed work succeeds; direct RPC/URL/export/storage/search/AI access to restricted data denied; revocation and old-client behavior |

Use synthetic/rollback financial and attendance cases, not live balance mutations for testing. Preserve an explicit reviewed reconciliation preview before any real historical changes. Frontend acceptance covers phone/desktop, Hebrew/English, loading/error/empty/success and accessibility. Broader tests only for affected shared permission/schema infrastructure; retain mandatory CI. No unrelated full regressions for text/date-label changes.

Release order: additive schema/backend compatibility, focused migration rehearsal and invariants, frontend, authorized production deployment, exact workflow acceptance, then APK if native/bundled changes require it. Define write cutover for old clients to prevent old RPCs reintroducing incorrect finance values. Rollback cannot erase post-release financial events: use forward repair or compatible read-only fallback. Capture release IDs, migrations, tests actually run and unresolved physical acceptance.

Completion checklist: every issue has implemented/deployed/verified status; real-data reconciliation remains a user-controlled review, not auto-completed; phone delivery requires device evidence; review quality requires reading actual answers. Current open investigations: live financial schema/allocations, exact push failure, actual Onshape timestamp availability, and repository review failure reproduction. None should be reported as confirmed fixed at design stage.

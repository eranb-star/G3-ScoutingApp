# Combined workflow corrections — 12 September 2026

## Delivery

Run `backend/supabase/purchase_quantity_approvals_20260912.sql` in the existing Supabase project, after prior mentor-review/purchasing migrations. Commit and push 19 product/document files, excluding both Android `.idea` changes. No APK sync/version change in this batch. Review one Vercel preview before production promotion and one later APK.

Commit: `Clarify review submission and add quantity-aware purchase approvals`

## Focused preview acceptance

1. Home → Purchasing approvals: a fresh pending request appears immediately in the total, with overdue counted separately. Acknowledging Inbox does not clear it; approving/rejecting does.
2. Projects → select workspace → task: verify **Task owner** is the student doing the work. Change owner explicitly if a mentor created it previously. Select a different mentor in Review details & settings. Do not modify real production assignments merely to test.
3. Before submission: mentor sees the planned checkpoint in Work, not the actionable Home review queue. A mentor who is also the task owner may still see the ordinary assigned task; the roles are intentionally distinct.
4. Student → Send for approval: enter a unique revision, fixed HTTPS drawing/design/code URL and supporting notes. Completed is reserved for approval. Mentor opens the evidence from Review submission, then approves or requests changes. Approval completes the checkpoint and releases prerequisites; changes requested returns work to the student. New revisions require fresh approval. No self-approval.
5. Purchasing → All requests: verify status/category/search and Open row on desktop and phone. Non-admins retain their existing request visibility, not access to everyone’s private requests.
6. Test request 10 units → approve 6, defer 4 with a reason. Original remains 10; approved quantity is 6. Repeated Request remaining quantity opens one linked unapproved request for 4. Declined remainders cannot be re-requested through this action. Receiving 7 against the 6-unit approval fails without writing an expense or stock movement. Actual receiving of 6 appears as 6 in received-product history.
7. Feedback → filter Closed. Settings → notification preferences start collapsed, account/admin destinations visible as authorized. Competition → full active-event name visible on narrow phone width.

## Boundaries

- SQL preserves the old aged-list response for older clients; new UI requires this migration for all-pending counts and new actions.
- Existing completed purchases/stock/expenses are preserved; legacy approvals without an explicit quantity retain original behavior. New approvals are quantity-enforced.
- Deferred quantities are not approved spending, budget reservations or scheduled orders. Re-request is an explicit action requiring a new decision.
- Original estimated cost is retained; reducing quantity does not invent a new supplier price. The remainder request starts with no estimate.
- Receiving remains the existing one final receipt workflow, not multiple shipment accounting.
- No production data edits or Firebase paid services. No new background scheduler or backend push service.
- Local tests and synthetic UI checks passed; live preview acceptance remains to be done. Multi-session contention was not simulated.

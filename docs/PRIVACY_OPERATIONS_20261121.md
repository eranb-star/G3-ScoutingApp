# Approved privacy handling — 21 November 2026

Owner explicitly approved the proposed retention periods and manual handling through eran.bongart@gmail.com. This authorizes the policy and request channel, **not bulk deletion of existing team records**. No automatic purge is being introduced.

## Manual request procedure — Eran is responsible

1. Receive requests by email. Record a private case ID, received date, request type and account identifier. Never put names, absence reasons or identity documents in this repository.
2. Acknowledge receipt and clarify account deletion versus selected-data deletion/access/correction. Verify identity proportionately using the registered address and existing relationship; do not ask for passwords or OTPs. Verify authority for representatives. Give an estimated completion date and communicate delays; no unapproved fixed legal service deadline is claimed.
3. Inventory the account, membership, attendance and corrections, absence text/attachments, learning, messages/uploads, notifications/device registrations, engineering attribution, finance, and audit records. Account deactivation is **not** deletion. Establish any legal/accounting/security hold and explain the reason and review date.
4. Prepare a case-specific deletion/anonymization plan. Inspect foreign-key references and storage objects before changing anything. Preserve shared engineering work with minimum necessary attribution; do not cascade-delete team projects or finance. Obtain owner authorization for the concrete irreversible plan.
5. For departure, deactivate using existing member administration; verify active sessions, device grants and notification eligibility rather than assuming one flag revokes every service. If revocation is incomplete, treat that as an unresolved security task, not a completed offboarding.
6. Execute only the approved scoped plan with counts and transaction assertions where applicable. Test on synthetic records first. Coordinate provider deletion where relevant; track backups and the need to reapply deletion after recovery. There is no new generic deletion endpoint in this release.
7. Verify absence of deleted identity/data in active stores, denied login/access, and preservation of shared records. Notify the requester of the outcome, retained categories/reasons and backup limits. Keep minimum necessary completion evidence, not copies of the removed sensitive material.

## Departure review schedule

- Departure date: disable active membership. Explicitly assign a mentor role only if continuing in that capacity.
- Within 90 days: review sensitive absence explanations, notes and attachments for deletion/minimization after open enquiries, except documented need.
- Within 12 months: delete/anonymize individual attendance and learning records unless a documented need requires retention.
- Engineering products: retain team knowledge and minimal necessary attribution. Finance: verify applicable accounting retention with the responsible professional; no guessed statutory duration.
- These are manual obligations. Owner must keep a private review register with due dates; no scheduler, automatic purge or retroactive data change has been activated. Account/data deletion requests may be considered earlier.

## Release boundaries

Public bilingual policy/request pages are generated from `apps/dashboard_web/scripts/build-privacy-pages.mjs`; those texts are the publication source. Historical drafts are superseded on owner-approved retention and handling only. Provider settings, detailed dependency-safe execution per request, native evidence and full Google review access remain separate acceptance items. Publishing a contact page does not prove a completed deletion workflow or Google approval.

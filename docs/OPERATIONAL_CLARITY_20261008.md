# Attendance, fundraising access and purchasing clarity — 8 October 2026

## Scope
Only the four approved operational corrections: persistent personal attendance confirmation; fundraising access independent of inventory management; editing/cancelling owned unapproved purchase requests; compact Inventory/Purchasing/Fundraising rows. No simulator, CAD, learning or roadmap feature changes.

## Findings and implementation
- Live permission inspection corrected the initial source-based diagnosis: team_leader manage_inventory is actually enabled in production, but has_permission scopes this key to a supplied subteam. Fundraising calls without a subteam fail while frontend role permissions expose the form. New manage_fundraising permission is not subteam scoped, defaults to Admin and Team Leader, preserves existing inventory role settings and keeps Finance posting admin-only. All active-member read access was already present. No new private-data read permission.
- Personal attendance receipt on Home and Check-in displays saved timestamps and duration, explicit loading/unknown states, EN/HE, focus/visibility refresh and Check status. Native duplicate submissions lock immediately. After an uncertain submission do not automatically submit again using another verification method. GPS acquisition failures can still fall back to native Wi-Fi. Existing location rules unchanged.
- Pending requests can be corrected/cancelled by their requester with submit permission or active admin. Submitted requests are cancelled, not erased. Prior and revised values remain in audit columns. Row locking and revision checks reject stale edits/decisions. Existing partial quantities/receiving remain. Old decision RPC direct execution is revoked; current clients use revision-aware wrappers. Old APK administrators must update/use current web to approve.
- Full-width compact purchasing rows; expandable detail/history/actions; inventory primary Use/Receive/Request actions and secondary disclosure; fundraising costing columns and responsive rows. Preserve source product/job costs and inventory calculations.

## Verification / release
Local SQL tests cover existing purchasing lifecycle, ownership, cancellation, stale edit/approval, old-RPC bypass denial, audit and repeatable migration. Existing browser attendance, fundraising and mobile stability suites passed. TypeScript and Vite build passed before final polish; final verification recorded below. Live schema read and rollback-only migration validation passed. Browser fixtures are synthetic and do not create production purchases, attendance or sales.

Deployment and APK packaging are in progress; this document does not yet claim production completion. New migration: backend/supabase/operational_clarity_20261008.sql. CI includes the new test. APK target 2.3.1/code26, same signing identity; physical phone/headset acceptance is separate.

## Rollback / compatibility
Keep audit columns and revisions. Frontend rollback requires reviewing legacy decision RPC grants: old clients must not silently approve edited values. Disable manage_fundraising through existing permissions if required; do not reset unrelated inventory grants. No production stock, attendance or financial records were fabricated for testing. Personal Android IDE files and existing release-checkout Gradle path changes are unrelated; preserve them.

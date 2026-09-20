# Workshop, attendance reporting, inventory and Team Stories

User-approved scope, 20 September 2026. This increment does not replace or close the remaining V5.2/simulator programme in PAUSE_HANDOVER_20260913.md.

## Scope and decisions

- **Deferred:** departure-based automatic checkout, background location/geofencing, and any change to current student checkout behaviour until official Android/iOS work. GPS radius, Wi-Fi verification and the existing stale-session checkout function remain unchanged.
- Any active verified member may continue opening an unscheduled workshop. Record and display opener/closer; system actions are labelled. Historical missing actors are not invented.
- User confirmed **keep Sunday and Wednesday, 16:00–19:00** after live configuration inspection. Earlier mention of Monday was explicitly superseded. Early check-in opens at 15:00 Israel time, using the configured schedule, not hard-coded weekdays.
- Fix granted inventory creation/edit access, person/meeting attendance reporting, and editable/compact Team Stories.

## Implementation

### Sessions

`open_due_workshops` generates the next 120 days from active rules and opens scheduled workshop meetings within one hour of start. The database cron job `g3-open-due-workshops` runs every minute, independent of open browsers. The attendance Edge function also activates due workshops after location verification. `open_verified_workshop` serializes ad-hoc openings and reuses the relevant existing/scheduled session. Scheduled-rule uniqueness is preserved while allowing multiple ad-hoc sessions on a date.

No automatic closure on zero attendance was added: a temporary empty room should not close a scheduled meeting. Admins, mentors and leaders can extend an open session by one hour or close it when all attendees have checked out. Existing end-of-session cleanup remains unchanged. The session lifecycle trigger records actor/system, time and extensions. Audit labels are visible in Schedule, Check in and By meeting; full lifecycle events are retained in `workshop_session_history`.

### Inventory

The live role grants for mentor and team_leader were already true. Admin-only UI and RLS blocked them. `manage_inventory` now controls shared stock creation and metadata edits in UI and matching RLS. Existing stock quantities are changed through stock movement controls; editing metadata does not overwrite quantity. Delete remains administrator-only; purchase approval is untouched. Grants refresh on window focus, visibility return and local permission change.

### Reports

Existing tabs retained. Overview has person search, subteam/date/season filters, name/hour sorting, zero-attendance and historical inactive members. Person drawer includes meeting, arrival, departure, hours, methods and correction notes; detail CSV available. By meeting starts with counts, outstanding checkouts, linked approved absences and hours, then opens a complete roster and lifecycle details.

Report reads paginate rather than silently stopping at the API row cap. Open records contribute no finalized hours. Automatic/manual records are labelled; totals explicitly include these closed records. Meeting counts use complete sessions overlapping the selected period, not cropped arrival timestamps. Custom day boundaries and displayed times use Israel time. A calendar absence is matched only to an explicit meeting calendar link, with unambiguous historical title/start matches backfilled. Unlinked meetings show a dash rather than a fabricated absence count or attendance percentage.

Manual roster saves preserve existing observed times. Existing non-manual records cannot be removed by this workflow. Newly added manual records use scheduled times, require an audit reason, and are allowed only after the scheduled meeting end.

### Team Stories

Uploader/admin/mentor can edit title, description, category, date and tags without changing the original file. Optimistic concurrency prevents overwriting a more recent edit. Editor and timestamp recorded. Compact/large picture preference is retained locally. Search/date/category filters operate across the complete library, with 24 items per page. Signed thumbnails and lazy image loading avoid fetching every full-resolution picture; original files remain private and open on request. Image detail opens in an accessible dialog with complete caption/tags.

## Validation

- TypeScript and production Vite build passed (existing large simulator bundle warning remains).
- `test-attendance-reporting.mjs`: unresolved hours, automatic classification, unique sessions, Israel summer/winter date boundaries, 1,203-row pagination and errors.
- `test-workshop-operations-sql.mjs`: isolated PostgreSQL/PGlite; repeatable migration, granted/revoked stock access, non-admin delete denial, early opening and session reuse, opener/closer audit, close protection/extension, observed timestamp preservation, generated media search and edit actor.
- Existing `test-browser-attendance.mjs` passes: GPS success/errors, stale reading, 100m perimeter, low accuracy, authentication, duplicate check-in, late checkout and native Wi-Fi compatibility. Test adapter updated for the opening RPC only.
- Existing absence-attendance checks pass.
- Synthetic browser fixtures: desktop meeting table, person history, inactive member, automatic/open record labels, audit names, locked measured roster checkbox, matching absence, granted/revoked leader Add part, story edit/save, compact library and Hebrew mobile view. No real student attendance or media was modified to test.
- Hardware attendance acceptance still requires an actual workshop visit; no claim of a physical phone test.

Run SQL acceptance with an isolated PGlite module argument, e.g. `node apps/dashboard_web/scripts/test-workshop-operations-sql.mjs file:///.../pglite/dist/index.js`. PGlite is not an application dependency. Preview: `node scripts/preview-workshop-operations.mjs` from dashboard_web, port 4222, synthetic data only.

## Release record

- Production database migration `backend/supabase/workshop_reporting_inventory_20260920.sql` applied successfully.
- Production cron verified active at one-minute cadence; recorded run succeeded.
- Production attendance Edge function updated; existing location/checkout code preserved.
- Web and scheduled-operations deployment verification recorded below when completed.

## Remaining / deferred

- Actual workshop browser/APK acceptance; grant-refresh check on a leader's already-open browser.
- Departure-based/background automatic checkout remains deferred until official mobile application work, as expressly requested.
- No new APK produced; existing installed version remains unchanged, using the compatible updated attendance service.
- Full remaining platform phases remain in the master handover. Do not equate this operations increment with complete V5.2 delivery.

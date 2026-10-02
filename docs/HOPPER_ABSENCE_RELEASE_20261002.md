# Limestone linkage and absence dates — 2 October 2026

## Implemented
- Limestone's horizontal hopper extension now follows intake deploy/stow in the shared published-robot pose function. Deployed travel is 0.303211 m; stowed travel is zero. Independent vertical/climber component is not falsely coupled to intake. Source: frc1678/C2026-Public revision 0f403dd8f3ad1f7d0dbe0c1bd23b24c210f41677, RobotConstants (Epsilon), IntakeDeployConstants, IntakeHopperTrackerConstants and HopperTracker. Static learning-lab inspection remains unchanged.
- Absence cards, request preview and review confirmation show the full meeting weekday/date/year and time range in Israel time. Submission and review dates are separately labelled. Cancelled events remain visible in historical requests.
- Dedicated meeting-date/status filters and absence CSV export, with separate meeting/submission/review columns. Attendance detail CSV also includes meeting start/end. Notification links focus the exact request. Home/Updates notification details contain meeting dates; notification creation is explicitly distinguished.
- Additive SQL migration absence_event_dates_20261002.sql applied successfully to production. Existing absence actions backfilled, event reschedules/cancellations refresh their dates, no new recipients/actions/push delivery. Permissions and review RPCs unchanged.

## Validation and boundaries
Passed TypeScript, Vite production build, real-CAD published-robots test, absence-dates test (Israel midnight, DST, ranges, missing date, CSV escaping), attendance-reporting, absence-attendance and twin-VR suites. Actual CAD visual check confirmed horizontal hopper deployment. English/Hebrew synthetic request/review screens verified. Transactional production SQL acceptance verified rescheduling, idempotence and unchanged notification count, then rolled back all test changes.

Browser CSV download-event confirmation timed out; CSV serialization tests passed. Phone/physical headset acceptance remains pending; browser viewport override did not establish a mobile-device pass. No live student request was approved or rejected for QA.

Hopper motion is sourced; mass, traction, storage packing and shooting remain declared simulator estimates, not measured team-1678 behavior. Existing large-bundle build warnings remain.

## Release / recovery
Web release identity and authenticated acceptance will be recorded after deployment. Prior production: DpXyJJtun9zxCG4PxQubQDCRycnt, source 14279b1. Web rollback remains compatible with the additive notification date migration. Do not remove requests/history to roll back. SQL rollback, if necessary, removes only the two added triggers/functions; existing stamped details are harmless.

## APK and next-session entry
APK remains signed version 2.2.0 / code 24 (21 September). No APK built in this increment: user said a refresh may be needed. Next milestone should use the production release checkout, existing signing identity, next version code and actual Android acceptance; see APK_MILESTONE_20260921.md.
Read START_NEXT_SESSION.md, WORKING_EXPECTATIONS.md and the current-order section of REMAINING_PRIORITIES_20261002.md before proposing more phases. Do not rebuild delivered Academy, Knowledge ingestion, VR, trial records, simulator missions or Java scaffold.

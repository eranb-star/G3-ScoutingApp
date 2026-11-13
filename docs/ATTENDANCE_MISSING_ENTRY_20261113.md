# Missing check-in and checkout — 13 November 2026

## Scope and user flow
- Attendance Center → Current workshop / Last workshop, or By Meeting → selected meeting → missing student → **Add attendance / הוספת נוכחות**.
- Enter actual arrival, actual departure and a reason. Blank times deliberately avoid assuming the student attended the full scheduled session.
- An open, not-expired workshop permits **Still at the workshop** with no departure yet. A finished workshop requires departure.
- Successful save refreshes the roster and totals; the normal existing-record correction remains available afterward.
- Uses the existing active administrator / `correct_attendance` authority, not a new role grant. Students cannot self-create backdated attendance. Manual location checking and automatic-checkout policy are unchanged.

## Integrity
Additive migration `backend/supabase/attendance_missing_entry_20261113.sql`; new `admin_add_missing_attendance` RPC. Israel meeting date, nonfuture actual times, <=24-hour completed record, no duplicate meeting/member record, no overlapping attendance, no QA or mentor target. Existing correction advisory lock and database unique constraint retained. Audit stores actor, reason, new values and creation timestamp. No existing student records rewritten. Approved absence history remains independent.

## Verification and release
- Focused PGlite integration: student/inactive caller denied; reason/date/time validation; completed/open sessions; QA/mentor exclusion; duplicate/overlap rejection; administrator method and audit. Passed.
- TypeScript and production build passed; final UI packaging also runs required CI.
- Actual React form with synthetic API: Hebrew compact layout; blank fields disable save; still-inside disables departure; save converts Israel 16:05 to UTC14:05, sends null departure, closes form and displays success. No real attendance created by UI testing.
- Production schema constraints inspected; additive migration applied successfully via Supabase SQL editor.
- Source89daa4e / release8736ad0; CI402/403 passed. Preview5NeHoBkSN2uFwnnGKYXSVsPyRh8E Ready. Promotion requested but blocked at Vercel authenticator verification; NOT live until user verifies and production Ready is observed. Resume from internal browser tab10. Production metadata confirmed security-definer RPC and anon execute=false. Mobile390px synthetic actual arrival+departure save passed (Israel16:05/18:45 -> UTC14:05/16:45). Website promotion status is tracked in CURRENT_CHECKPOINT_20261009.md. No new APK built for this focused administrator web feature; APK2.7.0 predates these UI controls.

## Recommendation only — preventing forgotten arrival
Existing scheduled-operations source sends a general meeting reminder about one hour before start. Proposed next enhancement (not implemented here): entrance QR linking to existing check-in; one targeted reminder shortly after start for expected students without check-in, excluding approved absences; leader checks the existing missing-students list. Preserve location validation on reminder/QR entry. Do not infer attendance simply from phone proximity. Push delivery is not guaranteed and must not be the sole attendance control.

## Rollback
Revert the frontend release to its preceding deployment. The unused additive RPC can remain; no attendance or audit data should be deleted. Any real mistaken entry must use the normal audited correction workflow.

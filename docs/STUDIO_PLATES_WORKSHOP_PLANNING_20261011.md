# Studio plates and official workshop planning — 11 October 2026

## Scope and user flow
- Robot Build → 3D Studio → Parts library → **Create plate · holes & cutouts**. Rectangle, circle, trapezoid or click-to-draw polygon; grid snapping and exact outline coordinates; circle/rectangle/slot through-cutouts, repeated patterns, selected-cutout movement/mirror/duplicate/delete, undo/redo. Immediate orbitable 3D preview. Add/update commits to the existing design draft; Save version uses the existing cloud/version workflow. Reopening a selected plate preserves its placement and cutouts. Generic dimension inputs are suppressed for custom outlines to avoid changing metadata without geometry.
- Materials: 6061 aluminum (3/4/6 mm presets), polycarbonate/acrylic (2/3/4/6/10 mm), custom positive thickness up to 100 mm. Typical density estimates are labelled; cutouts reduce calculated volume/mass. Physical supplier/material verification remains necessary.
- Aluminum profile builder: hollow 20×20, 20×40, 40×40 mm tubes, editable length/wall. Other cross sections remain editable in the existing inspector. This is not a supplier-specific T-slot extrusion; import exact CAD for that.
- Align to another part: choose reference, world axis, source/reference min/centre/max and gap. Uses world-axis geometry bounds, preserves rotation/hierarchy. Angled faces require visual review; this is not a CAD mate solver.
- Reuse custom parts using existing saved-design/assembly reuse; ordinary duplicate, parent placement and cloud sharing remain unchanged.
- DXF: bounded 2 MB import, closed straight LWPOLYLINE and CIRCLE only, explicit source units. One outer contour; interior contours become cutouts. Unsupported entity types/bulges are rejected visibly, not silently omitted. Export in mm with outline/cutout layers. Curves use 96-segment circle approximation (slots use semicircle segments). Geometry export is not machining approval or CAM/toolpaths.
- Geometry rejects self-intersections, touching/outside cutouts, overlapping/nested holes, zero area and invalid dimensions. Maximum 64 cutouts; 256 vertices per contour.

## Attendance
- Scheduled ends_at remains unchanged. Separate attendance_closes_at is added.
- Existing open/scheduled regular Sunday/Wednesday workshops default to 23:00 Israel time; newly generated regular workshops do too. Historical closed attendance is not rewritten or reopened.
- Auto closure checks out only remaining open records at the cutoff, labelled automatic, and closes the session. Existing actual checkout timestamps remain intact.
- The Edge attendance service uses the same database closure operation. Home, check-in and current workshop queries/use-window logic use the cutoff, not scheduled end.
- Admin existing remote bulk closure still takes actual departure time/reason; for an open workshop its default is now, rather than scheduled end. Supervisor extension changes cutoff only and records history.
- Existing scheduler runs every 15 minutes. Closure is due at 23:00 and executed on the scheduled run; execution delay remains possible. This is a fallback, not measured departure.
- Legacy APK frontend predates the new cutoff-aware screens; website is current. Server-side closure applies to all clients.

## Official one-time workshops
- Attendance Center and Team Schedule expose **Schedule workshop** for active admin/mentor/team_leader roles.
- Future date/start/end/cutoff are entered as Israel wall time, even when device timezone differs.
- Name, location, instructions, whole team or one existing subteam, required-attendance flag.
- Single transactional RPC creates linked team_meetings + team_calendar_events. Meeting type workshop enables the existing automatic opening/check-in lifecycle. Absence selector uses the same calendar event and filters participant applicability.
- Leaders can edit/cancel their own upcoming one-time workshops; admins/mentors can manage upcoming one-time workshops. Existing recurring rules and past/started sessions are not editable through this form. Overlapping workshops are rejected under a transaction advisory lock.
- Reschedule preserves calendar identity and existing absence links. Cancellation soft-cancels both records. Calendar updates follow linked scheduled workshops; started-workshop date/cancel changes are rejected.
- Publishing confirmation means in-app availability, not guaranteed push/email delivery.

## Verification and release
Deployed to https://g3-6740.com on 11 October 2026. Development `690bae625d66d06b4ac2d1d08987aefcc867278d`; release `90db63ff325424c6956250e893061c60ac4809f0`. CI373/374 passed. Production Vercel `4M3RwBLoTxkmVmR8rc1Fhw68rwGt` is Ready and assigned to g3-6740.com (production rebuild of promoted preview `2cBiPYmr4V3aj6jFQiGxJsbyZb45`). Migration `backend/supabase/workshop_planning_20261011.sql` applied; attendance Edge function deployed and persisted RPC source verified after reload.

Live production acceptance: created private “Plate and profile demo”, saved version 1 and reloaded from cloud; reopened its custom plate with Cutout 1 preserved and 1.938 kg estimated mass. Attendance Center Schedule workshop form opens with clear scheduled-end/cutoff distinction. No real meetings or attendance were created/changed as QA. Production recurring dates 14 and 18 October show scheduled end 19:00 and cutoff 23:00 Israel time. Screenshots: `docs/staging/studio-plates-production-20261011.png`, `docs/staging/workshop-planning-production-20261011.png` (local evidence).

Browser acceptance covered desktop and Hebrew desktop, not a physical phone or verified 390px viewport. CNC fabrication and actual late workshop operation remain physical acceptance. The alignment helper uses world bounds; do not use a descendant of the moved part as its reference because that reference moves with its parent.
Focused checks already completed: TypeScript; Vite build; Studio domain/geometry and 93-entry catalogue tests; DXF roundtrip/unsupported entity rejection, cutout volume and invalid geometry. Production-schema migration + role/link/reschedule/cancel/cutoff/extension fixtures passed inside a rolled-back transaction. Synthetic browser plate creation/edit/version save and workshop publish confirmation passed. No real attendance or meetings created as QA.

## Boundaries
No new APK in this scope. No retrospective correction of today's 19:00 checkouts without actual departure evidence. Full FRC catalogue acquisition remains open. No full CAD constraint solver, T-slot supplier generator, CAM, arbitrary DXF entities or machine-ready certification.

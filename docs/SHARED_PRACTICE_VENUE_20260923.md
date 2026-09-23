# Shared practice and competition venue — 2026-09-23

## User direction
Extend the existing simulator across desktop web, phone web and VR. User requested more realistic carpet and competition surroundings and selected **timed practice with results and replay** as the next functional increment. Continue the existing engine; do not build separate platform simulators.

## Delivered scope
- Competition hall / Field only environment setting, saved locally with safe fallback. Generic illustrative hall: tiered seating, aisle rails, structural columns, driver-view overhead fixtures and live practice score screens. Not a surveyed replica of an event venue; no crowd or new collision geometry.
- Procedural carpet pile texture with subtle bump relief, mipmaps and metre-based UVs on recognized carpet surfaces in the actual field model. Tape and field geometry remain intact. Rendering does not change carpet friction or driving physics.
- Instanced venue geometry; Low omits seat detail and overhead fixtures. Medium/High retain them. Shared by desktop, phone web and immersive VR; headset/mobile performance still needs physical acceptance.
- Collapsible training panel with EN/HE labels; fullscreen keeps the field dominant and a compact timer. One 60-second collect-and-shoot exercise resets to the normal starting position and the same 504-ball arrangement, including eight robot preloads. Current robot/intake/shooter settings apply and are recorded for the run.
- Clock counts fixed simulation steps while driving, not wall time. Pauses, lost focus and released VR grip do not consume practice time. Automatic finish freezes the simulation. New attempt, replay and free practice are explicit actions.
- Results: completed/early-ended, simulated duration, balls scored, shots, scoring ratio, distance and input method. Both hubs count as practice goals; these are not official match points. Airborne shots at the cutoff are not awarded later.
- Bounded 10 Hz visual recording (at most 601 snapshots for 60 seconds), with interpolated robot and ball positions, chassis orientation and recorded hopper state. Playback/seek does not step physics or change the live world. Replay uses the selected camera and shared renderer. Setup/playback is selected outside VR; right grip advances playback inside VR.
- Latest run is held in memory on this page only. New attempt/reset/refresh discards it. No cloud history, import/export, ghost comparison or full match rules in this increment. Changing mechanism/robot settings ends an active attempt; replay requires matching settings.

## Verification
- TypeScript checked; bounded recording, result math, interpolation, early finish, detached snapshots, carpet mapping against real field GLB, venue clearance and storage fallback tests passed.
- Existing VR tracking/deadman/recenter/exit tests, hopper lifecycle, shooting/scoring and quality regression tests passed. Scene-material checks passed.
- Browser: full 60-second idle attempt ended automatically; second full attempt fired eight shots and showed eight in results. Replay started; seeking to zero restored eight-ball hopper. No observed console errors. Driver-view hall, fullscreen, phone-size layout and Hebrew labels reviewed. Desktop observed 44–60 FPS while simulating; this is not a performance guarantee for phones or headsets.
- Physical headset and phone tests remain pending. Current Android APK 2.2.0 does not contain this newly bundled code; use the website for this release. No database or paid AI changes.

## Next shared increments
Persisted training history and comparable runs (matching settings/input context), ghost/comparison and additional drills; then measured robot calibration and full-match rule/robot interaction increments. VR station selection and in-headset training menus remain separate presentation/input work. Do not describe the shared practice prototype as completion of these phases.

## Release
Pending production build and verification; append exact release identifiers after verification.

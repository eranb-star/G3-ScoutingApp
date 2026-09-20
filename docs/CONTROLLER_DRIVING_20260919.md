# Simulator controller driving — 19 September 2026

## Root cause and correction

The old Gamepad branch passed left-stick horizontal into field `vx`, inverted vertical into field `vy`, and positive right-stick horizontal into positive `omega`. The physics engine uses field XY with robot front at local +X and positive counter-clockwise rotation. Consequently forward stick input strafed at the initial heading, and right rotation turned left.

The new controller adapter expresses intent as forward, right strafe and clockwise turn, then transforms translation using the current robot heading for each physics step. Robot-relative is the default; explicit field-relative mode uses +X forward / −Y right. Neither is camera-relative. Keyboard/touch retain their existing labelled field-axis semantics. Physics, intake capture and shooting parameters are unchanged.

Standard controller defaults follow the browser [Gamepad standard mapping](https://www.w3.org/TR/gamepad/#remapping): forward uses inverted axis 1, strafe axis 0, clockwise turn axis 2 (converted to negative physics omega). A toggles intake on the press edge; RT shoots while held; B disables. Start remains on-screen and Space always disables.

## User flow

1. Open Field & robot studio → Driving & controls → Gamepad / Xbox. Connect the controller and press a button so the browser exposes it.
2. Choose the controller if several are connected. Robot-relative forward follows the front intake after turning.
3. While disabled, use the live Forward / Strafe / Rotation indicators to verify directions. Expand Axes, direction & sensitivity for raw axis values, per-axis mapping/reversal, dead zone, response curve and drive/turn limits. Released-stick calibration stores small neutral offsets; large offsets are rejected.
4. Non-standard devices require explicit mapping verification. Two-axis joysticks can set strafe to Not assigned and map separate forward/turn axes. Buttons can be remapped or unassigned; duplicate assignments and missing inputs prevent enabling.
5. Release sticks, triggers and mapped buttons, then Start driving. A held input prevents enabling. Setup is locked during driving or recording. Disconnection/lost focus/hidden document disables; reconnection never starts automatically.

Profiles are versioned and validated, keyed by controller identifier, browser mapping and axis/button counts, and saved in this browser. Invalid/unavailable storage falls back safely to defaults/session settings. Identical models may share the same browser identifier/profile. The selected controller slot is used exclusively; another connected controller does not silently take over.

## Evidence and acceptance

- `scripts/test-gamepad-driving.mjs`: synthetic standard/non-standard pads, correct forward at cardinal headings, right strafe/clockwise turn, explicit field mode, diagonal caps, curve/deadband, calibration, two-axis configuration, invalid/disconnected devices, button/neutral logic and profile storage.
- Real Rapier tests confirm forward displacement at 0° and 90° robot headings, plus clockwise physical rotation.
- Isolated browser harness confirms held-stick start rejection, intake edge toggle, held shooting, release/stop and selected-controller disconnection. Desktop setup layout inspected. Synthetic controller fixture exists only in local preview scripts, not in application code or production assets.
- TypeScript and Vite build passed. Existing large simulator bundle warning remains.
- Actual Xbox/joystick hardware was not available to this agent. Team acceptance remains: forward/reverse/strafe/turn at two headings, trigger release, stop, disconnect/reconnect, saved profile after reload; verify their actual browser/controller combination. Do not report this hardware acceptance as complete.

No database or APK update. No robot-code, PID or live hardware control integration added. Keep all remaining V5.2/simulator tasks in the master pause handover; this closes the controller mapping correction, not the larger simulator acceptance programme.

## Production release

Application commit `e9f59ba`, pushed and deployed via production rebuild `6KJEFAzG9mQrXT4piPXWJQQHME7M`. Verified live on 20 September 2026: HTTP 200; `index-Bp0nxVt1.js` and `FieldTwinPage-DRbsIXiE.js`; production Supabase reference present, QA absent; saved profiles, robot-relative mode, neutral start and calibration present. Synthetic controller fixture absent. Finance repayment update remains present. No physical controller hardware acceptance is claimed.

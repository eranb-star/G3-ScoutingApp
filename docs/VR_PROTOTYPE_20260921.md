# VR phase 1 — 2026-09-21

User authorized implementing and deploying this bounded prototype to test their headset (photo appears to show Quest 2; model not independently confirmed).

## Included

- Existing 2026 detailed field and reference KitBot, at original metre scale. Red driver station 1, 0.60 m behind the station. No artificial locomotion of the observer.
- Immersive WebXR, required local-floor tracking, real headset eye height and head movement. X recenters horizontal position and forward direction without inventing floor height.
- Quest Touch controls: hold right grip to enable simulation; left stick robot-relative forward/strafe; right stick turn; hold left trigger to intake, right trigger to shoot; B exits. Release right grip to pause. Both controllers must be tracked; neutral sticks and released grip/triggers required before arming after entry, tracking/focus loss, recenter or >250 ms frame gap.
- Medium default (0.8 XR framebuffer scale, maximum requested foveation, Medium scene shadows); optional High comparison (1.0 scale, no requested foveation). Desktop quality preference is restored on exit. Browser/device chooses actual refresh rate and resolution.
- Head-attached compact FPS, eye height, worst frame gap and >20 ms gap counter. Physics driven by XR frames using the existing fixed-step simulation. Desktop rendering now uses Three.js setAnimationLoop as required for immersive sessions.
- Unsupported browsers retain desktop simulation and show a disabled VR entry. Custom uploaded robot and historical seasons are outside this prototype.

## How to test

1. In the headset, calibrate its floor/boundary correctly. Use Meta Quest Browser on Wi-Fi; open https://g3-6740.com/field-twin and sign in normally. No PC streaming or new APK is required for this standalone route.
2. Select 2026, detailed 3D field and reference KitBot; wait for field/robot/physics loading. Leave High unchecked and select **Enter VR · prototype**, then allow the browser's immersive permission.
3. Face forward, press X to recenter. Release sticks, triggers and right grip; then hold right grip and drive. Release grip to pause; B exits.
4. Test standing view/occlusion, turning head, driving/intake/shooting, pause/recenter/exit and headset removal. Report typical FPS and worst frame gaps after a few minutes. Compare High only after Medium is comfortable.

## Verification and limits

Automated tests cover controller gating, duplicate entry, floor origin/yaw/eye-height transforms, tracking/focus/frame-gap pauses, recenter, exit and quality settings. Existing gamepad, physical driving, intake, shooting, hopper, scene materials and telemetry regressions pass. TypeScript passes. Local desktop fullscreen renders at the existing 60 FPS with no observed console errors; driving remains enabled normally.

Actual immersive rendering, controller mappings on this physical device, headset thermal performance and comfort are **not yet verified**. A desktop FPS result does not establish VR performance. This is a production-accessible prototype, not acceptance of realistic match simulation. Physics remain simplified and uncalibrated; other robots, people, venue glare, full match rules and real team robot behavior remain outside scope. Medium retains full model geometry and may still need optimization on Quest 2. Do not claim that graphics quality equals physical reality.

No database, paid AI, permission or Android changes are included. Existing APK 2.2.0 predates this browser VR feature.

Deployment record will be appended after production verification.

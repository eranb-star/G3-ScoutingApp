# Graphics A + B implementation checkpoint — 2026-09-21

User authorized implementation of graphics A + B and default arrow-key keyboard movement. This supersedes the earlier awaiting-start wording in the phase agreement. Local implementation and preview only; no production deployment or push is claimed.

## Delivered

- Balanced warm key/cool fill/environment lighting, lower exposure/environment intensity, matte wheel/ball material adjustments and dynamic shadows on field/robot/fuel.
- Low/Medium/High: device pixel-ratio caps .75/1/1.5; shadows off/1024/2048. Preserve source materials/colors of uploaded CAD.
- Auto starts Medium, observes 1.5-second FPS windows, lowers after three consecutive windows below 40 FPS, raises after ten above 57 FPS, with three-window cooldown. Loading/resize/visibility warm-up resets prevent transient downgrades. Thresholds are initial conservative policy, not calibrated guarantees for all devices. Manual tiers never auto-adjust.
- Saved Auto/Low/Medium/High preference with effective tier displayed; blocked storage uses session-only selection and a visible message. EN/HE/RTL controls, separate from driving toolbar, retained in fullscreen.
- Quality changes update existing renderer without restarting simulation or changing model selection/physics. Camera orbit no longer resets on resize; returning from Top/Follow to Orbit restores overview.
- Visible localized renderer-failure overlay/retry, including fullscreen; failure disables driving. Retry rebuilds graphics, not physics.
- Default movement: Arrow Up/Down/Left/Right. Turn Q/E, intake I, shoot F, reset R, Space disable remain. An exact legacy default profile migrates to arrows; customized valid profiles are preserved. Restore default keys selects arrows.
- Preview harness includes EN/HE switching for repeatable UI review; no production language toolbar added.

## Validation performed

- TypeScript project check and Vite production build passed; existing large-bundle warning remains.
- New test-twin-quality: sustained adaptation, cooldown/hysteresis, reset, preference validation/blocked storage, legacy-key migration and custom-profile preservation passed.
- Existing telemetry/key, physical driving, intake, shooting/lifecycle and gamepad regression scripts passed. Physics modules unchanged.
- Real local preview at http://127.0.0.1:4213/: assets loaded/checksum verified, arrow labels visible, Auto reached High under sustained reported 60 FPS, manual High and Low switch, High persisted across reload, fullscreen quality control accessible, Top selection works.
- Desktop 1440x1000 and phone-width 390x844 UI inspection, including Hebrew/RTL quality control; viewport override reset. This is browser responsive testing, not physical-phone acceptance.
- Keyboard taps and Space were exercised in UI, but taps did not establish measurable held-key displacement; do not claim full physical-keyboard driving acceptance from that check alone.

## Remaining acceptance / release limits

No matched before/after performance benchmark, actual school/Mac/mobile hardware validation, forced context-loss recovery exercise, fresh uploaded-model acceptance or physical controller session is claimed. Numerical FPS thresholds may need adjustment from representative-device measurements. Current local 60 FPS is not a hardware guarantee. No paid AI or database changes.

Use the known production release checkout for subsequent release integration; do not deploy the accumulated main branch wholesale. Preserve the user's Android .idea modifications. Revert the feature commit to roll back code; saved quality value is harmless to older code. Refer to NEXT_PHASES_AGREEMENT_20260921.md for broader scope; other phases were not started.

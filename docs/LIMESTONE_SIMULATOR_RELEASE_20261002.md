# Limestone simulator and alliance bumpers — 2 October 2026

## Delivered scope
- KitBot, Darwin and Limestone bumpers follow the selected player alliance. The computer uses the opposite alliance. Crossing the field does not change allegiance. White KitBot numbers remain white; unrelated CAD materials remain untouched.
- Limestone (1678) is selectable for the player and computer, with shared physical practice, replay settings identity, planning profile, published-CAD camera analysis and the shared VR renderer.
- Existing pinned Limestone files are reused directly from the public team source, hash-verified and stored in the existing bounded 80 MiB browser model cache. No CAD database upload or extra Vercel-hosted 45 MB copy.
- Learning Lab continues using the same stationary inspection pose; simulator intake animation is applied separately.

## Source and estimates
Source: existing `limestoneManifest.json`, revision `0f403dd8f3ad1f7d0dbe0c1bd23b24c210f41677` of frc1678/C2026-Public. Published `CompConstants.java` supplies intake pivot (.309, -.309, .169), and `subsystems/intakedeploy/IntakeDeployConstants.java` supplies 0-degree deployed / 130-degree stowed angles, applied with negative pitch.
CAD bumper envelope .8128 by .81915 m, reference body height .59 m. Practice estimates: speed 2 m/s, turn 1.8 rad/s, capacity 60, triple rear shooter, intake reach .22 m / width .72 m. These are explicitly editable estimates, not certified 1678 measured performance. Collision and hopper packing remain approximate; deployed CAD is not a calibrated mechanism model.

## Regression lessons
Darwin `mat_0` is shared by bumpers AND structural pieces: recolor only `Part_5`. Limestone bumper is `Part_7_1` with `mat_41`; KitBot uses `mat_6` on Front Bumper. Clone selected materials per actor to avoid changing both alliances together. Number textures have transparent backgrounds so white numbers survive color changes. Opponent KitBot clones must be visible even when the player has another model. Pending published loads must not restart during rapid selection changes.

## Verification
Passed TypeScript, production build (existing large-chunk advisory), real-CAD checksum/bounds/bumper isolation test, physical Limestone collection and AI scoring with conserved 504-ball inventory. Passed robot-learning, twin-vr, fuel-intake, shooting, studio-match (including Java compile), and simulator-training regressions.
Local browser: actual Limestone cold load, blue/red bumpers, deployed intake, same-model opposite-color opponent. Source CAD geometry and non-bumper colors preserved. Headset hardware performance was not measured; prior VR prototype limitations remain. No APK rebuild (still 2.2.0/code 24), database migration or new team permissions.
`test-published-robots.mjs` uses the hash-verified Limestone GLBs already downloaded in ignored `docs/staging/limestone-learning.local`; these are not committed. Other checks do not require that download.

## Release
Production Ready: `DpXyJJtun9zxCG4PxQubQDCRycnt` at https://g3-6740.com, source `14279b1e0839014dff166371277c528b02bb7b47` (main implementation `6bec51b`). Live signed-in acceptance passed: Limestone selector, actual full-screen CAD, red and blue bumpers, deployed intake, eight preloads / 60 capacity. Local same-model opponent confirmed opposite-colored bumpers. Screenshot: `docs/staging/limestone-production-20261002.png` (local evidence, not committed). Previous production: `3SC96qomfb5Rj5FGFh4HEMe2FEkj`, source `7d67507`; rollback may promote that deployment.

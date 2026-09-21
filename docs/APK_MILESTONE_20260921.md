# Android milestone 2.2.0 — 2026-09-21

Signed installable APK: releases/G3-Team-Hub-2.2.0.apk (local release artifact; APK binaries remain ignored by Git).

- Package com.g3.scouting; versionName 2.2.0; versionCode 24; minimum Android API 24.
- Size 57,781,393 bytes (~57.8 MB decimal). Includes bundled simulator field/robot assets, explaining growth from the old APK.
- SHA256 13832a31013f9830c0009eb9bf64e10987050f33a2c47d653ef8f42338fe0f36.
- Release signing certificate SHA256 45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580; verified identical to 2.1.9. Eligible for an in-place update; actual device installation remains pending.
- Web code from verified production release 877208b (release worktree at documentation follow-up 191e8ad). Rebuilt with existing production backend configuration, copied through Capacitor into unchanged native implementation plus version bump. No remote server/preview URL in packaged Capacitor config. Do not rebuild APK from the broader development branch without isolating production web code.
- Includes connected knowledge/assistant frontend, current production workflows and full simulator graphics/intake/hopper/driver-view/fullscreen milestone. Existing production backend/permissions/budgets unchanged.
- Validation: Vite build, signed Gradle assembleRelease with Java 21, R8, release lint and Crashlytics mapping upload successful in the final same invocation. apksigner verification passed. All 39 production dist files byte-hash matched inside APK. Manifest package/version verified; DEBUG=false and CRASHLYTICS_TEST_BUILD=false.
- Runtime: C:/Users/user/.jdks/jbr-21.0.11. Current Android Studio JBR was Java 25 and incompatible with this Gradle build; use explicit Java 21. Existing Gradle deprecation / SDK XML / flatDir warnings remain; build passed.

## Next session

This is the requested milestone. No new programme phase was started. Consult NEXT_PHASES_AGREEMENT_20260921.md when the user returns and selects the next increment.

Physical acceptance still required: install over existing app without uninstalling, sign-in/session retention, GPS attendance, push notifications, knowledge/assistant access, EN/HE and simulator performance on a real phone. Do not equate artifact/signature checks with physical acceptance. No Google Play distribution performed.

Preserve private signing files and personal Android .idea edits. Prior APK 2.1.9 remains in releases as a historical artifact; Android normally rejects version downgrades without additional steps.

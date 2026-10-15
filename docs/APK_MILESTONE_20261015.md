# Android 2.6.0 — 15 October 2026

Signed release APK generated; physical phone acceptance remains open.

- Package `com.g3.scouting`, version2.6.0/code29; minimum API24, target API36.
- Final frontend rebuilt from release `7f3e457` (development `bbcf198`), including supplier invoices/settlements, refunds, returns and saved code-review findings. Supersedes the earlier same-version local APK; that earlier artifact was not distributed as the final release.
- Artifact: `releases/G3-Team-Hub-2.6.0.apk`; matching R8 mapping retained beside it.
- SHA256: `ce53dc1c0229be34a813270fb4b8586c633717896a14207422d524a373ed8e86`.
- Signing certificate SHA256: `45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580`, identical to2.5.0; signature verification passed.
- Vite build, Capacitor sync, Gradle assembleRelease/lintRelease passed. All126 built web assets match the APK byte-for-byte. Existing SDK XML/flatDir/Gradle warnings remain.
- Includes the workflow reliability frontend and notification registration/absence lookup changes, plus the workshop, plate-editor and mechanical-tool releases since2.5.0.
- Existing generated Gradle files restored after sync; unrelated Android IDE changes preserved. No signing material committed.
- ADB reports no attached device. Installation, foreground/background notification receipt and real-device acceptance are not claimed. Install over the existing app without uninstalling to preserve local data.
- Catalogue expansion remains OPEN; this APK does not provide all FRC parts. See ROBOT_STUDIO_CATALOGUE_PLAN_20261011.md.
- Final workflow release and explicit acceptance limits are tracked in WORKFLOW_RELIABILITY_PROGRESS_20261015.md. Real-device push receipt is still unverified.

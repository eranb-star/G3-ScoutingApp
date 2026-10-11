# Android milestone 2.5.0 — 11 October 2026

Status: signed release APK generated and packaging verification passed. Physical phone acceptance remains open.

## Source and scope
- Package com.g3.scouting; versionName 2.5.0; versionCode 28 (previous 2.4.0/code27).
- Bundled frontend rebuilt from isolated production release d6d5accff4d2a8994975e4c24eba0e1706ff4fdf. Website remains Vercel CfoCPa7BdXrZWt81ezbQV4XTpSsL, g3-6740.com. This packaging does not redeploy the website or change backend permissions.
- Includes all source changes since APK web baseline 9f11bee: compact/deferred personal reminders; Work navigation and Team Operations separation; current/last workshop attendance; team-leader CAD access UI; Engineering software/evidence/log/autonomous/test workflow; guided Robot Build; 3D Studio; 93-entry catalogue/chassis/editing/manual-save/mobile corrections. Earlier Academy, fundraising, inventory, purchasing, finance and simulator features remain included.
- Current server-side features continue to use their existing production deployments. Robot GitHub remains read-only. No new Onshape grants, paid project or robot deployment.

## Catalogue gap — explicitly OPEN
This APK does not complete the catalogue. There are 93 ready source-derived entries, including assemblies/subassemblies/hardware, not 93 independent product families and not every FRC part. Missing ready models include Limelight, CANivore/CAN distribution, CANcoder, Pigeon, exact roboRIO 2.0, MAXSwerve, further motors/controllers and pneumatics. External source links are labelled import required.

Follow [the acquisition register](ROBOT_STUDIO_CATALOGUE_PLAN_20261011.md) and [the correction release](ROBOT_STUDIO_CATALOGUE_RELEASE_20261011.md). Next work: acquire exact product variants and reuse rights; validate units/orientation/bounds/geometry; record source/hash/mass or unknown; identify included children to avoid double-counting; integrate searchable models; check actual phone performance and persistence. Do not close this gap because the APK was released. Unknown mass and simplified geometry stay explicitly labelled.

## Verification and artifact
- Artifact: releases/G3-Team-Hub-2.5.0.apk; 70,216,188 bytes (~70.2 MB).
- SHA256: e570fb92205cfd50ae8f69c78b3471e72575c2fbb572ed7963b04e2149826e76.
- Signing certificate SHA256: 45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580; verified identical to APK2.4.0, supporting in-place upgrade. APK signature v2 verification passed.
- Manifest confirms com.g3.scouting / 2.5.0 / code28, min API24, target API36.
- TypeScript, Vite, Capacitor sync, Gradle assembleRelease + lintRelease succeeded; R8 and Crashlytics mapping upload succeeded. DEBUG=false and CRASHLYTICS_TEST_BUILD=false.
- All 126 rebuilt production dist files matched byte-for-byte in APK assets/public. Production backend present; no remote web server override in Capacitor config.
- Nine focused mobile notification/auth/navigation checks passed. Existing Vite chunk-size, SDK XML/flatDir and Gradle deprecation warnings remain.
- Matching mapping retained in releases/G3-Team-Hub-2.5.0-mapping.txt. APK and mapping remain ignored local deliverables, not Git uploads.
- ADB found no connected phone. Packaging success does not prove phone installation, native OAuth/file handling, notification delivery or 3D performance.
- Native version configuration and documentation are committed locally; no redundant website deployment or broad CI run was triggered for packaging.

## Physical acceptance before team-wide rollout
Install over the existing app without uninstalling. Verify preserved login/session, EN/HE navigation, GPS check-in/out, notifications, file import/download, CAD/Robot Build and 3D Studio on a real Android phone. Test a larger scene for memory/performance. No physical acceptance or Play Store publication is claimed.

## Reproduction and preservation
Java 21 at C:/Users/user/.jdks/jbr-21.0.11; build frontend, Capacitor sync android, Gradle assembleRelease lintRelease with existing private signing configuration. Never commit signing material or production environment secrets. Preserve original generated Gradle file contents after sync because the local node_modules junction produces workstation-specific paths. Keep the APK and R8 mapping together under ignored releases artifacts. Android refuses ordinary version-code downgrades; retain the previous APK but do not suggest uninstalling to roll back without addressing local data.

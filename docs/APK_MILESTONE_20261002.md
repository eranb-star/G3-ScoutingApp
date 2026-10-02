# Android milestone 2.3.0 — 2 October 2026

Signed artifact: releases/G3-Team-Hub-2.3.0.apk (ignored binary, local deliverable).
- Package com.g3.scouting; versionName 2.3.0; versionCode 25; minimum API 24, target API 36.
- Size 69,393,127 bytes. SHA256 df400954a750d7e6cfcad1d41a04603463cf5d9028bb503f95754cb5448e4b2a.
- Signing certificate SHA256 45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580 matches 2.2.0 and permits an in-place update. Preserve existing signing identity; no secrets committed.
- Bundled web rebuilt from isolated production release checkout becf028, production implementation 35ab794 (live deployment 56T93uBBkRtDMJQYcJX4bCejHDBu). Includes current Academy/Knowledge, simulator/robots/training, hopper linkage and absence date improvements. No website redeployment needed for this native version increment.
- Validation: Vite build; Capacitor sync; Java 21 Gradle assembleRelease + lintRelease SUCCESS; R8 and Crashlytics mapping upload; apksigner verification; manifest version; all 98 dist files byte-identical inside APK; production backend present; no remote server URL; DEBUG=false and CRASHLYTICS_TEST_BUILD=false. Eleven mobile notification/auth/navigation regression checks passed.
- Build used C:/Users/user/.jdks/jbr-21.0.11. Existing SDK XML/flatDir/Gradle deprecation and vendor lint-baseline warnings remain. Capacitor sync resolves a local node_modules junction to a long relative path: restore tracked portable generated Gradle references after building; do not commit workstation paths.
- ADB found no attached device. Actual installation over 2.2.0, session/login, GPS attendance, notifications, EN/HE, simulator performance and absence report download remain physical acceptance. No Play Store release performed. Do not uninstall the old app before updating.

Next work: use the current priority order in REMAINING_PRIORITIES_20261002.md; delivered capabilities and remaining inputs are unchanged by packaging. This milestone supersedes the old APK status in earlier dated release notes. APK binaries stay outside Git; version configuration and this reproducible record are committed.

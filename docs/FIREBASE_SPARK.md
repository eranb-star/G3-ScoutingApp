# Firebase Spark: Android diagnostics

Prepared 2026-09-07. Project: `scouting-6740`; Android package: `com.g3.scouting`.

## Scope and cost boundary

Keep the project on **Spark**. Do not link a billing account, upgrade to Blaze, enable paid Google Cloud services, deploy Firebase Functions, or configure BigQuery/Cloud Logging exports. Firebase lists Cloud Messaging, Crashlytics and Performance Monitoring as no-cost products. This change adds the latter two to the existing Android Firebase configuration; it does not change the cloud plan.

Supabase remains the backend and Vercel remains the web host. The ignored local `android/app/google-services.json` is reused; no service-account credentials belong in the app or repository. The existing Firebase BoM remains pinned at `34.17.0`.

## Behavior

- Release builds collect native Crashlytics reports and native Performance Monitoring metrics. Debug builds disable both through merged manifest flags.
- Build with `-Pg3TelemetryEnabled=false` to disable both in a release. This is a rebuild/reinstall switch, not a remote switch. It leaves FCM available. Crashlytics may retain unsent reports locally while collection is disabled.
- Crashlytics' Gradle plugin supplies build identification and release obfuscation mapping upload tasks. Keep release mappings and the matching APK together; verify readable frames in the console before rollout.
- Missing Firebase configuration produces an explicit build warning and disables release collection. Malformed configuration or plugin failures fail the build rather than silently pretending telemetry works.
- No custom member IDs, emails, attendance locations, finance data, log messages or exception payloads are added. No Analytics SDK or custom Remote Config features are added. Performance Monitoring brings its own Remote Config dependency as documented by Firebase.
- These Android SDKs do not provide a React JavaScript error-reporting bridge or instrumentation of WebView `fetch` calls. Native startup/rendering metrics are not evidence that individual React routes or Supabase requests are fast. Web telemetry is a separate follow-up.

## Local verification

Use Java 21 with the repository's Gradle wrapper. From `apps/dashboard_web`, build TypeScript/Vite, run all existing source verification scripts except the optional live-schema probe, then copy with Capacitor:

```powershell
node node_modules/typescript/bin/tsc -b
node node_modules/vite/bin/vite.js build --configLoader runner
node node_modules/@capacitor/cli/bin/capacitor copy android
cd android
./gradlew.bat --no-daemon :app:assembleDebug :app:processReleaseMainManifest --console=plain
cd ..
node scripts/verify-firebase-spark.mjs
```

Verify the off switch by processing the release manifest with `-Pg3TelemetryEnabled=false`, then run the script with `--release-disabled`. Reprocess the default release manifest afterward so the next build has the intended collection state. This script checks compiled manifest flags, FCM service retention, and hashes of every copied web artifact; it cannot verify the server plan or delivery.

## Live acceptance still required

Observed locally on 2026-09-07: TypeScript/Vite build, all 13 existing source suites, debug assembly, signed `telemetryQa` and signed `release` assembly (including R8/lint), manifest/build-flag checks, release off-switch check, and hashes of all 19 web files inside both signed APKs passed. APK signatures verified. DEX inspection confirmed the QA control exists only in the QA APK. Local validation excluded Crashlytics mapping uploads. The user's screenshot confirmed Spark. Authenticated preview testing, mapping upload, live reports and device installation remain pending.

1. **Confirmed by the user's screenshot:** the project shows Spark, No-cost ($0/month). The user also opened Crashlytics for G3 Team Hub Android and reached the SDK/test-crash instructions. Use the user's signed-in external browser; Codex browser login is not required. No billing settings were changed.
2. Review and commit the nine product files listed in `PROJECT_HANDOFF.md`, excluding both `.idea` files. Push `web-portal-preview`. Open the Vercel deployment whose source commit matches this push, and validate login, Administration → Finance, and unsaved form preservation after tab switching at desktop and phone widths. Promote only after preview acceptance.
3. Rebuild/copy the accepted web source and verify the Android asset hashes. Android Studio: open the `apps/dashboard_web/android` project; set Gradle JDK to Java 21; use **Build → Generate Signed App Bundle / APK → APK**, the existing release keystore, then select **telemetryQa**. Do not create a new keystore. This variant is `2.1.2-crash-test`, code `16`, signed with the existing app identity. It replaces the normal app on the QA phone. If Android reports an incompatible signature, stop instead of uninstalling and losing local app data.
4. Install the test APK, open it, tap **QA: Test Crash**, and confirm **Test Crash** in the dialog. The app deliberately closes. Reopen it with internet access. In the external browser, refresh Crashlytics and check for `2.1.2-crash-test`. Allow up to five minutes. The ordinary `debug` variant has collection disabled and is unsuitable for this check.
5. Foreground/background the test app and navigate normally; check Performance Monitoring for incoming native metrics. Verify push reception and notification deep links. If the report is missing, inspect device logs rather than enabling paid services.
6. Generate the signed **release** variant using the same Android Studio steps and keystore. This is `2.1.2`, code `16`; its compile-time flag disables the QA control and R8 removes the test code. Install this normal APK over the test build. No source edit or second web release is needed to remove the button. Confirm the button is absent and repeat login, Finance, resume and push checks. Record physical installation explicitly.

Command-line equivalents from the Android project are `./gradlew.bat :app:assembleTelemetryQa` and `./gradlew.bat :app:assembleRelease`, with Java 21 and existing local signing properties. APK output paths are `app/build/outputs/apk/telemetryQa/app-telemetryQa.apk` and `app/build/outputs/apk/release/app-release.apk`. Normal builds run the Crashlytics mapping upload tasks; local validation builds that exclude these tasks do not prove that server-side deobfuscation works.

Do not mark this phase live or released until console and physical-device evidence exists. No SQL migration or Supabase deployment is required. Firebase-only native changes do not require Vercel promotion; the preserved, uncommitted React auth fix does require promotion when released.

## Primary references

- [Firebase pricing](https://firebase.google.com/pricing)
- [Spark and Blaze plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
- [Android Crashlytics setup](https://firebase.google.com/docs/crashlytics/android/get-started)
- [Android Performance Monitoring setup](https://firebase.google.com/docs/perf-mon/get-started-android)
- [Disable Performance Monitoring](https://firebase.google.com/docs/perf-mon/disable-sdk?platform=android)
- [Crashlytics collection controls](https://firebase.google.com/docs/reference/android/com/google/firebase/crashlytics/FirebaseCrashlytics)

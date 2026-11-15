# Google Play submission — 15 November 2026

## Decision and status

Owner authorized a **personal Google Play Console account in his own name**, plus preparation for submission without breaking existing sideloaded installations. No account has been verified by this work, no fee paid, no signing key exported, and no app uploaded or submitted. Do not confuse a prepared artifact with store approval.

Latest distributed APK remains 2.8.2/code34. Candidate 2.8.3/code35 has been built as an AAB and matching APK; verification below is complete locally, not in Play. Source changes correct outdated Settings privacy text and clarify the existing opt-in disclosure; no attendance behavior, database, permissions or installed app is changed by preparing these files.

## Owner: account creation, in order

1. Open https://play.google.com/console/ with the adult owner's Google account; select Personal. Use an account with durable recovery access and two-step verification.
2. Enter real legal identity and payment-profile information. A public developer display name can identify G3, but it does not replace legal identity. Read Google's public-identity preview; do not promise personal details will be hidden.
3. Owner accepts the developer agreement and pays the one-time US$25 registration fee directly to Google. Never put card details or identity documents in this repository/chat.
4. Complete email/phone and identity verification requested by Console. Complete Android-device verification using Google's Play Console app with the same owner account. Follow current Console requirements if labels differ.
5. Create one app record: suggested name **G3 6740 Team Hub**, default language Hebrew, App, Free. Keep `com.g3.scouting`; do not create a second package or change the installed identity.
6. Stop at Play App Signing configuration until the existing signing-key handoff is ready. Do not select an unrelated newly generated app-signing key just to proceed.

## Existing-installation protection — mandatory gate

- Package `com.g3.scouting`; installed code34 -> candidate code35. Preserve native storage names, plugin identity, backend, local preferences and device consent.
- Existing app-signing certificate SHA256: `45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580`.
- Configure Play App Signing with the existing app-signing key through Google's supported encrypted transfer flow. Upload key is a separate concept. Do not export raw keys, put passwords in command history, or commit signing material.
- Verify the **Play app-signing certificate**, not only upload certificate, matches the installed APK. Register the relevant certificate with providers if needed.
- Before inviting the full team, update one real installed 2.8.2 phone from the Play test track. Check retained login, preferences, drafts, push registration and automatic-checkout consent. No uninstall/clear-storage workaround. If signature compatibility fails, stop rollout.
- Local AAB signature is not proof of the eventual Play-generated APK signature. Device upgrade remains pending until Console enrollment and distribution.

## Store listing copy (prepared; owner support details pending)

**Title (both languages):** G3 6740 Team Hub

**Hebrew short description:** כל הכלים של קבוצת G3 6740: נוכחות, משימות, למידה ובניית רובוט.

**Hebrew full description:**

מרחב העבודה של קבוצת הרובוטיקה G3 6740 מרכז את העבודה המשותפת של תלמידים, ראשי צוותים ומנטורים.

- נוכחות בסדנה, מפגשים ובקשות היעדרות.
- משימות, עדכונים, פרויקטים ולמידה.
- תכנון בניית הרובוט, חלקים ועבודות ייצור.
- כלים הנדסיים וסקאוטינג לתחרויות.

נדרש חשבון קבוצה מורשה. היכולות המוצגות תלויות בתפקיד ובהרשאות. רוב הפעולות דורשות חיבור לאינטרנט.

דיווח נוכחות משתמש במיקום לבדיקת הקרבה לסדנה. אפשר להפעיל צ׳ק־אאוט אוטומטי ב־Android בהסכמה: במהלך נוכחות שהופעלה לכך, המיקום משמש גם ברקע לזיהוי יציאה. ניתן לכבות את האפשרות באפליקציה. זיהוי אוטומטי תלוי בהרשאות, בחיבור ובפעולת המכשיר ואינו מבטיח זיהוי בכל מצב.

**English short description:** Attendance, tasks, learning and robot building for the G3 6740 robotics team.

**English full description:**

G3 6740 Team Hub brings students, team leaders and mentors together in one robotics-team workspace.

- Workshop attendance, meetings and absence requests.
- Tasks, updates, projects and learning.
- Robot-build planning, parts and manufacturing work.
- Engineering tools and competition scouting.

An authorized team account is required. Features depend on your role and permissions. Most actions require an internet connection.

Attendance uses location to check proximity to the workshop. Optional automatic checkout on Android uses background location during an enrolled attendance to detect departure, with your consent. You can turn it off in the app. Detection depends on permissions, connectivity and device operation and is not guaranteed in every situation.

## Listing assets

- Existing icon: `apps/dashboard_web/android/app/src/main/ic_launcher-playstore.png`; validate 512x512 and format before upload.
- Prepared and visually inspected `releases/play-store/feature-1024x500.png` in team colors, plus `releases/play-store/icon-512.png` copied from the existing store icon. These are local handoff artifacts, not yet uploaded.
- Capture at least two real app screenshots using synthetic users/data: Home/Work, Attendance, Robot Build or Scouting. Do not use production student names, attendance, finances, private CAD or misleading generated UI. No final screenshot set exists yet.
- Support email, public privacy-policy URL and target-age groups await owner confirmation. These are submission blockers, not placeholders to submit.

## Privacy/Data safety preparation — not a completed declaration

Observed code: administrator-created accounts (`manage-member`); Supabase authentication/data; Firebase FCM, native Crashlytics and Performance Monitoring in release; optional Gemini assistance; Onshape/GitHub integrations. No self-signup was found in the inspected member-auth flow. Do not equate deactivation with deletion.

| Data path | Purpose/evidence | Submission work |
|---|---|---|
| Account identity/contact/member role | Sign-in and team permissions | Declare personal info/user IDs as applicable; confirm full member fields |
| Attendance and location | Foreground presence checks; optional signed background departure proofs | Declare precise location transmission even if raw GPS is processed transiently; assess ephemeral-processing answer separately |
| Attendance audit | Arrival/departure, distance/accuracy and correction evidence | Disclose persisted evidence; no fabricated retention period |
| Device registrations/diagnostics | FCM tokens, Crashlytics, Performance | Map device identifiers, crash logs and performance data using actual SDK guidance |
| Tasks, messages, uploads, learning, absence explanations | Team operations | Review files/photos, user content and potentially sensitive free text; don't claim health/finance data absent without checking |
| Finance/reimbursements | Authorized finance features | Review user financial information category and permissions |
| AI/CAD/code requests | User-invoked assistance and engineering integrations | Verify exact third-party transfers and provider settings; service-provider exemptions require evidence |

Needed before publication: confirmed data controller/contact, public policy accessible without login, concrete retention/deletion handling, truthful collection/sharing and security answers, target audience/content rating, and any applicable UGC moderation declarations. Do not assert no data collected, no sharing, automatic deletion, or absolute privacy. Privacy text draft is in `PLAY_STORE_PRIVACY_DRAFT_20261115.md`; not approved or published.

## Background-location and foreground-service declaration

Feature: **Automatic workshop checkout**. With explicit opt-in, a successful inside-workshop check-in enrolls a bounded attendance. Android detects departure while the app is not visible; the service obtains a second proof before closing attendance. Manual checkout remains restricted to inside the workshop. Tracking is not a general route-history feature and is not used for advertising.

Prominent disclosure must identify G3, background use even when closed/not in use, purpose and user choice before requesting permission. Candidate35 now explicitly names G3 6740 Team Hub and explains use even when closed/not in use, the bounded attendance scope and disable option in Hebrew/English before the unchecked opt-in control. Settings' contradictory no-background claim is also corrected. Existing consent/enrollment logic is unchanged. Final permission-flow/device-video and policy review remain necessary.

Prepare an actual-device video showing: app identity -> disclosure -> consent -> Android permissions -> inside check-in/active status -> app backgrounded -> departure verification -> final attendance. Also demonstrate disable and permission-denied behavior. Do not fake a successful physical test. Complete relevant foreground-service/location declaration as prompted in Console. Google approval is not guaranteed; rejection requires a genuine compliant remedy, not hiding a permission from reviewers.

## Reviewer access

Use a dedicated synthetic-data review account/environment with a stable login and clear entry instructions. Never supply a real student/admin account or real private CAD/finance/absence information. Explain why physical workshop verification cannot be completed remotely; provide genuine demonstration evidence and a safe review path. No production radius bypass or admin grant is authorized by this checklist. Reviewer account/fixtures remain to prepare after deciding the safe environment.

## Student testing

Students may be testers through an eligible Google/Google Workspace account signed into Play. No developer account, fee or Console role is needed. School-managed/parent-supervised account restrictions must be honored, not bypassed. Recruit 15–20 willing Android users so one withdrawal does not drop below 12.

1. Add tester emails privately in Console Closed testing (not this repository). Publish the eligible closed-test release and share its opt-in URL.
2. Students open the link with the same Google account used in Play, join, and install/update **from Play**. Existing sideloaded APK usage alone is not joining the closed test.
3. Keep at least 12 opted in continuously for 14 days immediately before the production application. Internal testing does not substitute for this requirement.
4. Test actual student flows and collect feedback: install/update, Hebrew/RTL, login, notifications, tasks, scouting, workshop check-in and optional auto checkout. Record device/build and issue, avoid collecting passwords or private location histories.
5. Apply for production access with honest testing/feedback evidence. Approval is not automatic after 14 days. Then submit/release to the intended countries and send the permanent store URL.

## Completion ledger

| Item | Status |
|---|---|
| Personal-account decision | Confirmed by owner |
| Account verification/payment | Owner action pending |
| Listing text | Prepared above |
| Privacy/support/age/controller inputs | Asked; pending |
| Settings background-location wording | Corrected in local candidate |
| Candidate bundle/APK verification | Built, signed, bundle validated; detailed local evidence below |
| Existing signing key | Preserve; no export performed |
| Play-generated update on existing phone | Pending account/track and device |
| Physical auto-checkout test/video | Pending workshop/phone |
| Privacy publication, Data safety, review fixture, screenshots | Not complete; must not submit as complete |
| Closed test / production review | Not started |

Sources checked 15 November 2026: [registration](https://support.google.com/googleplay/android-developer/answer/6112435), [personal testing](https://support.google.com/googleplay/android-developer/answer/14151465), [test setup](https://support.google.com/googleplay/android-developer/answer/9845334), [device verification](https://support.google.com/googleplay/android-developer/answer/14316361), [signing](https://support.google.com/googleplay/android-developer/answer/9842756), [background location](https://support.google.com/googleplay/android-developer/answer/9799150).

## Local candidate evidence

- AAB: `releases/play-store/G3-Team-Hub-2.8.3.aab`, **19,594,912 bytes**, SHA256 `cbff3a703a52336ae6cdfbf8ca8d78ceeeaad0100ff6e12be730b3a9e39cfa4a`.
- Matching APK: `releases/G3-Team-Hub-2.8.3.apk`, **18,526,042 bytes**, SHA256 `455d7129e82f6e309aa7008d50873055acfc393ce77012d7674d260ee7692e69`. This is a local candidate, not a request for students to reinstall now.
- Both signed with the existing certificate above. APK signature verified; AAB JAR signature verified (standard self-signed/no-timestamp warnings plus Gradle ZIP/JarInputStream ordering warning; no assertion of store acceptance). Google's cached bundletool1.18.1 `validate` passed with exit0.
- Package `com.g3.scouting`, version35/2.8.3, minSDK24, targetSDK36 verified from APK. Release mapping copied beside AAB.
- All **115** web assets match final Android dist by SHA256 in both AAB/APK. Final asset copy includes both disclosure corrections; optional model exclusions passed.
- APK `zipalign -c -P 16 4` passed. All four bundled native `libdatastore_shared_counter.so` ABIs have 16KB PT_LOAD alignment. This is structural compatibility evidence, not a physical 16KB-device result.
- TypeScript/Android build and remembered-consent focused tests passed. Native bundle/assemble passed; release lint **0 errors,32 warnings** (unchanged native source); final text repack passed lintVital. No unrelated regression suites or paid AI tests run.
- No physical device acceptance was performed. Local ADB could not start within restricted execution; no phone state was changed. Play upload, Play-generated update, reviewer access, physical departure/video, privacy approval and 14-day closed test remain open.
- Local listing graphics were viewed and dimension-checked:512x512 icon and1024x500 feature graphic. They do not replace required real app screenshots.

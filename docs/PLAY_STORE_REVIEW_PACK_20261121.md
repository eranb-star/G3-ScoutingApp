> Update 21 November: retention/manual-email policy approved. Public pages implemented locally with login/Settings links; publication pending. Network-isolated demo covers attendance UI, Projects/tasks and mechanical calculations only. Full Google review coverage is still incomplete; native permission/departure testing is not simulated proof. See PRIVACY_OPERATIONS_20261121.md and current checkpoint. Earlier pending-approval statements below are superseded.

# Play submission pack and remaining gates — 21 November 2026

This record supplements [the candidate/runbook](PLAY_STORE_SUBMISSION_20261115.md). It is **preparation**, not proof of Google acceptance. Account screenshots supplied by the owner show identity review pending, contact-phone verification dependent on identity approval, and Create app disabled. No additional ID submission is required unless Google requests it.

## Inventory

| Item | Prepared artifact / status |
|---|---|
| Binary | Existing verified 2.8.3/code35 AAB/APK; no rebuild needed for these documentation changes |
| Listing copy | Hebrew/English copy in submission runbook; extracted text files under `releases/play-store/listing` |
| Store graphics | Existing 512px icon and 1024x500 feature graphic under `releases/play-store` |
| Screenshots | Two **preview** captures of real Work/Mechanical components with synthetic data,540x960; not final Android screenshots. Full app shell/native rendering must be captured on a phone before upload. See screenshot manifest below. |
| Privacy policy | Expanded Hebrew proposal in `PLAY_STORE_PRIVACY_HE_20261121.md`; retention and email request workflow awaiting owner approval; not public |
| Data-request instructions | Proposed in policy below; no account/data deletion occurs through this preparation |
| Data safety | Field-by-field working matrix below; final form answers depend on provider settings and actual data handling |
| Reviewer access | Required isolated-data design specified below; **not implemented**. Existing QA impersonation is inappropriate for external reviewers. |
| Permission video | Exact recording script below; real workshop/phone recording pending |
| Student test | Test checklist and evidence template below; opt-in clock not started |

## Data safety working matrix

Do not upload this table as an automatic declaration. The official form separates data type, collection, sharing, purpose, optionality, and ephemeral processing. Service providers may qualify for Google's sharing exceptions, but their configuration/contract must be checked; do not blanket-answer “not shared.” Location sent off-device is assessed even when not stored as raw coordinates.

| Google category to evaluate | Observed use | Candidate purpose/requiredness | Evidence / unresolved decision |
|---|---|---|---|
| Name, email, user IDs | Team membership and authentication | Account management/functionality; required for team access | `src/lib/memberAuth.tsx`, `supabase/functions/manage-member/index.ts` |
| Precise location | Inside check-in and signed outside departure proofs | Functionality; attendance feature, background portion optional | `supabase/functions/attendance-auto/index.ts`, attendance SQL; raw coordinate retention in all manual/provider logs still needs full confirmation |
| App interactions/user-generated content | Tasks, project activity, scouting, messages, learning/evidence | Functionality; depends on feature | Map field content, not just table names; optional uploads remain user-selected |
| Photos/videos/files/documents | Media, evidence, receipts, engineering uploads | Functionality; optional/role-limited | User submissions can include personal info; app-wide disclosures include role-limited features |
| Other financial information/purchase history | Purchases, expenses/reimbursements | Functionality; authorized finance users | No payment-card collection should be asserted without verified source; receipts/claims still require assessment |
| Health info / other sensitive free text | Absence explanations or attachments may contain health facts | Review intended fields and actual prompts | Do not mark absent just because there is no medical table; limit unnecessary detail in future UX |
| Crash logs, diagnostics, other performance data | Native Firebase Crashlytics and Performance | Analytics/diagnostics; release collection enabled | `docs/FIREBASE_SPARK.md`; reconcile SDK data disclosure; not user-toggleable at runtime currently |
| Device or other IDs | FCM registration, Firebase installation/diagnostic identifiers, device public key | Messaging, diagnostics, fraud prevention/security | Distinguish each purpose; no advertising SDK established by inspected configuration |

Encryption in transit is configured in the app (HTTPS and cleartext disabled); verify every integration before answering globally. Do not claim independent security review or certification. Accounts are admin-provisioned in inspected code, with no public signup. Account creation is nevertheless available to administrators within the app; **do not assume deletion-policy exemption**. A discoverable in-app request entry and external public request page should be implemented before submission.

Supabase handles account/database/storage requests; Vercel hosts the web app/assets; Firebase handles push/native diagnostics; user-invoked Gemini assistance processes selected inputs; authorized Onshape/GitHub connections supply engineering data. Provider regions, retention and AI data-use settings were **not** independently established in this pass. No claim of “not used for training,” “EU only,” or a provider retention period is approved.

## Public privacy/request pages — publication contract

Proposed canonical URLs: `https://g3-6740.com/privacy` and `https://g3-6740.com/data-requests`. These are **not verified live URLs** and must not be entered in Console yet.

After owner approves retention and request handling:

1. Implement public, unauthenticated, mobile/RTL-readable pages, naming G3 6740 Team Hub and Eran Bongart and the approved email. Include a visible update date and English version for reviewers.
2. Add links at login and Settings so students and reviewers can reach them before/after sign-in. A doc in Git is not an in-app policy.
3. Request page explains access, correction, account deletion and selected-data deletion separately; email action pre-fills only a subject, never password/ID or sensitive automatic payload.
4. Explain identity verification, exceptions, manual handling and outcome notification. Do not promise immediate automated deletion. Define handling time before publishing a time commitment.
5. Implement/verify the admin deletion/anonymization process against dependencies, attachments and audit records before stating it exists. `active=false` alone is not deletion. Never delete actual records during verification.
6. Deploy once, verify anonymous URLs, email link, Hebrew/English and login/Settings entry points. Rebuild the store candidate only when these actual app links/behavior are ready, with a new versionCode if code35 is already uploaded.

## Reviewer access — blocker identified in this pass

Google requires access instructions for login **and location-restricted** functionality; a video alone must not be assumed sufficient. A normal production student account could expose real group data. Existing `qaTestSession` is an admin QA impersonation path, not a safe reviewer sandbox.

Recommended implementation: a clearly labelled review workspace in the same app with synthetic fixtures and server-enforced isolation. Credentials entered only in Console's App access fields. It must expose the relevant real flows without writing to production students/meetings, sending team notifications, accessing private CAD or spending on private AI requests. Any simulated location behavior must be visibly labelled simulation and explained to Google; keep actual attendance enforcement and real departure video unchanged. Do not add a hidden master password, global geofence exception, developer backdoor or client-only RLS bypass. Server isolation tests and a complete inventory of accessible feature areas are prerequisites. If a dedicated existing isolated environment can be reused, inspect it first; **no new paid project is authorized**.

This workspace has not been built. It is not blocked by identity verification, but is a real engineering prerequisite, not merely a Console checkbox. Decide its concrete isolation approach before treating the app as review-ready.

## Permission declaration draft — English text

**Feature name:** Automatic workshop checkout.

**Purpose:** G3 6740 Team Hub records attendance for an authorized robotics team. After a user explicitly enables automatic checkout and successfully checks in inside the workshop, Android detects departure while the app is not in use. The app obtains a second outside-location proof before the attendance service confirms checkout, helping avoid missed checkouts and accidental closure from a single location reading. Users can disable this optional feature. Manual attendance rules remain unchanged.

**Why background access:** Departure can happen after the user puts the phone away, locks the screen or leaves the app. Foreground-only checks would require reopening the app at departure and would not provide the opt-in automatic departure feature. Monitoring is limited to an enrolled attendance and ends when stopped/closed/expired; it is not a general route-history service.

**Foreground service:** The manifest declares a location foreground service used for bounded exit confirmation, with user-visible notification. Confirm actual device notification and start/stop behavior in the submitted recording. Do not declare an unrelated foreground-service type to avoid review.

**Video URL:** pending real recording. **App access:** pending safe reviewer workspace. **Approval:** Google's decision; optionality alone does not guarantee background-location acceptance.

## Actual-device video script

Use a synthetic account and meeting with no real student records; obtain approval for any test-account access. Record a supported Android phone, not a browser fixture.

1. Show installed app name/version and open Check in / out.
2. Show the full prominent background-location explanation before enabling. Show the unchecked choice and explicit user action.
3. Show precise location and background permission flow. Record a denied-permission attempt showing attendance still works without claiming automatic checkout active.
4. In the workshop, check in and show the active-enrollment indicator.
5. Put the app in the background/lock the phone, leave the workshop, allow the confirmation interval, then show actual checkout and recorded time. Explain any edited waiting interval in the video; never fabricate evidence.
6. Show the service notification and disable action. Show a subsequent check-in uses remembered consent and that revoked consent does not reactivate.
7. Demonstrate manual checkout outside is rejected, using only a controlled test record.
8. Avoid exposing other pupils, emails, maps of private routes, passwords or OTPs. Provide Google a reachable video URL only after owner approval of the recording/access.

## Student closed-test script and record

Recruit 15–20 eligible Android users. Add the exact Google accounts used in Play privately. Students accept the closed-test invitation and update through Play. Keep at least12 opted in continuously for14 days; internal-track participation is not a substitute. No false age entry or parental/school-account restriction bypass.

Test rows: existing APK -> Play update without uninstall; retained login/preferences; Hebrew layout; notifications in foreground/background; task open/status; scouting save; check-in allowed inside and blocked outside; opt-in/deny/disable auto-checkout; real background departure; permission revocation; app restart/update during an attendance. Record failures honestly; do not claim all Android models passed after one phone.

Evidence fields: anonymous tester code, device model, Android version, app version, test name, date, expected result, actual result, issue ID, resolved/retested date. Store tester email list separately from public docs. For production-access application report actual usage, feedback and fixes, not merely invitation count.

## Screenshot manifest

`apps/dashboard_web/scripts/preview-play-materials.mjs` renders existing Work, Mechanical Tools and Login components with synthetic data and CSP `connect-src 'none'`. It has no production credentials and rejects writes. Local test server only, not shipped in app. Browser previews at540x960 were inspected and saved:

- `releases/play-store/screenshots/work-he-preview.png`
- `releases/play-store/screenshots/mechanical-he-preview.png`

These are screen-composition previews, **not final store-ready captures**: fixture does not include the complete app shell/native wrapper. Capture the same screens in the real Android review workspace before uploading; do not misrepresent mock account/permission behavior as production or use real student data. Full Android screenshots and permissions video remain pending, even though source components rendered.

## No-repeat work

Do not rebuild the unchanged 2.8.3 candidate, rerun broad suites, or trigger deployments for this document pack. Source change this pass is only a non-shipped screenshot fixture. Existing installations, backend, signatures and attendance records remain untouched.

## Sources checked 21 November 2026

- [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Reviewer login/location access](https://support.google.com/googleplay/android-developer/answer/15748846)
- [Prepare for review](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Firebase data disclosure](https://firebase.google.com/docs/android/play-data-disclosure)

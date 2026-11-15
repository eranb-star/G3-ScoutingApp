# Android automatic checkout — approved design and delivery record

Status (13 November 2026): backend migration and attendance-auto Edge Function deployed; live policy verified as observe, zero pilots/grants. User approved disabling legacy JWT verification for this new function only; function-level JWT enrollment and device signatures remain required. Signed APK 2.7.0/code31 built and verified locally. Release CI400 and source CI401 passed. Website production 0adbbf8 is Ready on g3-6740.com: deployment gDw56s7sU58rpkFcGPG6cjY8ciep, 13 November 2026 19:38:57 Israel time. User completed Vercel identity verification. Hebrew consent/enable/observation/admin UI and English pending state checked in the actual React component with synthetic data, including 390px phone layout. Physical workshop acceptance remains a release gate for automatic enforcement.

## Contract
- Manual checkout retains its existing location/Wi-Fi verification. Never add an automatic flag to that endpoint.
- Explicit user opt-in, precise/background location, one device per attendance. Native RSA key in Android Keystore; enrollment requires authenticated active member and fresh inside-location evidence. No user JWT retained for background requests.
- Separate signed server endpoint, expiring attendance-specific grant. Native location is not tamper-proof; signatures establish device possession, not physical truth. Play Integrity is not assumed for sideloaded APKs.
- Exit radius = configured workshop radius plus a safety margin. Two fresh accurate outside readings, minimum five minutes apart, online begin and short-lived server challenge. Location uncertainty must lie outside the exit boundary. Entry cancels the candidate. No closing based on a timer alone.
- No offline backdated automatic closing. Late/stale/boot-interrupted evidence fails closed. Never interpret app launch outside as an exit. Re-arm after interruption requires inside evidence again.
- Server serializes confirmation with attendance updates. Repeated requests return the original result, cannot close another attendance or overwrite manual/admin/cutoff closures. Server timestamps anchor departure time; no client wall-clock backdating.
- Native worker state survives process recreation, but reboot invalidates monitoring and pending confirmation. User logout/disable stops monitoring and revokes the grant; server grant expiry is the fallback if offline.
- Default rollout is observation, not attendance mutation. Active admins control disabled/observe/enforce; enforcement allowed only for explicitly opted-in pilot members. Workshop calibration and real phones required before wider enforcement.
- UI clearly separates enabled, waiting for verification, observation-only, failed, closed. Success requires server confirmation. No silent auto-enrollment on first install. Manual workflow remains usable without permissions.
- Preserve existing audit/corrections and 23:00 fallback. Automatic location departure must be distinguishable from cutoff closure in reports. No stored raw route/coordinates in audit; retain only distances, accuracy and server times.
- Existing schema allows only one attendance per meeting/member. Do not promise a second check-in for the same meeting; mistaken closure uses existing admin correction workflow. Re-entry support is a separate change.

## Verification plan
Service-only SQL mutation/RLS; ownership/key/session expiry/replay checks; inside/outside uncertainty; grace/deadline; cancellation/rearm; disabled/observation/enforcement; admin/manual/cutoff races; protected HTTP validation; manual attendance regression; Android JVM state checks, lint/build/signature; web type check; real-device physical exit pilot separately.

## Delivery checklist
- [x] Schema/atomic transition and audit
- [x] Signed endpoint and evidence validation
- [x] Native registration, permissions, receiver and workers (physical behavior pending)
- [x] User/admin UI and session cleanup (HE/EN synthetic browser acceptance passed)
- [x] Focused automated tests
- [x] Backend deployment and live schema verification
- [x] Signed APK, signature/checksum/package verification
- [x] Website production promotion (gDw56s7sU58rpkFcGPG6cjY8ciep, g3-6740.com)
- [ ] Real workshop pilot (cannot be replaced by simulator results)

Planning estimate: 8–13 engineering days including pilot; not a token estimate. Initial conservative parameters: 50m boundary margin, maximum 50m reported accuracy, minimum 300s outside verification, 900s completion window, max12h enrollment. Parameters must be confirmed in workshop; default observe prevents attendance changes during calibration.

## Verified delivery evidence — 13 November
- PGlite transition tests passed: ownership, service-only access, inside enrollment, nonce replay, replaced grant, mock/stale/inaccurate evidence, confidence radius, minimum grace, deadline, cancellation, observation, enforcement, frozen observation permission, admin conflict, expired grant, workshop configuration change, kill switch and revocation.
- Real RSA WebCrypto HTTP-handler tests passed: missing/invalid JWT, signature tampering, wrong device/grant and automatic-flag injection denied before mutation.
- Existing manual browser attendance, reporting and historical admin-correction focused tests passed during implementation. The manual attendance Edge source is unchanged.
- TypeScript/Vite Android build and packaged-asset test passed. Capacitor copy followed by Gradle assembleRelease/lintRelease passed. No broad unrelated local regression rerun.
- Production schema inspected before migration. Live SQL confirms observe / zero pilots / zero grants / authenticated RPC execution=false / grants RLS=true. Live endpoint returns 400 for unsigned body, 401 for unauthenticated enrollment, 403 for unknown grant.
- APK: releases/G3-Team-Hub-2.7.0.apk, 18,510,274 bytes; SHA256 5339e6308b8cf8fb477526a65a86974fc460ca574d524b747d523d7d70dbb760. Package com.g3.scouting, versionCode31, minAPI24/target36. Signing certificate SHA256 45675cd568ffd23d78afd54eae2e7a71d5988819809e95c650d5c27102eba580 matches 2.6.1. Mapping and checksum kept beside APK.
- ADB device inventory is empty. No installed-phone/background/geofence/battery test is claimed.
- Final source afa6b41 / release 0adbbf8. Preview 9s8VJ3eddpwMWgoo3j2RwquYDzrs was promoted through a production rebuild; production gDw56s7sU58rpkFcGPG6cjY8ciep is Ready and aliased to g3-6740.com. CI400/401 passed. Earlier CI396/397 failed because the festival fixture expected October 29 to remain upcoming; only that test fixture was corrected, retaining the archive-protection assertion. CI398/399 also passed before final consent-copy changes.
- Final APK contains 117 assets verified byte-for-byte against Capacitor output. Consent resets when attendance changes, and a grant for a different attendance/member is stopped. Privacy copy no longer claims location is always button-only.
- Live g3-6740.com/check-in verified after production rebuild: new consent/privacy text, existing check-in controls and historical attendance receipt remain present; admin pilot settings load the real backend policy as Observe — no closing. No attendance or pilot policy was changed during this verification.

## Failure and privacy boundaries
- Server status is checked before each worker requests a fresh location. A remotely closed/corrected session cannot trigger new evidence collection or checkout through that worker. Android's registered geofence can remain until its expiration or next event; instantaneous remote removal is not promised.
- Generation and reboot/elapsed-time expiry checks precede location acquisition; stale workers after logout/disable do not collect location. Logout/account mismatch revokes; network failure cannot grant offline checkout.
- A geofence event is only a trigger. Fresh accurate location and online challenge remain mandatory. If Android delays the callback/job beyond the confirmation window, automatic checkout is not recorded. No exact departure-time promise: stored departure is the server's first accepted outside reading.
- Rooted/modified devices or deliberately fabricated location are not conclusively prevented by GPS/device signatures. No claim of tamper-proof physical attendance. Strong device attestation is outside this sideloaded pilot.
- No re-entry into the same meeting is added. If a student returns after confirmed checkout, use existing admin correction; do not silently reopen.

## Workshop acceptance before enforcement
1. Install over the existing APK; confirm login, manual inside checkout and outside-radius rejection.
2. Opt in from inside on at least two actual Android phone families. Check precise/background permissions and denial/revocation UX.
3. In observe mode: remain inside/near boundary; leave and return within five minutes; then leave for more than five minutes with screen off. Confirm observed result without attendance closure.
4. Test internet loss, battery saver, reboot, app update, logout/account change and admin checkout during a pending exit. Confirm no stale closing, duplicate audit, or overwritten corrections.
5. Compare server-detected time with actual departure and agree the boundary margin. Only then explicitly select pilot students and switch to enforce; re-enroll inside after changing mode.
6. Verify one enforcement exit, report label/time, and admin correction. Rollback is policy mode off; preserve audit/history and manual attendance.

## Live incident investigation — 15 November 2026

Read-only production investigation after two users reported no automatic checkout. Policy remains observe, pilot count0. For one affected attendance there is no device grant or pending enrollment; for the other, enrollment and first outside detection succeeded but no confirmation reached the service within its5–15 minute window. Function logs show two successful HTTP200 background calls at first detection and no subsequent request/error in the inspected hour. Server pending state does not prove that the device worker is still running. Android scheduling/network/permission/restart cause remains unproven without device state; requested displayed auto-checkout status and phone model. No attendance, policy or pilot setting changed.

Code inspection also shows pilot selection currently lists member/team_leader only, excluding admin; administrator participation needs a focused UI correction before an admin pilot can be selected through that screen. Native worker exceptions currently stop monitoring as unavailable without preserving a diagnostic reason. These are identified follow-ups, not fixes delivered by this investigation. Do not switch existing observation grants into enforcement or retroactively close from home; enforcement is frozen at inside enrollment.

# Mobile browser attendance — 15 September 2026

## Scope
Enable authenticated members to open `/check-in` from the website and Home. Web navigation separates check-in/out from attendance history. Browser attendance requests a fresh GPS fix and uses the existing attendance Edge function. Phone detection is not an authorization control; location and membership rules apply to all browsers.

The live workshop configuration was read today: one active location, valid nonzero coordinates, radius **100 metres**. Configuration, SQL and the Edge function were not changed. The existing server separately rejects GPS accuracy worse than 150m. A position estimate is not a guarantee against spoofing or indoor GPS error. The pre-existing native SSID trust weakness remains a separate security backlog item; browser UI never offers or falls back to Wi-Fi.

Installed Android APK/native code remains unchanged. Native GPS and school Wi-Fi paths remain available. No APK rebuild is needed for this web release.

## Verification completed before release
- TypeScript compilation and Vite production build passed (existing bundle-size warnings).
- `scripts/test-browser-attendance.mjs`: isolated behavioral tests for fresh GPS, denied/unavailable/timed-out/stale readings, server errors; unchanged local Edge handler with mocked database for inside/outside 100m, poor accuracy, inactive/unauthenticated members, duplicate check-in, late checkout, native Wi-Fi compatibility. No network or real attendance writes.
- Existing 12 attendance/engineering source regression assertions passed.
- Real CheckInPage rendered in isolated 390px browser fixture: English check-in and Hebrew checkout; no browser Wi-Fi action. These are synthetic UI checks, not physical GPS tests.
- Browser duplicate-click lock and loading guards prevent premature requests. If a saved record cannot reload, actions are disabled with a refresh message rather than inviting another submission.

## Workshop acceptance — still required on actual devices
1. Android Chrome and iPhone Safari: sign in at https://g3-6740.com/check-in, allow precise location, check in inside the workshop. If no session is open, open workshop then check in.
2. Confirm the record in attendance history/admin view; reload or open the same account in the installed app and confirm the same active record.
3. Check out while still at the workshop, confirm one completed record and correct times. Do not leave the 100m radius before checkout.
4. With a designated test account, verify outside-radius rejection and denied-location guidance, with no attendance record created.
5. Existing APK: verify its normal GPS and school-Wi-Fi flow at school. Automated compatibility checks do not replace this device check.

If indoor GPS cannot obtain an acceptable fix, try at the entrance within the radius or use the existing installed app's Wi-Fi option. Do not enlarge the radius for the trial. Browser attendance requires connectivity and foreground permission; no background tracking.

## Release record
Published application commit **b00a306**, Vercel production rebuild **9YWxx9ADuCDGxWdXW2gxB5xxtUac**. Verified https://g3-6740.com/check-in returns HTTP 200 and bundle **index-C4w-CvZj.js** contains browser GPS flow/navigation, no old browser blocker, production Supabase reference and no QA reference. All wider simulator/V5.2 remaining work continues in PAUSE_HANDOVER_20260913.md; this release does not close those phases.

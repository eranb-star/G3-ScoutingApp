# Team CAD access correction — 10 October 2026

Implementation: explicit owner-admin sharing of one Onshape connection to active team leaders. No credential exposure or student/global connection grant. Source/snapshot access is checked against authorized connection; inactive owners revoke shared access. Admin owner retains OAuth connect/disconnect/sharing management. AI retains separate use_g3_assist permission and per-request evidence consent, and saved reviews remain author-filtered.

Robot Build imports require the leader's project management permission and authorized CAD connection. Existing private BOMs remain private until explicitly shared; no automatic import of the entire account into a build. Sharing imports, source freshness and pinned geometry use the same access boundary. Team leader can access team catalogue from home/workshop/phone using G3 login alone; editing in Onshape still needs provider access.

Additive migration cad_team_access_20261010.sql defaults sharing off. Deploy migration, connector, frontend, then explicitly enable the intended team connection. No other private admin connection is selected automatically. Tests: actual handler admin-only management, shared connection resolver, isolated SQL opt-in/revoke/inactive/member denial, scoped BOM import/share/freshness, rerun and credentials isolation; existing CAD security, inspection and build-source tests. TypeScript passed. Production rollback-only migration preflight passed. Production deployment and explicit sharing are completed; see release evidence below.

Rollback: disable team sharing first; revert connector/frontend if needed. Additive column/functions may remain. No existing BOM or review data is deleted. Real leader login/device acceptance must be distinguished from synthetic checks.

## Production release
- Implementation development commit `854f2ae`; release commit `588292d`. Release CI345 passed (3m3s).
- Production migration applied successfully; the bundled `onshape-connector` source was pasted, exact-match verified and deployed. Prior connector source retained in ignored local release artifacts. JWT callback setting unchanged.
- Vercel `CxfJ59PCf6yKc7pHEGUZhicZVR1T`, Ready Production, 10 October 2026 15:50:32 GMT+3, domain `g3-6740.com`.
- Authenticated production CAD page confirms connected Onshape, existing selected designs and the new owner-only Enable team-leader access control. User approved the action-time access grant. Sharing was enabled through the production owner-admin control; the server-confirmed UI now reads "Team connection · available to active team leaders" and offers Disable team-leader access. Screenshot: docs/staging/cad-team-access-enabled-20261010.png.
- Last focused resolver test rerun after final owner-management guard passed. Actual leader-device acceptance remains outstanding.

# Connected knowledge release — deployment in progress

The user authorized the complete connected knowledge release. This extends the production protection release `34d7741`; it is not a second unrelated knowledge application.

## Release content

- One FRC knowledge sidebar entry and connected Search, Robots & mechanisms, Reviewed evidence, Team library, and Documents & updates views. Existing article links through Updates redirect to the library.
- Authenticated PostgreSQL search over versioned source passages, current topic aliases, all indexed seasons, source class and associated teams. Ten results per page, with source diversity; no model call for search.
- Relevant saved team articles and resolved issues use caller RLS. Assistant retrieval uses the same bounded service, replacing recent-record context.
- Up to six selected source passages can be handed to G3 Assist. Selected context is visible/removable; server checks access, active generation and source retirement, and rejects invented citation IDs.
- Existing assistant role, purpose, budget, recovery and cancellation controls remain. Paid execution remains disabled and monthly policy remains $25; no billing activation or paid test is part of this deployment.
- Official source discovery/checking, durable leases/retry/cancellation and topic administration are included. **Check now fingerprints documents; automatic PDF extraction into this corpus is still an outstanding design item.** It must not be advertised as automatic searchable ingestion.

## Corpus

Generation `corpus-535d2f0a0f012cdade6e`, bundle SHA256 `535d2f0a0f012cdade6e7e1bdc78a45fac599ac327794a2eb49387d54266b503`.

Expected: 1,716 source versions, 48,797 distinct passages, 50,157 citation occurrences. Citation mapping SHA256 (ordered `id:source:hash:url`, newline separated): `e087bef647185e0b21b3acbd966771c007b4cba5d0e3417b9f53b5632be312aa`.

Source associations do not establish robot mechanisms. Imported passages remain unreviewed. Only topic seed statements were installed; the starter robot/configuration assertions were not automatically published. Coverage is incomplete, not all top-500 teams or all sources for 2017–2026.

The generation stays `loading` until counts reconcile, then switches atomically. Existing active generations can be retained for rollback. Bulk SQL/CSV transports and downloaded corpus are local ignored artifacts, not browser downloads or repository assets.

## Validation completed before cutover

TypeScript and isolated production build passed. Full local corpus queries returned PID 805, elevator 3,150, turret 1,527, drivetrain 1,624, gripper 390 occurrences. Local timings are not production capacity measurements.

Regression tests passed: corpus authorization/filtering/topic semantics/source diversity/atomic activation; team relevance and caller RLS; robot evidence review/retirement/concurrency; actual assistant-handler authorization; official source discovery/leases/retry/cancellation; article revision protections; spending guards. EN/HE desktop and 390px iframe layout inspected. These are layout checks, not physical-device acceptance.

## Deployment checkpoint

Production and QA received source-check, robot research, corpus and team-search schemas. Both have all 48,797 passages. Citation bulk loads are in progress. Neither corpus is activated yet. Assistant retrieval handler deployed to QA and its persisted editor source matched the bundle exactly after reload. Production assistant and source-check deployments are in progress and require final verification.

Website cutover is pending. Do not call the release complete. Real Mentor/Student sign-in, paid provider quality evaluation, automatic new-document extraction, restore rehearsal and physical-device acceptance remain unverified or incomplete. Earlier user deferral of production account acceptance remains in force; no passwords were reset.

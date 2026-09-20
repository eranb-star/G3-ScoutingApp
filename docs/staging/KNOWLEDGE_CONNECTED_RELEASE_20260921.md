# Connected knowledge release — production cutover verified

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

## Deployment checkpoint — verified 2026-09-21

Production website: commit `fee0895f40145d1d066a5d6ca304085ff904a8a6`, Vercel `CssQY5nCPp7VGc8tT7JZVFEfSkFy`, Ready / Production, assigned to https://g3-6740.com. Built using production environment. Public entry `/assets/index-DuQ2wgsb.js` points to the production Supabase project, not QA, and includes the connected workspace. The deployed assistant chunk retains text-only mode, request recovery and selected-evidence controls; image upload is compiled out.

Both QA and production generations are ACTIVE: 1,716 sources, 48,797 passages, 50,157 citations. Every body SHA256 and the full citation mapping digest passed before activation. CSV transfer altered three QA and seven production passage bodies; exact canonical bodies were restored before the integrity gate passed. Production indexed footprint is 137,609,216 bytes (~131.2 MiB); this is the corpus footprint, not total project usage.

Production and QA authenticated SQL-role acceptance passed for PID retrieval (805 occurrences, 10 per page), topic retrieval, citation resolution, private-table denial and team search. QA also passed inactive-caller denial with all temporary changes rolled back. Production did not modify any member. These checks do not replace real signed-in browser acceptance.

Persisted deployed assistant code matches the release bundle in QA and production. Production knowledge-source-check code also matches its bundle. Unauthenticated Edge requests returned 401. Source-check retains its default gateway JWT verification; authenticated invocation remains unverified.

Final production budget policy: enabled=false, activation_approved=false, monthly_limit_microusd=25000000, provider attempts=0. No paid calls or billing changes occurred.

The connected website/search/data release is deployed. The entire long-term design is NOT complete: automatic new-PDF extraction/indexing remains unimplemented; paid provider quality evaluation and activation remain pending; real Mentor/Student sign-in was deferred by the user; restore rehearsal and physical-device acceptance remain outstanding. No passwords were reset. Historical coverage remains partial. Do not represent imported passages as verified robot facts or claim exhaustive top-500 coverage.

Admin topic exemption: user explicitly requested general questions for Admins. Handler checks database member.role and skips the paid purpose classifier only for active authorized Admins; general-topic answer instruction added. All budget, access and execution controls retained. Latest diagnosed failure was PURPOSE_CHECK_UNAVAILABLE in scope:0, settled cost 814 microusd. Handler regression verifies client role spoofing cannot bypass the gate and Admin still reaches budget enforcement. Production paid activation is enabled at 25 USD/month per user request. Live successful answer remains unverified.

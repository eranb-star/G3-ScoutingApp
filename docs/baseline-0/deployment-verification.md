# Deployment verification — 2026-09-12

Read-only authenticated dashboard observations. No deployments or configuration changes performed.

## Production web

Vercel project: `eranbos-projects/g3-scouting-app-5qpe`.
Deployment: `dpl_CUKpN9E8LnkZFMbUYvLC2QL9dmPR`.
Dashboard: https://vercel.com/eranbos-projects/g3-scouting-app-5qpe/CUKpN9E8LnkZFMbUYvLC2QL9dmPR

Environment Production, status Ready, current domain `g3-6740.com`.
Deployment URL: `g3-scouting-app-5qpe-m9yl5iu23-eranbos-projects.vercel.app`.
Source branch `web-portal-preview`, source SHA `72e849a7534d68c87d03b7f712328c9a99a55f5a` (Add QA-only account switching and fix review status layout).
Dashboard displayed created 10 hours ago; exact creation timestamp not extracted.

Compared with baseline repository SHA `29c1ec84cedf2985b6be3115fe30c069b1d11059`: only PROJECT_HANDOFF.md and Android app/build.gradle differ. Thus the later repository commit does not contain an omitted web source change. Do not confuse the ambient older preview tab with the actual production deployment.

## Edge Functions

Verified 15 deployed names in the Supabase project functions dashboard:

attendance, chief-delphi-feed, frc-assistant, github-repositories, hyper-responder, is_admin, manage-member, qa-test-session, scheduled-operations, send-action-push, send-channel-push, send-purchase-push, send-push, sync_tba_matches, tba_library.

13 have repository source files across the two existing function roots. `hyper-responder` and `is_admin` have no corresponding source in that inventory and were shown updated eight months ago. Their purpose/source requires reconciliation; do not delete or redeploy them speculatively. Name parity does not establish deployed byte/config parity for the other 13 functions. Full deployed version/source comparison remains open.

## Scheduler

Executed only:

```sql
begin transaction read only;
select jobid, jobname, schedule, active, database, username,
       md5(command) as command_hash
from cron.job order by jobid;
commit;
```

One job returned: id 1, `g3-scheduled-operations`, schedule `*/15 * * * *`, active true, database postgres, username postgres, command hash `6e8e1d363bf1f8440ac1841b731c7e10`.
No command body, credentials or application records retrieved. This records configuration, not successful execution or delivery.

## Recovery finding

UPDATE: Owner upgraded to Pro. Authenticated dashboard now confirms organization PRO and lists scheduled backups, latest `2026-09-12 01:15:59 UTC`, with earlier entries through September 5. Backup availability is verified; no restore was performed. The dashboard explicitly states that Storage objects are NOT included (only their database metadata). The earlier Free-plan observation below is historical and superseded for current availability. The backup-approach question is resolved by the owner's Pro upgrade; do not ask it again. Storage-object recovery and an isolated restore rehearsal remain outstanding. Do not infer PITR or 30-day retention from the upgrade.

Project backup dashboard explicitly displays: “Free Plan does not include project backups.” It offers an upgrade for up to seven days of scheduled backups. No upgrade selected. This does not establish whether an independent external backup exists.

The draft 30-day recovery retention objective is not met by evidence presently available. Owner asked to choose preparation of encrypted off-site backups on the current plan or review paid backup options. No paid action is authorized by that question. Storage files, secrets recovery and isolated restore validation must also be covered; database recovery alone is insufficient.

## Next work

1. Resolve backup approach and prepare a concrete recoverable database + Storage procedure.
2. Reconcile deployed Edge sources/config versions, including the two dashboard-only functions.
3. Verify isolated staging and execute a restore rehearsal there, never against production.
4. Finalize engineering policy acceptance and proceed with Release 1 implementation after baseline gates are satisfied.

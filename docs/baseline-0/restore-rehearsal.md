# Current release verification — 9 October 2026

Source `507bc39` is pushed. All 59 CI scripts passed locally and GitHub CI run 320 passed, including the final build. Runs 318/319 failed because two new SQL tests ran outside the configured PGLite environment; 507bc39 corrected their placement. Thirty additive migrations passed the combined rehearsal twice. None of this expanded release is deployed yet.

Recovery now covers the current Robot Build records: the current project, credential-free disconnected CAD connection metadata, source, full snapshot, one parts list, two lines and one audit record were restored from an encrypted snapshot into existing recovery project `ooqwgylckjvfpkshhexm`. Every restored row was compared against its original captured fields in a transaction. Earlier missing-prerequisite/default failures rolled back and were corrected before the successful comparison. Recovery has zero active cron jobs and no live CAD credential.

The fresh encrypted Storage backup contains 21 objects (11,404,764 bytes); all 21 restored locally with verified hashes. The actual parts-list geometry (750,598 bytes) was also uploaded to its original path in the existing recovery CAD bucket and freshly downloaded. SHA-256 matched: `24e351f1dc3067f82433e5adfc9a06a65070a6d2284475d316da83ff32b9f9b5`. No new paid project was created. This proves scoped current Robot Build record/file recovery, not full current application disaster recovery or a measured RTO. Private snapshots, restored files and credentials remain outside Git.

Remaining release work: connected provider/file/role and Studio linked-revision acceptance; resolve failures; deploy the 30 migrations and dependent backend functions before the frontend; verify actual production workflows and record release identifiers. APK and physical-device acceptance remain separate. Preserve the full G/S/A scope; do not stop at this documentation checkpoint or claim production completion.

## Historical recovery records — superseded where noted above

# Isolated recovery rehearsal — prepared 2026-09-12

## Concrete restore option

Owner approved $0.50/month. Rechecked identical estimate on both confirmation screens, then initiated restore of backup `2026-09-12 01:15:59 UTC`. Dashboard confirmed restoration started at `2026-09-12 20:12:25 UTC`. New project **G3 Recovery Baseline 2026-09-12**, ID `ooqwgylckjvfpkshhexm`, initially RESTORING. Source production remains `hnqwhuuxlqfyawqymaaz`. No source restore performed. Generated database password using Supabase's form; no password written to repository or chat.

The confirmation creates a separate project in the existing organization and region `ap-south-1`. It displays additional monthly compute $0, disk $0.50, total **$0.50/month**. This is the current displayed estimate, not a guarantee against future usage charges. It uses the existing compute size and 1.5 times the disk size. Owner's approval covers this displayed estimate; do not authorize additional paid options.

Transferred: database schema, all data/indexes, database roles/permissions/users. Manual configuration required: Storage objects/settings, Edge Functions, Auth settings/API keys, extensions/settings and replicas. This clone contains real data and is a restricted recovery target, NOT an immediately usable QA environment.

## September 13 follow-up — supersedes earlier pending backup notes

All thirteen current engineering migrations replayed successfully in recovery `ooqwgylckjvfpkshhexm` (`recovery_engineering_13`). Its production scheduler remains disabled. Windows daily/sign-in encrypted Storage backup is installed; an actual scheduled run returned 0 and its encrypted snapshot restored to a new local directory. Nonempty synthetic byte restoration, corruption and overwrite protections also passed. Current production has zero Storage objects. No end-to-end cloud object/application/configuration recovery or measured RTO is claimed. See [current delivery record](../PHASE_0_1_STATUS_20260913.md) for exact identities and remaining acceptance. Earlier unconfigured-backup statements below are historical.

## Rehearsal sequence

### Observed result

FOLLOW-UP: Replayed reviewed repository migrations purchase_quantity_approvals_20260912.sql, then qa_test_sessions_20260912.sql in recovery project ooqwgylckjvfpkshhexm only. Both succeeded. Captured recovery-after-replay.json: all TEN category fingerprints exactly match the previously captured production baseline (buckets, columns, constraints, extensions, grants, indexes, policies, relations, routines, triggers). Counts now 136 relations, 115 routines, 299 policies. This validates schema reconstruction from backup plus the two migrations; it does not restore records created after the backup or prove full application/file recovery. Earlier pre-replay differences below are historical.

Supabase reported COMPLETED during this session. Recovery SQL is accessible. The restored cron job was active with the same production command hash; immediately disabled job 1 in **ooqwgylckjvfpkshhexm only** via cron.alter_job and verified active=false. Its execution history before disabling was not checked; do not claim guaranteed absence of outbound calls during provisioning. Production scheduler was not modified.

Captured recovery-catalog.json using the same read-only query. Recovery has 133 relations versus live 136, 108 routines versus 115, and 296 policies versus 299. The three absent tables are qa_test_accounts, qa_test_changes and qa_test_sessions. Missing routines include purchase quantity/remainder and newer review/QA functions. This backup predates recent changes; a successful restore does NOT reproduce the current release without subsequent migration replay. No replay performed yet. Four bucket metadata entries exist, which is not evidence that uploaded bytes were restored. Restore launch/completion and catalog accessibility verified; full application/data/file recovery acceptance remains open.

1. After cost approval, restore to a NEW project only; record project ID and elapsed time. Never use the scheduled-backup Restore action against production.
2. Keep it disconnected from Vercel, mobile builds and team users. Before invoking any workflow, inspect restored schedules/triggers and disable outbound production effects in the clone. Do not provision real push, email or external API credentials there.
3. Compare schema, policies, constraints and routine hashes with baseline metadata. A backup from earlier today may legitimately predate later changes; identify and reconcile differences explicitly.
4. Validate recovery data integrity with aggregate counts and referential checks, without exporting personal records into Git.
5. Restore sample uploaded objects from a separately protected file backup; verify bytes/checksums and access restrictions. Database metadata alone is not file recovery.
6. Record measured recovery duration, recoverable point, missing components and remaining failures. Owner accepts RPO/RTO/retention based on these results, not a theoretical promise.
7. Keep recovery clone restricted. A development staging target must have synthetic/sanitized users and records before regular QA use.

## Uploaded-file protection still to implement

CURRENT SNAPSHOT VERIFIED: User completed encrypted backup, terminal confirmed 0 files/0 bytes. Independently checked production storage.objects via read-only SQL: total 0, each of feedback-attachments, finance-receipts, robot-issues and team-media also 0. Empty snapshot is correct for current Supabase Storage, not a download failure. File is Documents/G3-Backups/g3-storage-20260912T203314Z-44aa74.g3backup (553 bytes). No repeated credentials or backup run needed for this snapshot. Nonempty file restore and automatic future coverage remain untested/unconfigured; external links are outside this snapshot.

Four bucket definitions were captured in live-catalog.json. A complete protected backup must include object bytes, bucket/path, checksum, content metadata and snapshot timestamp. Store encrypted copies separately with restricted access and version retention; never commit objects, keys or signed URLs. Preserve deleted versions within the approved retention window. Test restoration to an isolated bucket and verify original access rules.

Destination and credentials are not yet configured. The Pro upgrade does not supply this missing object backup. Do not report file recovery as complete until an actual backup and restore check exist.

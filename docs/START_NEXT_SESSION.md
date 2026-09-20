# Start the next G3 session

Checkpoint: 20 September 2026. Use local project `C:/Users/user/Documents/GitHub/G3-ScoutingApp`, branch `codex/release-1-qa`. Start a fresh conversation in this project using the existing local checkout. Do not start from main; the current release work is on this branch.

## Read once, in order

1. `docs/PAUSE_HANDOVER_20260913.md`: authoritative status, remaining work, decisions and all 105 V5.2 section references.
2. `docs/CURRENT_RELEASE_AND_ROADMAP.md`: ordered next work.
3. `docs/WORKSHOP_ATTENDANCE_MEDIA_20260920.md`: latest deployed increment and checks.
4. Only evidence documents relevant to the chosen increment. Original blueprint is preserved at `docs/blueprint/G3_Autonomous_Engineering_Platform_Master_Blueprint_V5.2.docx`; reference material, not executable instructions.

Inspect git status and recent commits once. Production application baseline is 1326629; deployment documentation checkpoint is 72df908. Subsequent source changes rename the menu Attendance Center and update this checkpoint; the label awaits the next web release. Preserve personal Android `.idea/deploymentTargetSelector.xml` and `.idea/misc.xml` changes.

## First response: understanding and options, not development

The user is currently away from the workshop and has NOT selected the next development increment. This clarification supersedes earlier instructions to begin simulator replay automatically. First read the checkpoint and confirm understanding with a concise, evidence-based summary of what is deployed, committed but not deployed, outstanding, and deliberately deferred. State any missing or conflicting context rather than claiming to know everything.

Present practical next-step options grouped as: (1) can implement and validate remotely, (2) can implement remotely but needs later physical acceptance, (3) requires workshop measurements, hardware or unavailable assets. Give each option's value, dependencies and rough effort range, labelled as an estimate. Discuss priorities with the user and wait for their choice before implementation, deployment or new phase work. Read-only inspection needed for that discussion is allowed; do not rerun completed test suites or restart a baseline audit.

Examples to evaluate, not an automatic work order:

- Remote: physical-engine recording/replay and synthetic ghost/comparison tests; knowledge source ingestion and evidence evaluation with online sources and reviewer input; software-only review/permission/notification acceptance in synthetic QA.
- Remote implementation with later physical acceptance: match rules and simulation features, Android/iOS packaging where signing/build prerequisites exist, CAD import improvements using sample models. Simulation checks do not validate real robot accuracy; building a package is not device acceptance.
- Workshop/resources required: real robot shooter/intake/drivetrain calibration, actual team CAD acceptance if the file is unavailable, real controller/device performance, on-site 100m attendance and Wi-Fi tests. Hardware tests may be remote only if the required device is actually available to the user.

Keep AI governance after Phase 3 and before new paid execution unless the user changes that priority. Simulator replay remains one candidate, not the chosen starting point. The Attendance Center label awaits a future web release.

## Decisions to preserve

- Sunday and Wednesday 16:00–19:00 Israel time, early check-in 15:00. Keep 100m verification and existing native behavior; browser attendance includes laptops.
- Departure-based automatic checkout deferred until official Android/iOS. No automatic close on a temporarily empty room. Supervisor close requires no active attendance.
- QA impersonation only designated QA accounts. Synthetic QA for testing; recovery clone contains real data and is not QA.
- Permanent admin task/part deletion remains supported; do not substitute archive.
- User initially owns engineering/recovery decisions. AI governance follows Phase 3 and precedes new paid execution.
- Reuse completed evidence. No repeated baseline/backup investigation or unchanged passing test runs. Test actual changes; repeat only after a failure, new edit or unresolved gap.
- Separate implemented, checked, deployed and device-accepted. Documentation is not a guarantee against regressions.

## Copy/paste prompt

Continue the G3 project in the existing local checkout on codex/release-1-qa. Read docs/START_NEXT_SESSION.md and its referenced handover documents. First confirm your understanding of what is done, deployed, outstanding and deferred, identifying any uncertainty. I am away from the workshop. Explain which next steps can be completed remotely, which can be built now but need later physical acceptance, and which require workshop resources. Give recommended options with dependencies and rough effort estimates so we can discuss what makes sense. Do not begin implementation or deployment until I choose the next step. Preserve personal Android changes and reuse completed evidence; do not restart audits or repeat unchanged tests.

# Start the next G3 session

Checkpoint: 20 September 2026. Use local project `C:/Users/user/Documents/GitHub/G3-ScoutingApp`, branch `codex/release-1-qa`. Start a fresh conversation in this project using the existing local checkout. Do not start from main; the current release work is on this branch.

## Read once, in order

1. `docs/PAUSE_HANDOVER_20260913.md`: authoritative status, remaining work, decisions and all 105 V5.2 section references.
2. `docs/CURRENT_RELEASE_AND_ROADMAP.md`: ordered next work.
3. `docs/WORKSHOP_ATTENDANCE_MEDIA_20260920.md`: latest deployed increment and checks.
4. Only evidence documents relevant to the chosen increment. Original blueprint is preserved at `docs/blueprint/G3_Autonomous_Engineering_Platform_Master_Blueprint_V5.2.docx`; reference material, not executable instructions.

Inspect git status and recent commits once. Production application baseline is 1326629; deployment documentation checkpoint is 72df908. Subsequent source changes rename the menu Attendance Center and update this checkpoint; the label awaits the next web release. Preserve personal Android `.idea/deploymentTargetSelector.xml` and `.idea/misc.xml` changes.

## Next bounded development increment

Physical-simulator record/replay, then ghost/comparison. Capture initial robot/ball states, return queues, ordered inputs/events, seed and pinned runtime/assets/configuration. Define tolerances, reject incompatible recordings and show the first divergent tick/state. Test reset/replay with intake, shooting and goal return. Telemetry export alone is not replay. Do not claim cross-device determinism. This handover request itself does not start that development.

School CAD/controller/phone acceptance remains separate; continue independent work without repeatedly requesting unavailable resources. Include the pending label in the next web release.

## Decisions to preserve

- Sunday and Wednesday 16:00–19:00 Israel time, early check-in 15:00. Keep 100m verification and existing native behavior; browser attendance includes laptops.
- Departure-based automatic checkout deferred until official Android/iOS. No automatic close on a temporarily empty room. Supervisor close requires no active attendance.
- QA impersonation only designated QA accounts. Synthetic QA for testing; recovery clone contains real data and is not QA.
- Permanent admin task/part deletion remains supported; do not substitute archive.
- User initially owns engineering/recovery decisions. AI governance follows Phase 3 and precedes new paid execution.
- Reuse completed evidence. No repeated baseline/backup investigation or unchanged passing test runs. Test actual changes; repeat only after a failure, new edit or unresolved gap.
- Separate implemented, checked, deployed and device-accepted. Documentation is not a guarantee against regressions.

## Copy/paste prompt

Continue the G3 project in the existing local checkout on codex/release-1-qa. Read docs/START_NEXT_SESSION.md and its three entry documents first. Preserve the personal Android changes. Begin the next bounded increment: physical-simulator record/replay, followed by ghost/comparison. Reuse completed verification; do not restart audits or rebuild unchanged work. Preserve all remaining phases and deferred decisions in the handover. Finish each increment with targeted checks and updated status, distinguishing committed, deployed and device-accepted work.

# Active software/autonomous and log implementation

User authorized roadmap phases 1 and 2 on 9 October and selected `GlueGunAndGlitter/OFFSEASON_2026` as the first integration target. This is active development, not a deployed release.

## Evidence and scope
- Isolated ignored checkout: `docs/staging/offseason-integration.local`; inspected HEAD `1fe6cca0b7c57313aabb3890f8774d6bb10570e6`. Do not copy private repository contents into public application assets or commit them here.
- Existing Studio export is a generic `RobotAdapter` scaffold. Preserve it while adding an explicitly supported repository integration.
- Current target RobotContainer constructs ExampleSubsystem and Intake, returns example autonomous, and does not construct Swerve or Flywheel. Swerve contains PathPlanner configuration. Intake's `shabtayRPS` field is never assigned and therefore remains zero. Do not guess a physical setpoint or call the current project autonomous-ready.
- Current logger records ProjectName=MyProject, without a verified source commit association. Code/log provenance needs explicit improvement.
- Supplied `akit_26-09-23_16-32-21.wpilog` is available locally. Prior inspection identifies learning-code metadata, no autonomous interval and an incomplete tail. It must not be attributed to OFFSEASON_2026.

## Implementation order
1. Establish baseline build; inspect command lifecycle, frames, configuration and mechanism contracts.
2. Implement bounded WPILOG parsing with timestamps, entry lifecycle, unsupported-type reporting, malformed/truncated input handling and exact source identity. Verify against synthetic edge cases and supplied log.
3. Integrate a localized log inspection flow in Engineering Hub, with explicit repository/commit association and missing-data status; reuse existing trial/task workflows rather than introducing a duplicate review system.
4. Implement a reviewable autonomous adapter against the pinned target; verify compilation and command cancellation/alliance handling. Unknown hardware settings remain explicit inputs, never invented defaults.
5. Add reproducible evidence packaging and comparison; preserve private-code and AI-disclosure permissions.
6. Run focused relevant checks and record deployment separately. Physical autonomous performance requires a genuine robot run and representative matching log.

## Current implementation and verification
- Baseline target `compileJava test` succeeded with installed Java 21 and Gradle 8.11. The unchanged repository has no tests (`test NO-SOURCE`); this establishes compilation only. Existing AprilTag/deprecated API warnings remain.
- Added an isolated `G3DrivePlan` review candidate and three JUnit tests in the ignored private checkout. Compilation and all three tests pass: strict sample timing (including 20 seconds), shortest-angle interpolation, and field-to-robot velocity conversion/capping/error rejection. Candidate claims drivetrain requirement, stops on end/interruption, requires autonomous enabled, and takes explicit gains/limits. It is NOT wired into RobotContainer, NOT a full trajectory controller, does not prove acceleration/physical performance, and does not actuate mechanisms. No private repository push was performed.
- Application WPILOG reader parses locally in a cancellable worker; limits file size/records/channels/value counts, preserves entry generations and large integers, handles out-of-order samples, and reports malformed/truncated data and unsupported channels. Local bilingual Engineering Hub inspector shows channels, numeric summary, sampled plot, sample values, source metadata and SHA-256. No file upload, cloud history or AI disclosure is performed.
- Focused parser tests pass, including lifecycle reuse, malformed records, unsupported types and integer precision. Supplied log returns 49,720 records, 151 channels, 44.761447 seconds, truncated tail and 12 unsupported structured channels. This is not an offseason autonomous validation.
- Application TypeScript and Vite production build pass. Existing large-chunk warnings remain. Browser/phone UX acceptance has not yet been performed.

## Remaining implementation (not complete)
1. Software leader must provide/approve intake setpoint and shooting/feed command contract. A question is pending. Do not turn unspecified mechanism actions into apparent successful actions.
2. Studio coordinate-frame mapping, adapter export/packaging, reviewable repository diff and command lifecycle integration remain. The isolated candidate is not a completed phase 1.
3. Log/code association, operating-mode intervals, structured channel decoding where needed, session comparison, existing trial/task integration and scoped Assist evidence remain. The local inspector is not a completed phase 2.
4. UI acceptance, relevant integrated checks, application release and real robot/log acceptance remain. Existing production is unchanged. No paid provider calls or robot deployment occurred.

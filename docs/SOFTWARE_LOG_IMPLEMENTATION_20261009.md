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

## Initial increment (superseded by continuation below)
- Baseline target `compileJava test` succeeded with installed Java 21 and Gradle 8.11. The unchanged repository has no tests (`test NO-SOURCE`); this establishes compilation only. Existing AprilTag/deprecated API warnings remain.
- Added an isolated `G3DrivePlan` review candidate and three JUnit tests in the ignored private checkout. Compilation and all three tests pass: strict sample timing (including 20 seconds), shortest-angle interpolation, and field-to-robot velocity conversion/capping/error rejection. Candidate claims drivetrain requirement, stops on end/interruption, requires autonomous enabled, and takes explicit gains/limits. It is NOT wired into RobotContainer, NOT a full trajectory controller, does not prove acceleration/physical performance, and does not actuate mechanisms. No private repository push was performed.
- Application WPILOG reader parses locally in a cancellable worker; limits file size/records/channels/value counts, preserves entry generations and large integers, handles out-of-order samples, and reports malformed/truncated data and unsupported channels. Local bilingual Engineering Hub inspector shows channels, numeric summary, sampled plot, sample values, source metadata and SHA-256. No file upload, cloud history or AI disclosure is performed.
- Focused parser tests pass, including lifecycle reuse, malformed records, unsupported types and integer precision. Supplied log returns 49,720 records, 151 channels, 44.761447 seconds, truncated tail and 12 unsupported structured channels. This is not an offseason autonomous validation.
- Application TypeScript and Vite production build pass. Existing large-chunk warnings remain. Browser/phone UX acceptance has not yet been performed.

## Initial remaining work (status updated below)
1. Software leader must provide/approve intake setpoint and shooting/feed command contract. A question is pending. Do not turn unspecified mechanism actions into apparent successful actions.
2. Studio coordinate-frame mapping, adapter export/packaging, reviewable repository diff and command lifecycle integration remain. The isolated candidate is not a completed phase 1.
3. Log/code association, operating-mode intervals, structured channel decoding where needed, session comparison, existing trial/task integration and scoped Assist evidence remain. The local inspector is not a completed phase 2.
4. UI acceptance, relevant integrated checks, application release and real robot/log acceptance remain. Existing production is unchanged. No paid provider calls or robot deployment occurred.

## Continuation increment — 9 October
User confirmed retaining OFFSEASON_2026 and authorized continuing while inspecting season code for reusable patterns.

- Season reference read at `419a7aa105e9635d7b512dea4cd4334c1fd13488`, isolated in ignored `docs/staging/season-reference.local`. Its autonomous shooting command uses flywheel readiness, hood, kicker, conveyor, intake, extension and aiming/interpolation. Those dependencies are not present as an equivalent offseason implementation. Do not transplant its motor configuration/setpoints or call it a drop-in adapter.
- Studio now includes a repository-specific drive/wait export. It requires a full accessible target commit and user-reviewed rigid coordinate transform, preserves already-selected alliance coordinates and blocks routes with intake/shooting. Existing generic scaffold export remains available. The produced `G3GeneratedPlan.java` contains the command and sampled poses; the user supplies controller limits in robot code. App verification checks commit access, NOT source API compatibility or compilation of every subsequent export.
- A generated fixture compiled against the actual pinned offseason repository. Four focused JUnit tests pass: timing, heading interpolation, velocity transform/limits, and cancellation/disabled stopping plus subsystem requirement. Controller template is newly authored application code; private repository source is not bundled in the frontend. The adapter remains a bounded proportional-feedback candidate, not a calibrated/acceleration-limited trajectory controller. RobotContainer is unchanged; no robot deployment or private push.
- Log analysis adds unique standard DriverStation channel mapping, mode intervals, source metadata (including nonstandard metadata visibility), explicit repository-commit existence checks, bounded evidence JSON export and local second-log statistics comparison with unit/revision caveats.
- Embedded-schema-validated WPILib Pose2d and SwerveModuleState decoding is implemented, with selectable components. Schemas are verified against WPILib 2026.2.2 serialization definitions; unknown/conflicting schemas remain unsupported. Supplied file now has three unsupported raw channels, not the initial twelve unsupported channels. It remains partial and has no autonomous interval.
- Added explicit physical/simulated local evidence handoff into existing Robot Test Records. Only source hash/window and user code association are carried; setup and actual outcome remain required. Existing immutable record storage/task linking is reused. Retests discard old log evidence; corrections preserve the original association. No production result was fabricated or saved.
- Local browser verified actual file selection/worker parsing, partial warning, voltage inspection, real DriverStation intervals (disabled 3.990–31.037, teleop 31.037–42.491, disabled 42.491–48.751) and draft transfer with blank conditions/results. First Hebrew inspection led to dedicated export-panel styling. Synthetic preview backend never contacts production.
- Focused parser/integration checks, TypeScript and application build passed during this increment; final checks after subsequent edits must be recorded before release. New focused scripts are registered in CI without weakening existing gates.

### Still open after this increment
- Mechanism contracts/calibration, reviewed real frame/controller settings, runtime installation and real robot acceptance remain unavailable.
- Automatic build execution/review status inside the app, genuine log-to-deployed-build verification, and G3 Assist structured log context are not implemented. JSON evidence export is not equivalent to integrated AI log diagnosis.
- Final TypeScript, Vite production build and focused parser/integration scripts passed after the handoff correction. Existing large bundle warnings remain. Hebrew desktop panel styling was visually checked; a 390px viewport check measured 375px client/scroll width (no horizontal page overflow). Full loaded-log mobile interaction and physical-device acceptance remain open. The test form now displays linked evidence before saving and tolerates browser-storage cleanup failure after a successful server save.
- Application deployment remains outstanding. No new application production release or APK is claimed.

### Reproduce the repository build check
The newly authored JUnit fixture is retained at `apps/dashboard_web/scripts/fixtures/robot-integration/G3DrivePlanTest.java`; it contains no downloaded private implementation. In a separate checkout of the pinned offseason commit, copy the application template `src/lib/templates/G3DrivePlan.java` to `src/main/java/frc/robot/commands/`, and this fixture to `src/test/java/frc/robot/commands/`. The focused `scripts/test-robot-integration.mjs` accepts an optional output filename for a generated `G3GeneratedPlan.java` fixture. Run `gradlew.bat compileJava test --no-daemon` with a supported installed JDK (Java 21 used here). This builds and tests only; never replace it with a deploy task. The generated fixture uses synthetic poses and is not a plan approved for driving the physical robot.

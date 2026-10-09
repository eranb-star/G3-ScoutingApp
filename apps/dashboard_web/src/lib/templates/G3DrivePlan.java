package frc.robot.commands;

import edu.wpi.first.math.MathUtil;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.kinematics.ChassisSpeeds;
import edu.wpi.first.wpilibj.Timer;
import edu.wpi.first.wpilibj.DriverStation;
import edu.wpi.first.wpilibj2.command.Command;
import edu.wpi.first.wpilibj2.command.Subsystem;
import frc.robot.subsystems.Swerve;
import java.util.List;

/** Review candidate, not installed in RobotContainer. Drive-only poses must already
 * use the robot's odometry frame and alliance. No hidden mirroring or pose reset.
 * Limits and gains must be supplied by the software lead; no hardware defaults.
 */
public final class G3DrivePlan extends Command {
  public record Point(double seconds, double x, double y, double heading) {}
  public record Limits(double translationGain, double rotationGain, double maxSpeed,
      double maxOmega, double maxPositionError) {
    public Limits {
      for (double n : new double[]{translationGain, rotationGain, maxSpeed, maxOmega, maxPositionError})
        if (!Double.isFinite(n) || n <= 0) throw new IllegalArgumentException("Explicit positive limits required");
    }
  }
  public interface DriveIO {
    Pose2d pose();
    void accept(ChassisSpeeds speeds);
    Subsystem requirement();
  }
  private final DriveIO drive;
  private final List<Point> points;
  private final Limits limits;
  private final Timer timer = new Timer();
  private boolean failed;

  public G3DrivePlan(Swerve drive, List<Point> points, Limits limits) {
    this(new DriveIO() {
      public Pose2d pose() { return drive.getPose(); }
      public void accept(ChassisSpeeds speeds) { drive.driveRobotRelative(speeds); }
      public Subsystem requirement() { return drive; }
    }, points, limits);
  }
  public G3DrivePlan(DriveIO drive, List<Point> points, Limits limits) {
    validate(points);
    this.drive = java.util.Objects.requireNonNull(drive);
    this.points = List.copyOf(points);
    this.limits = java.util.Objects.requireNonNull(limits);
    addRequirements(java.util.Objects.requireNonNull(drive.requirement()));
  }

  public static void validate(List<Point> points) {
    if (points == null || points.size() < 2 || points.size() > 2000)
      throw new IllegalArgumentException("Expected 2–2000 samples");
    double previous = -1;
    for (Point p : points) {
      if (p == null || !Double.isFinite(p.seconds()) || !Double.isFinite(p.x())
          || !Double.isFinite(p.y()) || !Double.isFinite(p.heading())
          || p.seconds() <= previous || p.seconds() > 20)
        throw new IllegalArgumentException("Invalid sample or timing");
      previous = p.seconds();
    }
    if (points.get(0).seconds() != 0) throw new IllegalArgumentException("Plan must start at zero");
  }

  public static Point targetAt(List<Point> points, double seconds) {
    if (!Double.isFinite(seconds)) throw new IllegalArgumentException("Invalid clock");
    if (seconds <= 0) return points.get(0);
    for (int i = 1; i < points.size(); i++) {
      Point b = points.get(i), a = points.get(i - 1);
      if (seconds <= b.seconds()) {
        double t = (seconds - a.seconds()) / (b.seconds() - a.seconds());
        return new Point(seconds, a.x() + t * (b.x() - a.x()), a.y() + t * (b.y() - a.y()),
            a.heading() + t * MathUtil.angleModulus(b.heading() - a.heading()));
      }
    }
    return points.get(points.size() - 1);
  }

  public static ChassisSpeeds correction(Pose2d pose, Point target, Limits limits) {
    double dx = target.x() - pose.getX(), dy = target.y() - pose.getY();
    double angle = pose.getRotation().getRadians();
    if (!Double.isFinite(dx) || !Double.isFinite(dy) || !Double.isFinite(angle)
        || Math.hypot(dx, dy) > limits.maxPositionError())
      throw new IllegalArgumentException("Pose invalid or outside approved error limit");
    double vx = dx * limits.translationGain(), vy = dy * limits.translationGain();
    if (!Double.isFinite(vx) || !Double.isFinite(vy))
      throw new IllegalArgumentException("Controller output overflow");
    double scale = Math.max(1, Math.hypot(vx, vy) / limits.maxSpeed());
    double omega = MathUtil.clamp(MathUtil.angleModulus(target.heading() - angle) * limits.rotationGain(),
        -limits.maxOmega(), limits.maxOmega());
    return ChassisSpeeds.fromFieldRelativeSpeeds(vx / scale, vy / scale, omega, pose.getRotation());
  }

  @Override public void initialize() { failed = false; timer.restart(); }
  @Override public void execute() {
    if (!DriverStation.isAutonomousEnabled()) { failed = true; stop(); return; }
    try { drive.accept(correction(drive.pose(), targetAt(points, timer.get()), limits)); }
    catch (IllegalArgumentException e) { failed = true; stop(); DriverStation.reportError("G3 plan stopped: " + e.getMessage(), false); }
  }
  @Override public boolean isFinished() { return failed || timer.hasElapsed(points.get(points.size() - 1).seconds()); }
  @Override public void end(boolean interrupted) { timer.stop(); stop(); }
  private void stop() { drive.accept(new ChassisSpeeds()); }
}

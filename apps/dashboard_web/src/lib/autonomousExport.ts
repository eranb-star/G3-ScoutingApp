import {evaluateRoute,type MotionProfile,type RoutePoint} from './autonomousPlanning';
import {routePoseAt} from './routePlayback';
import type {SeasonPackage} from './seasonPackage';
export type AutoPlan={season:SeasonPackage;robot:MotionProfile;route:RoutePoint[]};
export function autonomousScaffold(plan:AutoPlan){
 const result=evaluateRoute(plan.season,plan.robot,plan.route);if(result.errors.length)throw Error(result.errors.join('; '));if(plan.route.length<2||result.seconds<=0)throw Error('Add a route before exporting');
 const samples=Array.from({length:Math.ceil(result.seconds/.02)+1},(_,i)=>{const time=Math.min(i*.02,result.seconds),p=routePoseAt(plan.season,plan.robot,plan.route,time);return [time,p.x,p.y,p.heading,p.phase==='intake'?1:0,p.phase==='shoot'?1:0].map(n=>Number(n.toFixed(6)));});
 return `/** G3 autonomous integration scaffold. NOT verified against your robot repository.
 * Alliance: ${plan.robot.alliance===1?'BLUE':'RED'}. Coordinates already transformed; do NOT flip them again.
 * Frame: field CENTER origin, +X/+Y as Studio; metres and radians.
 * Adapter MUST transform to your odometry frame, follow poses with feedback,
 * enforce physical speed/acceleration limits, and map intake/shooter commands.
 * Require mentor review, simulation and low-speed hardware validation.
 * Season ${plan.season.season}, estimated duration ${result.seconds.toFixed(3)} seconds.
 * This is an uncalibrated planning trajectory, not a PathPlanner/Choreo file.
 */
public final class G3AutoScaffold {
 public interface RobotAdapter {
  void followPoseMeters(double x, double y, double headingRadians);
  void intake(boolean enabled);
  void shoot(boolean enabled);
  void stop();
 }
 private static final double[][] SAMPLES = {\n${samples.map(s=>'  {'+s.join(',')+'}').join(',\n')}\n };
 private static final double DURATION = ${result.seconds.toFixed(9)};
 /** Call from autonomousPeriodic with seconds since autonomous init. Never reset odometry here. */
 public static void update(double elapsed, boolean autonomousEnabled, RobotAdapter robot) {
  if (!autonomousEnabled || !Double.isFinite(elapsed) || elapsed < 0 || elapsed >= DURATION) {
   robot.intake(false); robot.shoot(false); robot.stop(); return;
  }
  int i = Math.min((int)Math.floor(elapsed / 0.02), SAMPLES.length - 1);
  double[] s = SAMPLES[i];
  robot.followPoseMeters(s[1], s[2], s[3]); robot.intake(s[4] == 1); robot.shoot(s[5] == 1);
 }
 private G3AutoScaffold() {}
}
`;
}

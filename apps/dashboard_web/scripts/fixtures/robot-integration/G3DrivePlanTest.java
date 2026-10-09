package frc.robot.commands;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import edu.wpi.first.math.geometry.Pose2d;
import edu.wpi.first.math.geometry.Rotation2d;

class G3DrivePlanTest {
  @Test void cancellationAndDisabledExecutionStopTheDrive() {
    assertTrue(edu.wpi.first.hal.HAL.initialize(500, 0));
    final var output = new edu.wpi.first.math.kinematics.ChassisSpeeds[]{new edu.wpi.first.math.kinematics.ChassisSpeeds(1,2,3)};
    var subsystem = new edu.wpi.first.wpilibj2.command.SubsystemBase() {};
    var io = new G3DrivePlan.DriveIO() {
      public Pose2d pose() { return new Pose2d(); }
      public void accept(edu.wpi.first.math.kinematics.ChassisSpeeds speeds) { output[0] = speeds; }
      public edu.wpi.first.wpilibj2.command.Subsystem requirement() { return subsystem; }
    };
    var command = new G3DrivePlan(io,List.of(new G3DrivePlan.Point(0,0,0,0),new G3DrivePlan.Point(1,1,0,0)),new G3DrivePlan.Limits(1,1,1,1,2));
    assertTrue(command.getRequirements().contains(subsystem));
    command.end(true);
    assertEquals(0,output[0].vxMetersPerSecond);
    assertEquals(0,output[0].vyMetersPerSecond);
    assertEquals(0,output[0].omegaRadiansPerSecond);
    command.execute();
    assertTrue(command.isFinished());
    assertEquals(0,output[0].vxMetersPerSecond);
  }
  @Test void validatesTimesAndCoordinates() {
    assertThrows(IllegalArgumentException.class, () -> G3DrivePlan.validate(List.of(new G3DrivePlan.Point(0,0,0,0))));
    assertThrows(IllegalArgumentException.class, () -> G3DrivePlan.validate(List.of(new G3DrivePlan.Point(0,0,0,0),new G3DrivePlan.Point(21,0,0,0))));
    assertDoesNotThrow(() -> G3DrivePlan.validate(List.of(new G3DrivePlan.Point(0,0,0,0),new G3DrivePlan.Point(20,0,0,0))));
  }
  @Test void shortestRotationAndInterpolation() {
    var p = G3DrivePlan.targetAt(List.of(new G3DrivePlan.Point(0,0,0,Math.toRadians(179)),new G3DrivePlan.Point(2,2,0,Math.toRadians(-179))),1);
    assertEquals(1,p.x(),1e-9);assertEquals(Math.PI,p.heading(),1e-9);
  }
  @Test void transformsAndCapsRobotRelativeVelocity() {
    var limits=new G3DrivePlan.Limits(2,2,1,1,5);
    var speed=G3DrivePlan.correction(new Pose2d(0,0,Rotation2d.fromDegrees(90)),new G3DrivePlan.Point(0,2,0,Math.PI),limits);
    assertEquals(0,speed.vxMetersPerSecond,1e-9);assertEquals(-1,speed.vyMetersPerSecond,1e-9);assertEquals(1,speed.omegaRadiansPerSecond,1e-9);
    assertThrows(IllegalArgumentException.class,()->G3DrivePlan.correction(new Pose2d(),new G3DrivePlan.Point(0,10,0,0),limits));
  }
}

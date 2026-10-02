import {DEFAULT_INTAKE} from './intake';
import {DEFAULT_SHOOTER} from './shooter';

// User-selected practice defaults, not measured capacity or calibrated CAD behavior.
export const intakeForRobot=(robot:string)=>({...DEFAULT_INTAKE,capacity:robot==='darwin'||robot==='limestone'?60:40,reach:robot==='darwin'?.24:robot==='limestone'?.22:.3,width:robot==='darwin'?.7:robot==='limestone'?.72:.65});
export const shooterForRobot=(robot:string)=>({...DEFAULT_SHOOTER,lanes:robot==='darwin'||robot==='limestone'?3:1,yaw:robot==='darwin'||robot==='limestone'?180:0});

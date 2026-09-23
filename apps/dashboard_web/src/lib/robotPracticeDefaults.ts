import {DEFAULT_INTAKE} from './intake';
import {DEFAULT_SHOOTER} from './shooter';

// User-selected practice defaults, not measured capacity or calibrated CAD behavior.
export const intakeForRobot=(robot:string)=>({...DEFAULT_INTAKE,capacity:robot==='darwin'?60:40,reach:robot==='darwin'?.24:.3,width:robot==='darwin'?.7:.65});
export const shooterForRobot=(robot:string)=>({...DEFAULT_SHOOTER,lanes:robot==='darwin'?3:1,yaw:robot==='darwin'?180:0});

export const FUEL_RADIUS = 0.075;
export const FUEL_COUNT = 64;
export type BallPose = {id:number;x:number;y:number;z:number};
export type IntakeConfig = {on:boolean;capacity:number;rate:number;width:number;reach:number};
export const DEFAULT_INTAKE:IntakeConfig = {on:false,capacity:20,rate:4,width:0.65,reach:0.3};

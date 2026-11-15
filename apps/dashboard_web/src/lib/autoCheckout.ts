import {Capacitor,registerPlugin} from '@capacitor/core';
export type AutoState={state:string;mode:string;permission:boolean;attendanceId:string;memberId:string;result:string;failureReason?:string;failureAt?:number};
export const AutoCheckout=registerPlugin<{
 preference(args:{memberId:string}):Promise<{enabled:boolean}>;setPreference(args:{memberId:string;enabled:boolean}):Promise<void>;
 status():Promise<AutoState>;locationPermission():Promise<AutoState>;settings():Promise<void>;
 arm(args:{token:string;memberId:string;attendanceId:string}):Promise<AutoState>;stop():Promise<void>;
}>('AutoCheckout');
export const supportsAutoCheckout=()=>Capacitor.getPlatform()==='android'&&Capacitor.isPluginAvailable('AutoCheckout');
let generation=0;
export const autoCheckoutGeneration=()=>generation;
export async function stopAutoCheckout(){generation++;if(supportsAutoCheckout())await AutoCheckout.stop();}
export async function reconcileAutoCheckout(memberId:string|null){if(!supportsAutoCheckout())return;const state=await AutoCheckout.status();if(state.memberId&&state.memberId!==memberId)await stopAutoCheckout();}

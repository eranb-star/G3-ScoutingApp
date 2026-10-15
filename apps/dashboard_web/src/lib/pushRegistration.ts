import {Capacitor,registerPlugin} from '@capacitor/core';
import {supabase} from '../supabase';
const native=registerPlugin<{getToken():Promise<{token:string}>}>('G3Push');
export type PushHealth={state:'unsupported'|'checking'|'registered'|'error';checkedAt?:string;message?:string};
let health:PushHealth={state:Capacitor.getPlatform()==='android'?'checking':'unsupported'};
let currentToken:string|null=null;
let pending:Promise<void>|null=null;
let pendingMember:string|null=null;
export const pushHealth=()=>health;
function publish(value:PushHealth){health=value;window.dispatchEvent(new Event('g3-push-health'));}
export async function registerDevicePush(memberId:string){
 if(Capacitor.getPlatform()!=='android')return;
 if(pending){
  if(pendingMember===memberId)return pending;
  await pending;
  return registerDevicePush(memberId);
 }
 pendingMember=memberId;
 pending=(async()=>{publish({state:'checking'});try{
  const {token}=await native.getToken();
  if(!token)throw Error('Device did not return a notification registration');
  const {data}=await supabase.auth.getUser();if(data.user?.id!==memberId)return;
  const r=await supabase.rpc('register_push_device',{p_token:token});
  if(r.error)throw Error('Notification registration could not be saved. Retry registration or sign out and sign in.');
  currentToken=token;publish({state:'registered',checkedAt:new Date().toISOString()});
 }catch(e){publish({state:'error',checkedAt:new Date().toISOString(),message:e instanceof Error?e.message:'Notification registration failed'});}
 })().finally(()=>{pending=null;pendingMember=null;});return pending;
}
export async function unregisterDevicePush(){
 if(pending)await pending;
 if(Capacitor.getPlatform()==='android'&&!currentToken){const registration=await native.getToken();currentToken=registration.token;}
 if(currentToken){const r=await supabase.from('push_tokens').update({active:false,updated_at:new Date().toISOString()}).eq('token',currentToken);if(r.error)throw Error('Could not disconnect this device from notifications. Retry sign out.');}
 currentToken=null;publish({state:Capacitor.getPlatform()==='android'?'checking':'unsupported'});
}

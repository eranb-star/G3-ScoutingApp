/** Only an explicit FCM token-expiry result justifies disabling a device. */
export function tokenIsUnregistered(body:unknown):boolean {
 const details=(body as {error?:{details?:unknown[]}}|null)?.error?.details;
 return Array.isArray(details)&&details.some(detail=>{
  const value=detail as Record<string,unknown>|null;
  return value?.['@type']==='type.googleapis.com/google.firebase.fcm.v1.FcmError'&&value.errorCode==='UNREGISTERED';
 });
}

// Browser-only adapter. The existing server remains the authority for radius,
// membership, meeting state and attendance writes. Never fall back to an SSID.
export async function browserLocationAttendance(
 geolocation:Pick<Geolocation,'getCurrentPosition'>|undefined,
 submit:(details:{latitude:number;longitude:number;accuracy:number})=>Promise<void>,
 now=()=>Date.now(),
){
 if(!geolocation)throw Error('Location is unavailable in this browser. Open the HTTPS website in Safari or Chrome and enable location access.');
 const position=await new Promise<GeolocationPosition>((resolve,reject)=>{
  geolocation.getCurrentPosition(resolve,e=>reject(Error(e.code===1
   ?'Location permission was denied. Allow precise location for this website in your browser settings, then try again.'
   :e.code===3?'Location timed out. Try near the workshop entrance and retry.'
   :'Your location could not be determined. Enable precise location and try near the workshop entrance.')),
   {enableHighAccuracy:true,timeout:15000,maximumAge:0});
 });
 const {latitude,longitude,accuracy}=position.coords;
 if(![latitude,longitude,accuracy,position.timestamp].every(Number.isFinite)||Math.abs(latitude)>90||Math.abs(longitude)>180||accuracy<0)
  throw Error('The location reading was invalid. Please retry.');
 if(now()-position.timestamp>30000||position.timestamp-now()>5000)
  throw Error('The location reading is not current. Please request a new reading.');
 await submit({latitude,longitude,accuracy});
}

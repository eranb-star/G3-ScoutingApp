package com.g3.scouting;

import android.Manifest;
import android.app.PendingIntent;
import android.content.*;
import android.content.pm.PackageManager;
import android.location.Location;
import android.os.*;
import android.security.keystore.*;
import android.util.Base64;
import androidx.core.content.ContextCompat;
import androidx.work.*;
import com.google.android.gms.location.*;
import com.google.android.gms.tasks.Tasks;
import org.json.JSONObject;
import java.net.*;
import java.security.*;
import java.security.interfaces.RSAPublicKey;
import java.util.concurrent.TimeUnit;

/** No auth token is persisted. Only a device key may use an attendance-scoped grant. */
final class AutoCheckout {
 static final String ENDPOINT="https://hnqwhuuxlqfyawqymaaz.supabase.co/functions/v1/attendance-auto";
 static final String KEY="g3-attendance-auto", WORK="g3-attendance-auto";
 static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences(KEY,Context.MODE_PRIVATE);}
 static boolean permission(Context c){return ContextCompat.checkSelfPermission(c,Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED&&(Build.VERSION.SDK_INT<29||ContextCompat.checkSelfPermission(c,Manifest.permission.ACCESS_BACKGROUND_LOCATION)==PackageManager.PERMISSION_GRANTED);}
 static String b64(byte[] b){return Base64.encodeToString(b,Base64.URL_SAFE|Base64.NO_WRAP|Base64.NO_PADDING);}
 static byte[] unsigned(java.math.BigInteger n){byte[] b=n.toByteArray();return b[0]==0?java.util.Arrays.copyOfRange(b,1,b.length):b;}
 static KeyStore store()throws Exception{KeyStore s=KeyStore.getInstance("AndroidKeyStore");s.load(null);return s;}
 static synchronized JSONObject publicKey()throws Exception{
  KeyStore s=store();if(!s.containsAlias(KEY)){KeyPairGenerator g=KeyPairGenerator.getInstance("RSA","AndroidKeyStore");g.initialize(new KeyGenParameterSpec.Builder(KEY,KeyProperties.PURPOSE_SIGN|KeyProperties.PURPOSE_VERIFY).setKeySize(2048).setDigests(KeyProperties.DIGEST_SHA256).setSignaturePaddings(KeyProperties.SIGNATURE_PADDING_RSA_PKCS1).build());g.generateKeyPair();}
  RSAPublicKey k=(RSAPublicKey)store().getCertificate(KEY).getPublicKey();return new JSONObject().put("kty","RSA").put("n",b64(unsigned(k.getModulus()))).put("e",b64(unsigned(k.getPublicExponent())));
 }
 static JSONObject request(JSONObject payload,String token)throws Exception{
  String text=payload.toString();Signature signature=Signature.getInstance("SHA256withRSA");signature.initSign((PrivateKey)store().getKey(KEY,null));signature.update(text.getBytes(java.nio.charset.StandardCharsets.UTF_8));
  byte[] bytes=new JSONObject().put("payload",text).put("signature",b64(signature.sign())).toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
  HttpURLConnection conn=(HttpURLConnection)new URL(ENDPOINT).openConnection();conn.setRequestMethod("POST");conn.setInstanceFollowRedirects(false);conn.setConnectTimeout(15000);conn.setReadTimeout(15000);conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json");if(token!=null)conn.setRequestProperty("Authorization","Bearer "+token);
  try{conn.getOutputStream().write(bytes);int code=conn.getResponseCode();java.io.InputStream input=code<300?conn.getInputStream():conn.getErrorStream();java.io.ByteArrayOutputStream buffer=new java.io.ByteArrayOutputStream();byte[] chunk=new byte[2048];int count;while((count=input.read(chunk))!=-1){buffer.write(chunk,0,count);if(buffer.size()>12000)throw new Exception("Response too large");}String response=new String(buffer.toByteArray(),java.nio.charset.StandardCharsets.UTF_8);JSONObject result=new JSONObject(response);if(code>=300)throw new Exception(result.optString("error","Automatic checkout unavailable"));return result;}finally{conn.disconnect();}
 }
 static class LocationUnavailable extends Exception { LocationUnavailable(String message){super(message);} }
 static JSONObject location(Context c)throws Exception{
  if(!permission(c))throw new Exception("Background location permission required");
  com.google.android.gms.tasks.CancellationTokenSource cancel=new com.google.android.gms.tasks.CancellationTokenSource();
  try{Location l=Tasks.await(LocationServices.getFusedLocationProviderClient(c).getCurrentLocation(new CurrentLocationRequest.Builder().setPriority(Priority.PRIORITY_HIGH_ACCURACY).setMaxUpdateAgeMillis(0).setDurationMillis(20000).build(),cancel.getToken()),25,TimeUnit.SECONDS);
   if(l==null)throw new LocationUnavailable("Location unavailable");long age=(android.os.SystemClock.elapsedRealtimeNanos()-l.getElapsedRealtimeNanos())/1000000;
   if(age<0||age>60000||!l.hasAccuracy()||l.getAccuracy()>50||l.isFromMockProvider())throw new LocationUnavailable("Fresh precise location required");
   return new JSONObject().put("latitude",l.getLatitude()).put("longitude",l.getLongitude()).put("accuracy",l.getAccuracy()).put("ageMs",age).put("mock",l.isFromMockProvider());
  }catch(java.util.concurrent.TimeoutException|java.util.concurrent.ExecutionException e){throw new LocationUnavailable("Location unavailable");}catch(SecurityException e){throw new Exception("Location permission was revoked",e);}finally{cancel.cancel();}
 }
 static PendingIntent pending(Context c){return PendingIntent.getBroadcast(c,841,new Intent(c,AutoCheckoutReceiver.class).setAction("com.g3.scouting.AUTO_GEOFENCE"),PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=31?PendingIntent.FLAG_MUTABLE:0));}
 static void remove(Context c){LocationServices.getGeofencingClient(c).removeGeofences(pending(c));WorkManager.getInstance(c).cancelUniqueWork(WORK);}
 static synchronized void stop(Context c,String state){remove(c);c.stopService(new Intent(c,AutoCheckoutService.class));prefs(c).edit().putString("state",state).putString("generation",java.util.UUID.randomUUID().toString()).remove("challenge").apply();}
 static synchronized boolean active(Context c){
  var p=prefs(c);String state=p.getString("state","off");
  if(!state.equals("armed")&&!state.equals("pending"))return false;
  if(p.getLong("boot",-1)!=android.provider.Settings.Global.getInt(c.getContentResolver(),"boot_count",-2)||android.os.SystemClock.elapsedRealtime()>=p.getLong("expiresElapsed",0)){stop(c,"interrupted");return false;}
  if(!permission(c)){fail(c,"permission_revoked");return false;}
  if(state.equals("pending")&&p.getLong("pendingDeadline",Long.MAX_VALUE)<android.os.SystemClock.elapsedRealtime()){fail(c,"confirmation_timeout");return false;}
  return true;
 }
 static synchronized void fail(Context c,String reason){
  String code=java.util.Arrays.asList("confirmation_timeout","network_unavailable","location_unavailable","permission_revoked","background_start_blocked","geofence_unavailable").contains(reason==null?"":reason)?reason:"verification_rejected";
  prefs(c).edit().putString("failureReason",code).putLong("failureAt",System.currentTimeMillis()).commit();stop(c,"unavailable");AutoCheckoutWorker.notifyResult(c,"unavailable");
 }
 static double distance(Context c,JSONObject location)throws Exception{var p=prefs(c);float[] result=new float[1];Location.distanceBetween(Double.parseDouble(p.getString("latitude","NaN")),Double.parseDouble(p.getString("longitude","NaN")),location.getDouble("latitude"),location.getDouble("longitude"),result);return result[0];}
 static boolean inside(Context c,JSONObject location)throws Exception{return distance(c,location)+location.getDouble("accuracy")<=prefs(c).getFloat("exitRadius",0)-50;}
 static boolean outside(Context c,JSONObject location)throws Exception{return distance(c,location)-location.getDouble("accuracy")>prefs(c).getFloat("exitRadius",0);}
 static synchronized void revoke(Context c){String grant=prefs(c).getString("grantId","");stop(c,"off");if(!grant.isEmpty())try{send(c,"revoke",new JSONObject());}catch(Exception ignored){}prefs(c).edit().remove("grantId").remove("memberId").remove("attendanceId").apply();}
 static synchronized JSONObject send(Context c,String action,JSONObject data)throws Exception{
  long sequence=prefs(c).getLong("sequence",0)+1;prefs(c).edit().putLong("sequence",sequence).commit();
  data.put("action",action).put("grantId",prefs(c).getString("grantId","")).put("sequence",sequence);
  // Same signed sequence on network retry, never invent a second transition.
  try{return request(data,null);}catch(java.io.IOException e){return request(data,null);}
 }
 static synchronized JSONObject arm(Context c,String member,String attendance,String token)throws Exception{
  revoke(c);JSONObject key=publicKey();JSONObject prepared=request(new JSONObject().put("action","prepare").put("publicKey",key),token);
  JSONObject data=location(c).put("action","arm").put("attendanceId",attendance).put("publicKey",key).put("nonce",prepared.getString("nonce"));JSONObject result=request(data,token);
  prefs(c).edit().remove("failureReason").remove("failureAt").remove("pendingDeadline").putString("latitude",String.valueOf(result.getDouble("latitude"))).putString("longitude",String.valueOf(result.getDouble("longitude"))).putFloat("exitRadius",(float)result.getDouble("radius")).commit();
  String grant=result.getString("grantId"),generation=java.util.UUID.randomUUID().toString();
  prefs(c).edit().putString("grantId",grant).putString("memberId",member).putString("attendanceId",attendance).putLong("sequence",0).putString("generation",generation).putString("mode",result.getString("mode")).putString("state","armed").putString("expiresAt",result.getString("expiresAt")).putLong("boot",android.provider.Settings.Global.getInt(c.getContentResolver(),"boot_count",-1)).commit();
  try{long expiry=result.getLong("expiresInMs");
   prefs(c).edit().putLong("expiresElapsed",android.os.SystemClock.elapsedRealtime()+expiry).commit();
   Geofence fence=new Geofence.Builder().setRequestId(grant).setCircularRegion(result.getDouble("latitude"),result.getDouble("longitude"),(float)result.getDouble("radius")).setExpirationDuration(Math.max(1,expiry)).setTransitionTypes(Geofence.GEOFENCE_TRANSITION_ENTER|Geofence.GEOFENCE_TRANSITION_EXIT).setNotificationResponsiveness(60000).build();
   Tasks.await(LocationServices.getGeofencingClient(c).addGeofences(new GeofencingRequest.Builder().setInitialTrigger(0).addGeofence(fence).build(),pending(c)),20,TimeUnit.SECONDS);
   return result;
  }catch(SecurityException e){revoke(c);throw new Exception("Location permission was revoked",e);}catch(Exception e){revoke(c);throw e;}
 }
 static void queue(Context c,String action,long delay,String generation){OneTimeWorkRequest work=new OneTimeWorkRequest.Builder(AutoCheckoutWorker.class).setInputData(new Data.Builder().putString("action",action).putString("generation",generation).build()).setInitialDelay(delay,TimeUnit.SECONDS).build();WorkManager.getInstance(c).enqueueUniqueWork(WORK,ExistingWorkPolicy.REPLACE,work);}
}

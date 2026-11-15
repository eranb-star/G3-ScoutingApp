package com.g3.scouting;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import org.json.JSONObject;

/** Started directly by the geofence event, not a deferred five-minute background job. */
public class AutoCheckoutService extends Service {
 private final java.util.concurrent.ExecutorService executor=java.util.concurrent.Executors.newSingleThreadExecutor();
 private volatile boolean destroyed;
 static void start(Context c,String generation){
  try{ContextCompat.startForegroundService(c,new Intent(c,AutoCheckoutService.class).putExtra("generation",generation));}
  catch(RuntimeException e){AutoCheckout.fail(c,"background_start_blocked");}
 }
 @Override public IBinder onBind(Intent intent){return null;}
 @Override public int onStartCommand(Intent intent,int flags,int startId){
  String generation=intent==null?null:intent.getStringExtra("generation");
  try {
   NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
   if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("g3_attendance_verify","Attendance verification",NotificationManager.IMPORTANCE_LOW));
   PendingIntent tap=PendingIntent.getActivity(this,843,new Intent(this,MainActivity.class).putExtra("g3_path","/check-in"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
   Notification notification=new NotificationCompat.Builder(this,"g3_attendance_verify").setSmallIcon(getApplicationInfo().icon)
    .setContentTitle("G3 · אימות יציאה מהסדנה").setContentText("מאמתים מיקום לאחר היציאה. הנוכחות תיסגר רק באישור השרת.").setContentIntent(tap).setOngoing(true).build();
   if(Build.VERSION.SDK_INT>=29)startForeground(843,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);else startForeground(843,notification);
   executor.execute(()->verify(generation,startId));
  }catch(RuntimeException e){AutoCheckout.fail(this,"background_start_blocked");stopSelf(startId);}
  return START_NOT_STICKY;
 }
 private boolean current(String generation){return !destroyed&&generation!=null&&generation.equals(AutoCheckout.prefs(this).getString("generation",""))&&AutoCheckout.active(this);}
 private void verify(String generation,int startId){
  PowerManager.WakeLock wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"G3:exit-verification");
  try {
   if(!current(generation))return;
   wake.acquire(16*60*1000L);
   AutoCheckoutConfirmation.run(new AutoCheckoutConfirmation.Driver(){
    public long now(){return SystemClock.elapsedRealtime();}
    public boolean active(){return current(generation);}
    public void pause(long ms)throws InterruptedException{Thread.sleep(ms);}
    public void begin()throws Exception{transition("begin");}
    public void confirm()throws Exception{transition("confirm");}
    public void failed(String reason){if(current(generation))AutoCheckout.fail(AutoCheckoutService.this,reason);}
    private void transition(String action)throws Exception{
     try{
      synchronized(AutoCheckout.class){if(!current(generation))return;AutoCheckout.send(AutoCheckoutService.this,"status",new JSONObject());}
      JSONObject location=AutoCheckout.location(AutoCheckoutService.this);
      synchronized(AutoCheckout.class){
       if(!current(generation))return;
       var p=AutoCheckout.prefs(AutoCheckoutService.this);
       // A fresh return inside cancels verification even if the entry callback was delayed.
       if(AutoCheckout.inside(AutoCheckoutService.this,location)){
        AutoCheckout.send(AutoCheckoutService.this,"cancel",new JSONObject());
        p.edit().putString("state","armed").putString("generation",java.util.UUID.randomUUID().toString()).remove("challenge").remove("pendingDeadline").commit();return;
       }
       if(!AutoCheckout.outside(AutoCheckoutService.this,location))throw new AutoCheckoutConfirmation.Retryable("location_unavailable");
       if(action.equals("confirm"))location.put("challenge",p.getString("challenge",""));
       JSONObject result=AutoCheckout.send(AutoCheckoutService.this,action,location);
       p.edit().putString("state",result.getString("state")).putString("result",result.toString()).commit();
       if(action.equals("begin"))p.edit().putString("challenge",result.getString("challenge")).putLong("pendingDeadline",now()+AutoCheckoutConfirmation.WINDOW_MS).commit();
       else {AutoCheckout.stop(AutoCheckoutService.this,result.getString("state"));AutoCheckoutWorker.notifyResult(AutoCheckoutService.this,result.getString("state"));}
      }
     }catch(java.io.IOException e){throw new AutoCheckoutConfirmation.Retryable("network_unavailable");}
      catch(AutoCheckout.LocationUnavailable e){throw new AutoCheckoutConfirmation.Retryable("location_unavailable");}
    }
   });
  }finally{if(wake.isHeld())wake.release();stopSelf(startId);}
 }
 @Override public void onDestroy(){destroyed=true;executor.shutdownNow();super.onDestroy();}
}

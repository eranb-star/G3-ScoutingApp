package com.g3.scouting;
import android.content.Context;
import androidx.work.*;
import org.json.JSONObject;
public class AutoCheckoutWorker extends Worker {
 public AutoCheckoutWorker(Context c,WorkerParameters p){super(c,p);}
 @Override public Result doWork(){Context c=getApplicationContext();String generation=getInputData().getString("generation"),action=getInputData().getString("action");
  try{
   synchronized(AutoCheckout.class){
    if(!java.util.Objects.equals(generation,AutoCheckout.prefs(c).getString("generation",""))||!AutoCheckout.active(c))return Result.success();
    // Check that the attendance is still open before requesting any fresh location.
    AutoCheckout.send(c,"status",new JSONObject());
   }
   JSONObject evidence=action.equals("cancel")?new JSONObject():AutoCheckout.location(c);
   synchronized(AutoCheckout.class){var p=AutoCheckout.prefs(c);
    if(!java.util.Objects.equals(generation,p.getString("generation","")))return Result.success();
    if(p.getLong("boot",-1)!=android.provider.Settings.Global.getInt(c.getContentResolver(),"boot_count",-2))throw new Exception("Restart requires enrollment inside workshop");
    if(action.equals("confirm"))evidence.put("challenge",p.getString("challenge",""));
    JSONObject result=AutoCheckout.send(c,action,evidence);String state=result.getString("state");p.edit().putString("state",state).putString("result",result.toString()).apply();
    if(action.equals("begin")){p.edit().putString("challenge",result.getString("challenge")).apply();
     // Use a separate unique continuation: replacing this running worker would cancel it.
     OneTimeWorkRequest next=new OneTimeWorkRequest.Builder(AutoCheckoutWorker.class).setInputData(new Data.Builder().putString("action","confirm").putString("generation",generation).build()).setInitialDelay(301,java.util.concurrent.TimeUnit.SECONDS).build();
     WorkManager.getInstance(c).enqueue(next);
    }else if(state.equals("closed")||state.equals("observed")){AutoCheckout.stop(c,state);notifyResult(c,state);}
   }
   return Result.success();
  }catch(Exception e){synchronized(AutoCheckout.class){if(java.util.Objects.equals(generation,AutoCheckout.prefs(c).getString("generation",""))){AutoCheckout.stop(c,"unavailable");}}return Result.failure();}
 }
 private void notifyResult(Context c,String state){
  android.app.NotificationManager manager=(android.app.NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
  if(android.os.Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new android.app.NotificationChannel("g3_attendance_auto","Automatic attendance",android.app.NotificationManager.IMPORTANCE_DEFAULT));
  android.content.Intent intent=new android.content.Intent(c,MainActivity.class).putExtra("g3_path","/check-in");
  android.app.PendingIntent tap=android.app.PendingIntent.getActivity(c,842,intent,android.app.PendingIntent.FLAG_UPDATE_CURRENT|android.app.PendingIntent.FLAG_IMMUTABLE);
  String text=state.equals("closed")?"בוצע צ׳ק־אאוט אוטומטי. לפרטים ותיקון פתחו נוכחות.":"זוהתה יציאה במצב בדיקה. הנוכחות עדיין פתוחה — נדרש צ׳ק־אאוט רגיל.";
  try{manager.notify(842,new androidx.core.app.NotificationCompat.Builder(c,"g3_attendance_auto").setSmallIcon(c.getApplicationInfo().icon).setContentTitle("G3 · נוכחות").setContentText(text).setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(text)).setContentIntent(tap).setAutoCancel(true).build());}catch(SecurityException ignored){}
 }
}

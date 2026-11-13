package com.g3.scouting;
import android.content.*;
import com.google.android.gms.location.*;
public class AutoCheckoutReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context context,Intent intent){
  PendingResult pending=goAsync();new Thread(()->{try{handle(context,intent);}finally{pending.finish();}},"g3-geofence").start();
 }
 private void handle(Context context,Intent intent){
  if(Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())||Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())){AutoCheckout.stop(context,"interrupted");return;}
  GeofencingEvent event=GeofencingEvent.fromIntent(intent);
  if(event==null||event.hasError()){AutoCheckout.stop(context,"unavailable");return;}
  synchronized(AutoCheckout.class){
   var p=AutoCheckout.prefs(context);String state=p.getString("state","off"),grant=p.getString("grantId","");
   if(!(state.equals("armed")||state.equals("pending"))||event.getTriggeringGeofences()==null||event.getTriggeringGeofences().stream().noneMatch(g->g.getRequestId().equals(grant)))return;
   if(event.getGeofenceTransition()==Geofence.GEOFENCE_TRANSITION_EXIT&&!state.equals("armed"))return;
   String generation=java.util.UUID.randomUUID().toString();p.edit().putString("generation",generation).apply();
   if(event.getGeofenceTransition()==Geofence.GEOFENCE_TRANSITION_ENTER){p.edit().putString("state","pending").apply();AutoCheckout.queue(context,"cancel",0,generation);}
   else if(event.getGeofenceTransition()==Geofence.GEOFENCE_TRANSITION_EXIT&&state.equals("armed")){p.edit().putString("state","pending").apply();AutoCheckout.queue(context,"begin",0,generation);}
  }
 }
}

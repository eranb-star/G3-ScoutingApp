package com.g3.scouting;
import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
@CapacitorPlugin(name="AutoCheckout",permissions={@Permission(alias="location",strings={Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION})})
public class AutoCheckoutPlugin extends Plugin {
 private final java.util.concurrent.ExecutorService executor=java.util.concurrent.Executors.newSingleThreadExecutor();
 @PluginMethod public void locationPermission(PluginCall call){requestPermissionForAlias("location",call,"permissionResult");}
 @PermissionCallback private void permissionResult(PluginCall call){status(call);}
 @PluginMethod public void settings(PluginCall call){getActivity().startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getContext().getPackageName())));call.resolve();}
 @PluginMethod public void status(PluginCall call){executor.execute(()->{AutoCheckout.active(getContext());var p=AutoCheckout.prefs(getContext());JSObject result=new JSObject();result.put("state",p.getString("state","off"));result.put("mode",p.getString("mode","observe"));result.put("attendanceId",p.getString("attendanceId",""));result.put("memberId",p.getString("memberId",""));result.put("permission",AutoCheckout.permission(getContext()));result.put("failureReason",p.getString("failureReason",""));result.put("failureAt",p.getLong("failureAt",0));result.put("result",p.getString("result",""));call.resolve(result);});}
 @PluginMethod public void preference(PluginCall call){String member=call.getString("memberId");if(member==null){call.reject("Member required");return;}executor.execute(()->{JSObject result=new JSObject();result.put("enabled",AutoCheckout.prefs(getContext()).getBoolean("consent-v1:"+member,false));call.resolve(result);});}
 @PluginMethod public void setPreference(PluginCall call){String member=call.getString("memberId");Boolean enabled=call.getBoolean("enabled");if(member==null||enabled==null){call.reject("Member and preference required");return;}executor.execute(()->{if(!AutoCheckout.prefs(getContext()).edit().putBoolean("consent-v1:"+member,enabled).commit()){call.reject("Preference could not be saved");return;}if(!enabled&&member.equals(AutoCheckout.prefs(getContext()).getString("memberId","")))AutoCheckout.revoke(getContext());call.resolve();});}
 @PluginMethod public void arm(PluginCall call){String token=call.getString("token"),member=call.getString("memberId"),attendance=call.getString("attendanceId");if(token==null||member==null||attendance==null){call.reject("Sign in and check in first");return;}executor.execute(()->{try{if(!AutoCheckout.prefs(getContext()).getBoolean("consent-v1:"+member,false))throw new Exception("Automatic checkout consent required");AutoCheckout.arm(getContext(),member,attendance,token);status(call);}catch(Exception e){call.reject(e.getMessage());}});}
 @PluginMethod public void stop(PluginCall call){executor.execute(()->{AutoCheckout.revoke(getContext());call.resolve();});}
}

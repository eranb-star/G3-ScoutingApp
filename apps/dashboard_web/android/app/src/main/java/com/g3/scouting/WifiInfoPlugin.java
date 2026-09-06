package com.g3.scouting;

import android.Manifest;
import android.content.Context;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "WifiInfo", permissions = {
    @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
    @Permission(alias = "nearbyWifi", strings = { Manifest.permission.NEARBY_WIFI_DEVICES })
})
public class WifiInfoPlugin extends Plugin {
    @PluginMethod
    public void getCurrentNetwork(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "permissionCallback");
            return;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("nearbyWifi") != PermissionState.GRANTED) {
            requestPermissionForAlias("nearbyWifi", call, "permissionCallback");
            return;
        }
        resolveNetwork(call);
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        if (getPermissionState("location") == PermissionState.GRANTED &&
            (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState("nearbyWifi") == PermissionState.GRANTED)) {
            resolveNetwork(call);
        } else {
            call.reject("Wi-Fi permission was not granted");
        }
    }

    private void resolveNetwork(PluginCall call) {
        WifiManager manager = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
        WifiInfo info = manager == null ? null : manager.getConnectionInfo();
        String ssid = info == null ? null : info.getSSID();
        if (ssid == null || WifiManager.UNKNOWN_SSID.equals(ssid)) {
            call.reject("Connected Wi-Fi name is unavailable");
            return;
        }
        if (ssid.startsWith("\"") && ssid.endsWith("\"") && ssid.length() > 1) ssid = ssid.substring(1, ssid.length() - 1);
        JSObject result = new JSObject();
        result.put("ssid", ssid);
        call.resolve(result);
    }
}

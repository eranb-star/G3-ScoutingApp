package com.g3.scouting;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WifiInfo")
public class WifiInfoPlugin extends Plugin {
    @PluginMethod
    public void getCurrentNetwork(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            call.reject("Location permission is required to read the connected Wi-Fi network");
            return;
        }
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

package com.g3.scouting;

import com.getcapacitor.BridgeActivity;
import android.content.Intent;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WifiInfoPlugin.class);
        registerPlugin(G3PushPlugin.class);
        super.onCreate(savedInstanceState);
        openNotificationDestination(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openNotificationDestination(intent);
    }

    private void openNotificationDestination(Intent intent) {
        if (intent == null || !"/messages".equals(intent.getStringExtra("g3_path"))) return;
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript("window.location.assign('/messages')", null));
    }
}

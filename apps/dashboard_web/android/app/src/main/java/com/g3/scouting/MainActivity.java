package com.g3.scouting;

import com.getcapacitor.BridgeActivity;
import android.content.Intent;
import android.os.Bundle;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WifiInfoPlugin.class);
        registerPlugin(G3PushPlugin.class);
        super.onCreate(savedInstanceState);
        openNotificationDestination(getIntent());
        if (BuildConfig.CRASHLYTICS_TEST_BUILD) {
            android.widget.Button testCrash = new android.widget.Button(this);
            testCrash.setText("QA: Test Crash");
            android.widget.FrameLayout.LayoutParams params = new android.widget.FrameLayout.LayoutParams(
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                android.view.ViewGroup.LayoutParams.WRAP_CONTENT,
                android.view.Gravity.BOTTOM | android.view.Gravity.CENTER_HORIZONTAL);
            params.bottomMargin = Math.round(32 * getResources().getDisplayMetrics().density);
            addContentView(testCrash, params);
            testCrash.setOnClickListener(view -> new android.app.AlertDialog.Builder(this)
                .setTitle("Crashlytics test")
                .setMessage("This will deliberately close the app. Reopen it to send the test report to Firebase.")
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Test Crash", (dialog, which) -> {
                    throw new RuntimeException("G3 Crashlytics QA test");
                }).show());
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        openNotificationDestination(intent);
    }

    private void openNotificationDestination(Intent intent) {
        if (intent == null) return;
        String path = intent.getStringExtra("g3_path");
        if (path == null) path = intent.getStringExtra("path");
        if (path == null || !path.startsWith("/") || path.startsWith("//")) return;
        intent.removeExtra("g3_path");
        intent.removeExtra("path");
        final String destination = path;
        bridge.getWebView().post(() -> bridge.getWebView().evaluateJavascript("window.location.assign(" + JSONObject.quote(destination) + ")", null));
    }
}

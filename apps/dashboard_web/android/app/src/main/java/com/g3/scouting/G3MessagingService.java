package com.g3.scouting;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class G3MessagingService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "g3_announcements";

    @Override public void onMessageReceived(RemoteMessage message) {
        String title = message.getNotification() != null ? message.getNotification().getTitle() : message.getData().get("title");
        String body = message.getNotification() != null ? message.getNotification().getBody() : message.getData().get("body");
        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("g3_path", message.getData().getOrDefault("path", "/updates?view=inbox"));
        PendingIntent pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "G3 announcements", NotificationManager.IMPORTANCE_HIGH));
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title == null ? "G3 Team Hub" : title).setContentText(body == null ? "New team announcement" : body).setAutoCancel(true).setContentIntent(pending).setPriority(NotificationCompat.PRIORITY_HIGH);
        manager.notify((int) System.currentTimeMillis(), notification.build());
    }
}

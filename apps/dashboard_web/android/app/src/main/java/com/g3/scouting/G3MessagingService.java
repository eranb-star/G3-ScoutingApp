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
        String path = message.getData().getOrDefault("path", "/updates?view=inbox");
        String notificationKey = message.getMessageId() != null ? message.getMessageId() : path;
        int notificationId = notificationKey.hashCode() & 0x7fffffff;
        Intent intent = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("g3_path", path);
        PendingIntent pending = PendingIntent.getActivity(this, notificationId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26) manager.createNotificationChannel(new NotificationChannel(CHANNEL_ID, "G3 team alerts", NotificationManager.IMPORTANCE_HIGH));
        String safeBody = body == null ? "New team update" : body;
        NotificationCompat.Builder notification = new NotificationCompat.Builder(this, CHANNEL_ID).setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title == null ? "G3 6740 Team Hub" : title).setContentText(safeBody).setStyle(new NotificationCompat.BigTextStyle().bigText(safeBody)).setAutoCancel(true).setOnlyAlertOnce(true).setContentIntent(pending).setPriority(NotificationCompat.PRIORITY_HIGH).setCategory(NotificationCompat.CATEGORY_EVENT);
        manager.notify(notificationId, notification.build());
    }
}

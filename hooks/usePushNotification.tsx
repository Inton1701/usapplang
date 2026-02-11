import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { saveTokenToFirebase } from '../services/firebaseService';
import { PushNotificationData } from '../types/notification';

interface UseNotificationsReturn {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
}

export function useNotifications(
  userId: string | null,
  onNotificationTap?: (data: PushNotificationData) => void
): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(async (token) => {
      if (token) {
        setExpoPushToken(token);
        
        // Save to Firebase if user is logged in
        if (userId) {
          await saveTokenToFirebase(userId, token);
        }
      }
    });

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        setNotification(notification);
        console.log('Notification received:', notification);
      }
    );

    // Listen for notification interactions (when user taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushNotificationData;
        console.log('Notification tapped:', data);
        
        if (onNotificationTap) {
          onNotificationTap(data);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [userId, onNotificationTap]);

  return { expoPushToken, notification };
}
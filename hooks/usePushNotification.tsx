import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { saveTokenToFirebase } from '../services/firebaseService';
import { PushNotificationData } from '../types/notification';

interface UseNotificationsReturn {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
}

/**
 * Set up app-wide notification handlers
 * Listens for notification taps and navigates to chat screens
 */
export function usePushNotificationHandler(): void {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Handle notification response (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as PushNotificationData;
        console.log('👆 Notification tapped, navigating to:', data.chatId);

        if (data.chatId) {
          router.push({
            pathname: '/(chat)/[conversationId]',
            params: {
              conversationId: data.chatId,
              otherUid: data.senderId,
            },
          });
        }
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router]);
}

/**
 * Legacy hook for component-based notification setup
 * Kept for backward compatibility
 */
export function useNotifications(
  userId: string | null,
  onNotificationTap?: (data: PushNotificationData) => void
): UseNotificationsReturn {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();

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
        console.log('🔔 Notification received (foreground):', notification);
      }
    );

    // Listen for notification interactions (when user taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.request.content;
        console.log('👆 Notification tapped:', data);
        
        // Handle navigation based on notification type
        const notifData = data as PushNotificationData;
        
        if (notifData.chatId) {
          console.log('🔗 Navigating to chat:', notifData.chatId);
          router.push({
            pathname: '/(chat)/[conversationId]',
            params: {
              conversationId: notifData.chatId,
              otherUid: notifData.senderId,
            },
          });
        }
        
        // Call custom callback if provided
        if (onNotificationTap) {
          onNotificationTap(notifData);
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
  }, [userId, onNotificationTap, router]);

  return { expoPushToken, notification };
}
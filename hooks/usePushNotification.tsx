import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerForPushNotificationsAsync } from '../services/notificationService';
import { saveTokenToFirebase } from '../services/firebaseService';
import { useAuth } from '../hooks/useAuth';
import { sendMessage } from '../services/messagesService';
import {
  PushNotificationData,
  NOTIF_ACTION_REPLY,
} from '../types/notification';

interface UseNotificationsReturn {
  expoPushToken: string | undefined;
  notification: Notifications.Notification | undefined;
}

/**
 * Set up app-wide notification handlers
 * Listens for notification taps and navigates to chat screens
 */
/**
 * Internal hook for setting up notification handlers with auth context
 * Must be called inside AuthProvider
 */
function useNotificationHandlerWithAuth(): void {
  const router = useRouter();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Handle notification response (user taps OR uses inline quick-reply)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const data = response.notification.request.content.data as PushNotificationData;

        // ── SECURITY: both branches require the user to be a conversation participant ──
        if (!data.chatId || !user?.uid) return;

        const participants = data.chatId.split('_');
        if (!participants.includes(user.uid)) {
          console.warn(
            'SECURITY: User attempted to act on a conversation they are not in.',
            `Current user: ${user.uid}, Conversation: ${data.chatId}`,
          );
          return;
        }

        // ── Quick-reply action ─────────────────────────────────────────────────────
        if (response.actionIdentifier === NOTIF_ACTION_REPLY) {
          // `userText` is populated by expo-notifications when a TextInput action fires
          const replyText = (response as Notifications.NotificationResponse & { userText?: string }).userText?.trim();
          if (!replyText) return;

          console.log('[QuickReply] Sending reply to', data.chatId);
          try {
            await sendMessage({
              conversationId: data.chatId,
              senderId: user.uid,
              text: replyText,
              localId: `qr_${Date.now()}`,
            });

            // Show a local confirmation so the user knows the reply was sent
            await Notifications.scheduleNotificationAsync({
              content: {
                title: data.senderName ? `Replied to ${data.senderName}` : 'Reply sent',
                body: replyText,
                data: {},
              },
              trigger: null,
            });
          } catch (err) {
            console.error('[QuickReply] Failed to send:', err);
          }
          // Do NOT navigate — the user chose to stay in the current screen
          return;
        }

        // ── Default tap: navigate into the conversation ────────────────────────────
        console.log('Notification tapped, navigating to conversation…', data.chatId);
        router.push({
          pathname: '/(chat)/[conversationId]',
          params: {
            conversationId: data.chatId,
            otherUid: data.senderId,
          },
        });
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [router, user?.uid]);
}

/**
 * Component that sets up notification handlers
 * Must be inside AuthProvider
 */
export function NotificationSetup({ children }: { children: React.ReactNode }) {
  useNotificationHandlerWithAuth();
  return <>{children}</>;
}

/**
 * Legacy export for backwards compatibility
 * Use NotificationSetup component instead
 */
export function usePushNotificationHandler(): void {
  // This is now deprecated - use NotificationSetup component instead
  useNotificationHandlerWithAuth();
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
        console.log('Notification received (foreground):', notification);
      }
    );

    // Listen for notification interactions (when user taps)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { data } = response.notification.request.content;
        console.log('Notification tapped:', data);
        
        // Handle navigation based on notification type
        const notifData = data as PushNotificationData;
        
        if (notifData.chatId) {
          console.log('Navigating to chat:', notifData.chatId);
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
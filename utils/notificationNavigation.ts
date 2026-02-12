import { NavigationContainerRef } from '@react-navigation/native';
import { PushNotificationData } from '@/types/notification';

/**
 * Handle navigation when notification is tapped
 * Works from all app states: killed, background, foreground
 * 
 * @param data - Notification data containing chatId, senderId, etc.
 * @param navigationRef - React Navigation reference for routing
 */
export function handleNotificationNavigation(
  data: PushNotificationData,
  navigationRef: NavigationContainerRef<any>
): void {
  try {
    if (!data.chatId) {
      console.warn('⚠️ No chatId in notification data');
      return;
    }

    console.log('🎯 Navigating to conversation:', data.chatId);

    // Reset the stack and navigate to chat screen
    // This ensures proper navigation regardless of app state
    navigationRef.resetRoot({
      index: 0,
      routes: [
        {
          name: '(chat)',
          state: {
            routes: [
              {
                name: '[conversationId]',
                params: {
                  conversationId: data.chatId,
                  otherUid: data.senderId,
                  messageId: data.messageId, // Optional: for highlighting specific message
                },
              },
            ],
          },
        },
      ],
    });

    console.log('✅ Navigation successful');
  } catch (error) {
    console.error('❌ Navigation error:', error);
  }
}

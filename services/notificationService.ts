import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import {
  NOTIF_CATEGORY_MESSAGE,
  NOTIF_ACTION_REPLY,
  ANDROID_CHANNEL_ID,
} from '@/types/notification';

// ── Foreground display behaviour ─────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── Android notification channel ─────────────────────────────────
// Must be called before any notification is displayed on Android.
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#1877F2',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

// ── Notification categories (quick-reply action) ──────────────────
// A "category" groups one or more action buttons shown under a notification.
// We register one category called MESSAGE that has a single TextInput action
// (the inline reply field) on both iOS and Android.
//
// iOS: shows a native reply sheet when long-pressing the notification.
// Android 7+: shows an inline RemoteInput text field in the notification shade.
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync(NOTIF_CATEGORY_MESSAGE, [
    {
      identifier: NOTIF_ACTION_REPLY,
      buttonTitle: 'Reply',
      textInput: {
        // iOS: placeholder inside the reply field
        // Android: hint text shown in the RemoteInput box
        submitButtonTitle: 'Send',
        placeholder: 'Type a reply…',
      },
      options: {
        // Keep notification visible after user replies (iOS)
        isDestructive: false,
        isAuthenticationRequired: false,
        // Bring the app to foreground on tap — false keeps it in background
        opensAppToForeground: false,
      },
    },
  ]);
}

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return undefined;
  }

  // Set up Android channel + reply category on every registration call
  // (idempotent — safe to call multiple times)
  await setupAndroidChannel();
  await setupNotificationCategories();

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('User denied push permissions');
      return undefined;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.error('EAS projectId not configured (expo.extra.eas.projectId)');
      return undefined;
    }

    const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResp.data;
    console.log('✅ Expo push token:', token);
    return token;
  } catch (err) {
    console.error('❌ Failed to get push token', err);
    return undefined;
  }
}

/**
 * Get the last notification sent to the app
 * Used to handle app launch from killed state via notification tap
 */
export async function getLastNotificationAsync(): Promise<Notifications.Notification | null> {
  try {
    const notification = await Notifications.getLastNotificationResponseAsync();
    return notification?.notification ?? null;
  } catch (error) {
    console.error('Error getting last notification:', error);
    return null;
  }
}

export async function schedulePushNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: 'default',
    },
    trigger: { 
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1 
    },
  });
}

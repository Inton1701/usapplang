import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return undefined;
  }

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

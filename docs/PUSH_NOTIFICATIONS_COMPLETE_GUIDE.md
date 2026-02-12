# Push Notifications Implementation Guide

## Overview

This document covers the complete implementation of push notifications for your Expo React Native messaging app, addressing both the `DeviceNotRegistered` error and deep linking navigation issues.

---

## Issue 1: DeviceNotRegistered Error

### Why This Happens

1. **App Uninstalls But Token Remains**: When you uninstall the app, FCM doesn't immediately invalidate the push token stored in your Firestore database.

2. **Race Condition**: If a message is sent before FCM detects the app is uninstalled, it attempts to deliver to the stale token.

3. **FCM Returns Error**: The Expo Push Service receives `DeviceNotRegistered` error from FCM, indicating the token is no longer valid.

4. **Stale Token Stays in DB**: Without cleanup, future messages to this user will also fail with the same error.

### Solution: Automatic Token Cleanup

The implementation now includes automatic cleanup of invalid tokens:

#### File: `services/pushNotificationSender.ts`

**Changes:**
- Added `recipientUserId` field to `MessageData` interface
- Created `handleDeviceNotRegistered()` function that removes invalid tokens from Firestore
- Updated `checkReceiptsAfterDelay()` to detect and handle the error

**How It Works:**

```typescript
// When DeviceNotRegistered error is detected:
if (receipt.details?.error === 'DeviceNotRegistered') {
  console.warn('→ Device token is invalid/expired. Removing from Firestore...');
  
  // Async cleanup (non-blocking)
  handleDeviceNotRegistered(options.recipientUserId)
    .catch((err) => console.error('Failed to clean up invalid token:', err));
}
```

#### File: `services/messagesService.ts`

**Changes:**
- Updated `sendPushNotificationToRecipient()` to pass `recipientUserId` to the push notification service

```typescript
await sendPushNotification(recipientToken, {
  messageId,
  chatId: conversationId,
  senderId,
  senderName,
  text,
  recipientUserId: recipientId, // ✅ Enables automatic error handling
});
```

### Best Practices for Token Management

#### 1. **Refresh Token on App Start**
```typescript
// In your main provider or root layout
useEffect(() => {
  registerForPushNotificationsAsync().then((token) => {
    if (token && userId) {
      saveTokenToFirebase(userId, token); // Updates existing token
    }
  });
}, [userId]);
```

**Why**: Every time the app launches (especially after reinstall), register a fresh token. Firebase `setDoc` with merge=true will update the existing token.

#### 2. **Monitor Token Refresh Events**
```typescript
// Optional: Listen for token refresh events
const subscription = Notifications.addNotificationSubscription((response) => {
  const token = response.notification.request.content.data?.newToken;
  if (token) {
    saveTokenToFirebase(userId, token);
  }
});
```

#### 3. **Handle Token Expiration Gracefully**
The implementation now automatically:
- Detects DeviceNotRegistered errors
- Removes the invalid token from Firestore
- Prevents future delivery attempts to stale tokens

#### 4. **Testing Token Refresh After Reinstall**

```bash
# Uninstall the app
expo prebuild --clean
eas build --platform [ios|android] --profile preview

# Reinstall via EAS
eas build:run --platform [ios|android]

# Monitor logs
eas device:create  # or adb logcat | grep "Expo"
```

---

## Issue 2: Push Notification Deep Linking

### Why Notifications Don't Currently Redirect

1. **No Deep Linking Configuration**: React Navigation needs to know how to map URLs to screens
2. **Missing Initial Notification Handler**: App launched from killed state doesn't check for pending notifications
3. **No Navigation Reference**: Notification handlers need access to the navigation ref to trigger navigation
4. **Incomplete Payload Structure**: Notification data doesn't include all necessary navigation params

### Solution: Complete Deep Linking Implementation

#### File: `app/_layout.tsx`

**Changes:**
- Added `linking` configuration object
- Integrated `usePushNotificationHandler` hook with navigation ref
- Added initial notification handler for killed state launches

```typescript
const linking = {
  prefixes: ['myapp://', 'https://myapp.com'],
  config: {
    screens: {
      // Deep link patterns
      '(chat)/[conversationId]': 'chat/:conversationId',
      '(tabs)/contacts': 'contacts',
      '(tabs)/notifications': 'notifications',
      '(tabs)/settings': 'settings',
      '(auth)/login': 'login',
    },
  },
};
```

**How Navigation Ref is Used:**
```typescript
const navigationRef = useNavigationContainerRef();

// Pass to push notification handler
usePushNotificationHandler(navigationRef);

// Handle app launch from notification
useEffect(() => {
  const handleInitialNotification = async () => {
    const notification = await getLastNotificationAsync();
    if (notification && navigationRef.isReady()) {
      handleNotificationNavigation(data, navigationRef);
    }
  };
  const timer = setTimeout(handleInitialNotification, 500);
  return () => clearTimeout(timer);
}, [navigationRef]);

// Pass to Stack navigator
<Stack linking={linking} fallback={<></>}>
```

#### Notification Payload Structure

**Current Implementation** (in `pushNotificationSender.ts`):

```typescript
const payload = {
  to: recipientToken,
  sound: 'default',
  title: message.senderName,
  body: message.text,
  data: {
    messageId: message.messageId,
    chatId: message.chatId,           // ✅ For screen routing
    senderId: message.senderId,        // ✅ For other user identification
    type: 'message',                   // ✅ For message type handling
  },
  priority: 'high',
  channelId: 'default',
  badge: 1,
};
```

**Data Field Details:**
- `chatId`: Conversation ID (matches route param `conversationId`)
- `senderId`: Sender's user ID (for context)
- `messageId`: Specific message ID (optional, for highlighting)
- `type`: Type of notification (for extensibility)

#### File: `utils/notificationNavigation.ts` (New)

This utility handles navigation from all app states:

```typescript
export function handleNotificationNavigation(
  data: PushNotificationData,
  navigationRef: NavigationContainerRef<any>
): void {
  // Extract chatId from notification data
  if (!data.chatId) return;

  // Use resetRoot for reliable navigation from any state
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
                messageId: data.messageId,
              },
            },
          ],
        },
      },
    ],
  });
}
```

**Why `resetRoot()`?**
- Works from all app states (killed, background, foreground)
- Clears the navigation stack
- Prevents navigation conflicts
- Ensures predictable behavior

#### File: `hooks/usePushNotification.tsx` (Enhanced)

**New Function**: `usePushNotificationHandler()`
```typescript
export function usePushNotificationHandler(
  navigationRef?: NavigationContainerRef<any>
): void {
  // Listens for notification taps and handles navigation
  useEffect(() => {
    if (!navigationRef) return;

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        handleNotificationNavigation(data, navigationRef);
      }
    );

    return () => subscription.remove();
  }, [navigationRef]);
}
```

**Legacy Function**: `useNotifications()` (Kept for Backward Compatibility)
- Still works for simple notification handling
- Uses `router.push()` instead of navigation ref
- Good for foreground-only notifications

#### File: `services/notificationService.ts` (Enhanced)

**New Function**: `getLastNotificationAsync()`
```typescript
export async function getLastNotificationAsync(): Promise<Notifications.Notification | null> {
  const notification = await Notifications.getLastNotificationResponseAsync();
  return notification?.notification ?? null;
}
```

**Used For**: Handling notifications when app launches from killed state

### Complete Navigation Flow

#### Scenario 1: App in Foreground
```
User receives notification
    ↓
App displays notification alert
    ↓
User taps notification
    ↓
addNotificationResponseReceivedListener fires
    ↓
handleNotificationNavigation() called
    ↓
Navigate to chat screen
```

#### Scenario 2: App in Background
```
User receives notification
    ↓
Notification appears in notification center
    ↓
User taps notification
    ↓
App comes to foreground
    ↓
addNotificationResponseReceivedListener fires
    ↓
Navigate to chat screen
```

#### Scenario 3: App Killed / Not Running
```
User receives notification
    ↓
Notification appears in notification center
    ↓
User taps notification
    ↓
App launches from scratch
    ↓
Root layout mounts
    ↓
getLastNotificationAsync() called
    ↓
handleNotificationNavigation() called
    ↓
Navigate to chat screen
```

### Testing Deep Linking

#### Test Notifications Locally
```bash
# Install Ngrok or similar for local testing
npm install -g ngrok

# Start your backend on localhost:3000
# Expose via ngrok
ngrok http 3000

# Send test notification via your API
curl -X POST https://your-ngrok-url.ngrok.io/api/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "title": "Test",
    "body": "Test notification"
  }'
```

#### Test Manual Deep Link
```bash
# iOS
xcrun simctl openurl booted myapp://chat/conv_123

# Android
adb shell am start -a android.intent.action.VIEW -d "myapp://chat/conv_123"
```

#### Test Killed State
```bash
# 1. Foreground the app
# 2. Kill it (force stop on Android, kill on iOS)
# 3. Send notification
# 4. Tap notification
# → App should open and navigate to chat
```

---

## Implementation Checklist

- [x] **Token Cleanup**: DeviceNotRegistered errors now trigger automatic token removal
- [x] **Token Retry**: Invalid tokens are cleaned up, preventing repeated failures
- [x] **Deep Linking**: Complete routing config for all app states
- [x] **Notification Handler**: Unified handler for foreground, background, and killed states
- [x] **Payload Structure**: All necessary data fields included
- [x] **Navigation Safety**: Uses `resetRoot()` for reliable state management

## Additional Files Modified

| File | Changes |
|------|---------|
| `services/pushNotificationSender.ts` | Added error handling, token cleanup |
| `services/messagesService.ts` | Pass recipientUserId to notification sender |
| `services/notificationService.ts` | Added `getLastNotificationAsync()` |
| `app/_layout.tsx` | Deep linking config, initial notification handler |
| `hooks/usePushNotification.tsx` | New `usePushNotificationHandler()` function |
| `utils/notificationNavigation.ts` | New shared navigation utility |

---

## Troubleshooting

### Notification appears but doesn't navigate
1. Check if `chatId` is present in notification data
2. Verify navigation ref is ready: `navigationRef.isReady()`
3. Check console logs for navigation errors
4. Test deep link directly: `adb shell am start -a android.intent.action.VIEW -d "myapp://chat/conv_123"`

### DeviceNotRegistered errors keep appearing
1. Check Firestore console for users with old tokens
2. Verify `recipientUserId` is being passed to `sendPushNotification()`
3. Monitor logs for "Removed invalid token" message
4. Manually clean up old tokens if needed:
```typescript
await removeTokenFromFirebase(userId);
```

### Token not updating after reinstall
1. Verify `registerForPushNotificationsAsync()` is called on app start
2. Check Firebase permissions (Firestore write access)
3. Monitor console for "Token saved to Firebase" message
4. Ensure userId is available before saving

### App crashes on navigation
1. Ensure conversationId matches route param name
2. Verify chat screen exists at `(chat)/[conversationId]`
3. Check that `conversationId` is not null/undefined
4. Test route manually first

---

## Future Enhancements

1. **Token Rotation**: Implement automatic token refresh every 30 days
2. **Analytics**: Track notification delivery and tap rates
3. **Rich Notifications**: Add images/actions to notifications
4. **Notification Grouping**: Group messages from same user
5. **Silent Notifications**: Handle data-only notifications for syncing

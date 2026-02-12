# Push Notifications Implementation Reference

Quick reference for the implementation code and common patterns.

## Token Management

### Option 1: Auto-Save Token on App Start (Recommended)

**Place in root layout or main provider:**

```typescript
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { registerForPushNotificationsAsync, getLastNotificationAsync } from '@/services/notificationService';
import { saveTokenToFirebase } from '@/services/firebaseService';
import { handleNotificationNavigation } from '@/utils/notificationNavigation';

export function NotificationSetup() {
  const { userId } = useAuth();
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Register and save token on app start
    registerForPushNotificationsAsync().then(async (token) => {
      if (token && userId) {
        console.log('📱 Saving token to Firebase:', token.slice(0, 20) + '...');
        await saveTokenToFirebase(userId, token);
      }
    });

    // Handle cold start from notification
    (async () => {
      const notification = await getLastNotificationAsync();
      if (notification?.request.content.data && navigationRef?.isReady?.()) {
        const data = notification.request.content.data;
        handleNotificationNavigation(data, navigationRef);
      }
    })();
  }, [userId, navigationRef]);
}
```

### Option 2: Manual Token Refresh

```typescript
// Refresh token on demand
async function refreshPushToken(userId: string) {
  const newToken = await registerForPushNotificationsAsync();
  if (newToken) {
    await saveTokenToFirebase(userId, newToken);
    console.log('✅ Token refreshed');
  }
}

// Call when:
// - User logs in
// - App launches
// - User manually requests refresh
```

### Option 3: Listen for Token Changes

```typescript
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';

export function useTokenRefresh(userId: string) {
  useEffect(() => {
    // Some Expo versions emit token refresh events
    const subscription = Notifications.addNotificationSubscription((event) => {
      const newToken = (event.notification.request.content.data as any)?.newToken;
      if (newToken) {
        saveTokenToFirebase(userId, newToken);
      }
    });

    return () => subscription.remove();
  }, [userId]);
}
```

---

## Error Handling

### DeviceNotRegistered Error Cleanup

**Already implemented in `pushNotificationSender.ts`, but here's the pattern:**

```typescript
// Detect error in receipt
if (receipt.details?.error === 'DeviceNotRegistered') {
  console.warn('❌ Device token invalid. Cleaning up...');
  
  // Remove stale token from Firestore
  if (recipientUserId) {
    await handleDeviceNotRegistered(recipientUserId);
  }
}

// Implementation
async function handleDeviceNotRegistered(recipientUserId: string): Promise<void> {
  try {
    const { removeTokenFromFirebase } = await import('./firebaseService');
    await removeTokenFromFirebase(recipientUserId);
    console.log(`✅ Removed invalid token for ${recipientUserId}`);
  } catch (error) {
    console.error('Failed to remove token:', error);
  }
}
```

### Other Push Notification Errors

```typescript
// In checkReceiptsAfterDelay()
Object.entries(receipts).forEach(([ticketId, receipt]) => {
  if (receipt.status === 'error') {
    const errorCode = receipt.details?.error;
    
    switch (errorCode) {
      case 'DeviceNotRegistered':
        handleDeviceNotRegistered(recipientUserId);
        break;
      
      case 'InvalidCredentials':
        console.error('FCM credentials invalid - check EAS config');
        break;
      
      case 'MessageTooBig':
        console.error('Notification payload exceeds size limit');
        break;
      
      case 'MissingRegistration':
        console.error('Token not provided or invalid format');
        break;
      
      default:
        console.error(`Unknown error: ${errorCode}`);
    }
  }
});
```

---

## Notification Routing

### Complete Notification Data Structure

```typescript
// Good ✅
const notificationData = {
  messageId: 'msg_123',      // Unique message identifier
  chatId: 'chat_456',         // Conversation ID
  senderId: 'user_789',       // Sender's user ID
  senderName: 'John',        // Sender's display name
  type: 'message',           // Notification type
  // Optional fields
  messageId: 'msg_123',       // For deep linking to specific message
  threadId: 'thread_456',     // For threaded discussions
};

// Minimal ✅
const notificationData = {
  chatId: 'chat_456',
  senderId: 'user_789',
};

// Not recommended ❌
const notificationData = {
  title: 'Message from John',  // Use title field instead
  message: 'Hi there!',        // Use body field instead
};
```

### Navigation from Different App States

**Already implemented, but here's the complete pattern:**

```typescript
// Kill State: App launches when user taps notification
export useEffect(() => {
  const handleInitialNotification = async () => {
    const notification = await getLastNotificationAsync();
    
    if (!notification) {
      console.log('No initial notification');
      return;
    }

    const data = notification.request.content.data;
    console.log('🎯 Initial notification:', data);
    
    // Wait for navigation to be ready
    if (navigationRef?.isReady?.()) {
      handleNotificationNavigation(data, navigationRef);
    }
  };

  // Slight delay to let navigation initialize
  const timer = setTimeout(handleInitialNotification, 500);
  return () => clearTimeout(timer);
}, [navigationRef]);

// Background/Foreground State: App is running
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data;
  console.log('👆 Notification tapped:', data);
  handleNotificationNavigation(data, navigationRef);
});
```

### Screen Parameter Passing

```typescript
// Chat screen receives params:
// Route params from notification:
{
  conversationId: 'uid_a_uid_b',  // From chatId
  otherUid: 'uid_b',              // From senderId
  messageId: 'msg_123',           // Optional, from messageId
}

// Use in component:
export function ChatScreen({ route }) {
  const { conversationId, otherUid, messageId } = route.params;

  // Load conversation
  useEffect(() => {
    loadConversation(conversationId);
    
    // Scroll to specific message if provided
    if (messageId) {
      scrollToMessage(messageId);
    }
  }, [conversationId, messageId]);

  return <ChatThread {...} />;
}
```

---

## Testing

### Unit Test: Token Cleanup

```typescript
import { describe, it, expect, jest } from '@jest/globals';

describe('handleDeviceNotRegistered', () => {
  it('should remove invalid token from Firestore', async () => {
    const removeTokenSpy = jest.spyOn(firebaseService, 'removeTokenFromFirebase');
    
    await handleDeviceNotRegistered('user_123');
    
    expect(removeTokenSpy).toHaveBeenCalledWith('user_123');
  });

  it('should catch and log errors', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');
    jest.spyOn(firebaseService, 'removeTokenFromFirebase')
      .mockRejectedValueOnce(new Error('Network error'));
    
    await expect(handleDeviceNotRegistered('user_123'))
      .rejects.toThrow('Network error');
    
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
```

### Integration Test: End-to-End Notification

```typescript
describe('Push Notification Flow', () => {
  it('should navigate to chat on notification tap', async () => {
    // 1. Create test user and conversation
    const userId = 'user_123';
    const otherUserId = 'user_456';
    const conversationId = getConversationId(userId, otherUserId);

    // 2. Get push token
    const token = await registerForPushNotificationsAsync();

    // 3. Send message and notification
    const messageRes = await sendMessage(
      conversationId,
      userId,
      'Test message'
    );

    // 4. Simulate notification tap
    const notificationData = {
      chatId: conversationId,
      senderId: userId,
      messageId: messageRes.id,
    };

    // 5. Verify navigation
    const navigationRef = createNavigationRef();
    handleNotificationNavigation(notificationData, navigationRef);
    
    expect(navigationRef.getCurrentRoute()?.name).toBe('[conversationId]');
    expect(navigationRef.getCurrentRoute()?.params?.conversationId)
      .toBe(conversationId);
  });
});
```

### Manual Testing Checklist

```
[ ] App Foreground
    [ ] Send notification
    [ ] App displays alert
    [ ] Tap notification
    [ ] Navigate to chat ✅

[ ] App Background
    [ ] Send notification
    [ ] Notification in center
    [ ] Tap notification
    [ ] App comes to foreground
    [ ] Navigate to chat ✅

[ ] App Killed
    [ ] Send notification
    [ ] Notification in center
    [ ] Tap notification
    [ ] App launches
    [ ] Navigate to chat ✅

[ ] After Uninstall & Reinstall
    [ ] Uninstall app
    [ ] Reinstall app
    [ ] New token saved ✅
    [ ] Old token removed ✅
    [ ] Notification works ✅

[ ] Token Error Cases
    [ ] Send to uninstalled user
    [ ] Check logs for DeviceNotRegistered ✅
    [ ] Verify token removed from Firestore ✅
    [ ] Retry send to same user
    [ ] No DeviceNotRegistered error ✅
```

---

## Debugging

### Enable Verbose Logging

```typescript
// Add to root layout for development
if (__DEV__) {
  const originalWarn = console.warn;
  const originalError = console.error;
  
  console.warn = (...args) => {
    originalWarn('[WARN]', ...args);
  };
  
  console.error = (...args) => {
    originalError('[ERROR]', ...args);
  };
}
```

### Check Notification Payload

```typescript
// In getMessages or chat screen
const logNotificationPayload = (message) => {
  const payload = {
    messageId: message.id,
    chatId: conversationId,
    senderId: message.senderId,
    text: message.text,
  };
  console.log('📤 Would send notification:', JSON.stringify(payload, null, 2));
};
```

### Verify Firestore Tokens

```typescript
// In Firebase console or via SDK
const userDoc = await getDoc(doc(db, 'users', userId));
console.log('User push token:', userDoc.data()?.pushToken);

// Batch check all users with tokens
const users = await getDocs(
  query(collection(db, 'users'), where('pushToken', '!=', null))
);
console.log(`Found ${users.docs.length} users with tokens`);
```

### Monitor Receipts

```typescript
// Receipt status reference
receipt.status === 'ok'     // ✅ Delivered
receipt.status === 'error'  // ❌ Failed

// Common receipt errors
receipt.details?.error === 'DeviceNotRegistered'   // Token invalid
receipt.details?.error === 'InvalidCredentials'    // FCM config
receipt.details?.error === 'MessageTooBig'         // Payload > 4KB
receipt.details?.error === 'MissingRegistration'   // Invalid token format
receipt.details?.error === 'MessageRateExceeded'   // Too many messages
```

---

## Performance Optimization

### Batch Send Notifications

```typescript
// Don't: Send individually
for (const userId of userIds) {
  await sendPushNotification(token, data);  // Slow!
}

// Do: Batch processing
const results = await Promise.allSettled(
  userIds.map(userId => sendPushNotification(token, data))
);

// Check results
results.forEach((result, index) => {
  if (result.status === 'rejected') {
    console.error(`Failed for user ${userIds[index]}:`, result.reason);
  }
});
```

### Optimize Payload Size

```typescript
// Don't: Send full message object
const payload = {
  data: {
    ...entireUserObject,  // Too big!
    ...entireMessageObject,
  }
};

// Do: Send only essential fields
const payload = {
  data: {
    messageId: message.id,
    chatId: conversationId,
    senderId: sender.id,
    type: 'message',
  }
};
// Max payload: 4KB
```

### Cache Navigation Configuration

```typescript
// Don't: Create linking config on every render
const MyComponent = () => {
  const linking = {  // Created every time!
    prefixes: ['myapp://'],
    config: { /* ... */ }
  };
  
  return <Stack linking={linking} />;
};

// Do: Create once outside component
const LINKING_CONFIG = {
  prefixes: ['myapp://'],
  config: { /* ... */ }
};

export default function App() {
  return <Stack linking={LINKING_CONFIG} />;
}
```

---

## Common Issues & Solutions

### Issue: "Notification didn't navigate"

```typescript
// ✅ Check 1: Data structure
console.log('Notification data:', response.notification.request.content.data);
// Should have: { chatId: 'xxx', senderId: 'yyy' }

// ✅ Check 2: Navigation ref ready
if (!navigationRef.isReady?.()) {
  console.error('Navigation ref not ready');
}

// ✅ Check 3: Valid route
// Ensure route exists: (chat)/[conversationId]

// ✅ Check 4: Params passed correctly
navigationRef.resetRoot({
  routes: [{
    name: '(chat)',
    state: {
      routes: [{
        name: '[conversationId]',
        params: {
          conversationId: data.chatId,  // Must match route param name
        }
      }]
    }
  }]
});
```

### Issue: "Token keeps failing with DeviceNotRegistered"

```typescript
// ✅ Check 1: recipientUserId passed
await sendPushNotification(recipientToken, {
  // ...
  recipientUserId: recipientId  // Must be present!
});

// ✅ Check 2: Token removed from DB
const userDoc = await getDoc(doc(db, 'users', userId));
console.log('Push token after cleanup:', userDoc.data().pushToken);  
// Should be null or undefined

// ✅ Check 3: Manual cleanup if needed
await removeTokenFromFirebase(userId);
```

### Issue: "App crashes on notification tap"

```typescript
// ✅ Check: conversationId is valid
if (!data.chatId) {
  console.error('No chatId in notification data, returning early');
  return;
}

// ✅ Check: params match screen props
// Screen expects: { conversationId, otherUid }
params: {
  conversationId: data.chatId,  // Must match!
  otherUid: data.senderId,
}

// ✅ Check: error boundary
<ErrorBoundary fallback={<Error />}>
  <ChatScreen />
</ErrorBoundary>
```

---

## Reference: Complete Notification Flow

```
┌─────────────────────────────────────────┐
│  1. User sends message                  │
│  sendMessage(conversationId, text)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  2. Get recipient's token               │
│  getRecipientToken(recipientId)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  3. Send notification to Expo API       │
│  sendPushNotification(token, data)      │
│  data = { chatId, senderId, ... }      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  4. Get ticket IDs from response        │
│  tickets[].id                           │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  5. Poll receipts (2s delay)            │
│  checkReceiptsAfterDelay(ticketIds)     │
└──────────────┬──────────────────────────┘
               │
               ├─ Delivered ✅
               │
               ├─ Failed (DeviceNotRegistered) 
               │  └─ handleDeviceNotRegistered()
               │     └─ removeTokenFromFirebase()
               │
               └─ Pending (retry)
                  └─ Poll again (up to 3x)
                  
┌─────────────────────────────────────────┐
│  6. Notification delivered to device    │
│  Displayed in notification center       │
└──────────────┬──────────────────────────┘
               │
               ▼ User taps notification
               │
┌─────────────────────────────────────────┐
│  7. Notification response handler       │
│  addNotificationResponseReceivedListener │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  8. Navigate to chat screen             │
│  handleNotificationNavigation()          │
│  navigationRef.resetRoot({              │
│    routes: [{ name: '(chat)',           │
│      state: { routes: [{                │
│        name: '[conversationId]'         │
│      }]}                                │
│    }]                                   │
│  })                                     │
└─────────────────────────────────────────┘
```

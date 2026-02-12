# Complete Push Notification System Guide

## Overview

This guide covers:
- ✅ Firestore data structure for notifications
- ✅ Frontend token registration
- ✅ Backend notification sending
- ✅ Deep linking and navigation
- ✅ Error handling and logging
- ✅ Common issues and solutions

---

## 1️⃣ Firestore Data Structure

### Collections Layout

```
users/
  ├── {userId}/
  │   ├── pushToken: string
  │   ├── lastUpdated: timestamp
  │   └── notifications/ (sub-collection)
  │       └── {notificationId}
  │           ├── recipientId: string (who receives)
  │           ├── senderId: string (who sent message)
  │           ├── senderName: string (cached for display)
  │           ├── messageId: string
  │           ├── conversationId: string
  │           ├── messagePreview: string (first 100 chars)
  │           ├── isRead: boolean
  │           └── createdAt: number (timestamp)
  │
  └── ...

conversations/ (existing)
  ├── {conversationId}
  │   ├── participants: [uid1, uid2]
  │   ├── lastMessage: {...}
  │   ├── unreadCount: {uid1: 0, uid2: 1}
  │   ├── updatedAt: number
  │   └── messages/ (sub-collection)
  │       └── ...
  │
  └── ...
```

### Create Index (if needed)

In Firebase Console → Firestore → Indexes:
- Collection: `users/{userId}/notifications`
- Fields: `createdAt (Descending)`, `isRead (Ascending)`

---

## 2️⃣ Frontend Implementation

### A. Push Token Registration

**Location:** `services/notificationService.ts`

```typescript
// This function runs on app startup/login
export async function registerForPushNotificationsAsync(): Promise<string | undefined> {
  // 1. Check if it's a physical device
  if (!Device.isDevice) {
    console.warn('Must use physical device for push notifications');
    return undefined;
  }

  // 2. Request notification permissions
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

  // 3. Get the projectId from eas.json or app.json
  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.error('EAS projectId not configured');
    return undefined;
  }

  // 4. Request Expo push token
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log('✅ Expo push token:', token);
    return token;
  } catch (err) {
    console.error('Failed to get push token:', err);
    return undefined;
  }
}
```

### B. Save Token to Firestore

**Location:** `services/firebaseService.ts`

```typescript
export async function saveTokenToFirebase(userId: string, token: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        pushToken: token,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true } // Don't overwrite other user fields
    );
    console.log('✅ Token saved to Firestore');
  } catch (error) {
    console.error('Error saving token:', error);
  }
}
```

### C. Hook Integration

**Location:** `hooks/usePushNotification.tsx`

```typescript
export function useNotifications(userId: string | null) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const router = useRouter();

  useEffect(() => {
    // Register on mount/login
    registerForPushNotificationsAsync().then((token) => {
      if (token && userId) {
        setExpoPushToken(token);
        saveTokenToFirebase(userId, token);
      }
    });

    // Handle notification tap → navigate to chat
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      
      if (data?.chatId) {
        router.push({
          pathname: '/(chat)/[conversationId]',
          params: { conversationId: data.chatId, otherUid: data.senderId },
        });
      }
    });

    return () => responseListener.remove();
  }, [userId]);

  return { expoPushToken };
}
```

### D. Configure app.json or app.config.js

Make sure your EAS projectId is configured:

```json
{
  "expo": {
    "slug": "usapplang",
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id-here"
      }
    },
    "plugins": [
      ["expo-notifications", { "sounds": ["default"] }]
    ]
  }
}
```

Get your projectId from:
```bash
eas project info
```

---

## 3️⃣ Notification History UI

### NotificationsHistory Component

**Location:** `components/NotificationsHistory.tsx`

Features:
- ✅ Displays list of notifications with sender name, message preview, timestamp
- ✅ Shows unread indicator (blue dot)
- ✅ Mark as read on tap
- ✅ Navigate to chat conversation
- ✅ Delete individual notifications
- ✅ Real-time updates via Firestore listener
- ✅ Refresh pull-down support

### Notifications Screen

**Location:** `app/(tabs)/notifications.tsx`

- Shows the notification history
- Integrated into Settings tab

---

## 4️⃣ Message Sending Flow

When user A sends a message to user B:

**Location:** `services/messagesService.ts`

```typescript
export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<Message> {
  // 1. Save message to Firestore
  const ref = await addDoc(messagesRef(conversationId), msg);

  // 2. Update conversation doc
  await updateDoc(convoRef, {
    lastMessage: { text, senderId, timestamp },
    updatedAt: now,
    [`unreadCount.${otherUid}`]: increment(1),
  });

  // 3. Create notification document
  await createNotification(
    otherUid,           // recipient
    senderId,           // sender
    senderName,         // cached for display
    ref.id,             // message id
    conversationId,     // conversation id
    text                // full message text
  );

  // 4. Send push notification (fire and forget)
  await sendPushNotificationToRecipient(otherUid, ref.id, conversationId, senderId, senderName, text);

  return message;
}
```

---

## 5️⃣ Backend (Node.js + Firebase Admin)

### Setup Firebase Admin

```typescript
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(require('./serviceAccountKey.json')),
});

const db = admin.firestore();
```

### Send Notification Endpoint

```typescript
import express from 'express';
import { sendNotification } from './services/notifications';

const app = express();
app.use(express.json());

app.post('/api/messages/send', async (req, res) => {
  const { recipientId, senderId, senderName, text, conversationId, messageId } = req.body;

  try {
    // 1. Save message to Firestore (your code)
    // const messageRef = await db.collection('conversations').doc(conversationId)
    //   .collection('messages').add({...});

    // 2. Create notification in Firestore (optional if done on frontend)
    // await db.collection('users').doc(recipientId).collection('notifications').add({...});

    // 3. Send push notification
    await sendNotification(recipientId, {
      messageId,
      chatId: conversationId,
      senderId,
      senderName,
      text,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

### sendNotification Function

**See:** `docs/BACKEND_NOTIFICATION_SETUP.ts`

Key points:
- ✅ Gets recipient's push token from Firestore
- ✅ Sends to Expo Push API
- ✅ Checks ticket responses for immediate errors
- ✅ Calls getReceipts after 2 seconds to verify delivery
- ✅ Logs all responses for debugging
- ✅ Handles DeviceNotRegistered errors

---

## 6️⃣ Push Notification Payload

### What Gets Sent to Expo

```typescript
{
  "to": "ExponentPushToken[...]",           // recipient's token
  "sound": "default",
  "title": "John Smith",                    // sender name
  "body": "Hey! How are you doing?",        // message preview (max 100 chars)
  "data": {
    "messageId": "msg123",
    "chatId": "convo_456",
    "senderId": "user_789",
    "type": "message"
  },
  "priority": "high",
  "channelId": "default",
  "badge": 1
}
```

---

## 7️⃣ Error Handling & Logging

### Ticket Response (Immediate)

After sending, Expo responds with:

```typescript
{
  "data": [
    {
      "id": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",  // ticket ID
      "status": "ok"
    }
  ]
}
```

Or error:
```typescript
{
  "data": [
    {
      "status": "error",
      "code": "INVALID_CREDENTIALS",
      "message": "Invalid credentials..."
    }
  ]
}
```

**Common errors:**
- `InvalidCredentials` → Invalid Expo project
- `MissingExponentPushToken` → null token
- `DeviceNotRegistered` → Token no longer valid

### Receipt Response (2-3 seconds later)

```typescript
{
  "data": {
    "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX": {
      "status": "ok"   // successfully delivered
    },
    "YYYYYYYY-YYYY-YYYY-YYYY-YYYYYYYYYYYY": {
      "status": "error",
      "message": "Device could not be reached",
      "details": {
        "error": "DeviceNotRegistered"
      }
    }
  }
}
```

**Receipt statuses:**
- `ok` → message delivered to device
- `error` → delivery failed (check `details.error`)

---

## 8️⃣ Debugging Checklist

### ✅ Frontend Token Registration

- [ ] Device is physical (simulator won't register tokens)
- [ ] User granted notification permissions (check System Settings)
- [ ] `Constants.expoConfig?.extra?.eas?.projectId` is set in app config
- [ ] Token is printed in console logs
- [ ] Token is saved to Firestore under `users/{uid}/pushToken`
- [ ] Token doesn't change on every app restart (should persist)

### ✅ Token Verification

- [ ] Copy token from app and test on https://expo.dev/notifications
- [ ] If manual test works, token is valid
- [ ] Compare token used by backend with token in app (must match exactly)

### ✅ Backend Sending

- [ ] Firestore token lookup succeeds
- [ ] HTTP request to `https://exp.host/--/api/v2/push/send` returns 200
- [ ] Response contains `status: "ok"` in ticket
- [ ] No `code: "InvalidCredentials"` error
- [ ] Receipts check shows `status: "ok"` (not `DeviceNotRegistered`)

### ✅ Device Display

- [ ] Notification preferences enabled (Settings → Notifications → App)
- [ ] Do Not Disturb is off
- [ ] App isn't in foreground (notification won't show if app is open in iOS; Android shows banner)
- [ ] Check device notification history (swipe down on Android, swipe up on iOS)

### ✅ Navigation

- [ ] Notification tap handler calls `router.push()` with correct conversation ID
- [ ] Deep link parameters are correct (`conversationId`, `otherUid`)
- [ ] Chat screen loads and displays correct conversation

---

## 9️⃣ Common Issues & Solutions

### 🔴 Token is `undefined` or `null`

**Causes:**
1. Using simulator instead of real device
2. User denied notification permissions
3. EAS projectId not configured

**Solutions:**
- Use physical device
- Ask user to enable notifications in System Settings
- Set `Constants.expoConfig?.extra?.eas?.projectId` in app.json

### 🔴 Notifications work on expo.dev but not in app

**Causes:**
1. Backend using different/old token
2. Tokens from different Expo projects mixed
3. Token expired after app reinstall

**Solutions:**
- Log token on device and verify it's the same one backend sends to
- Ensure app uses same EAS projectId for all builds
- Update token when user logs in (always re-register)

### 🔴 "Invalid Expo Push Token" error

**Causes:**
1. Token is null or empty
2. Token has wrong format
3. Token is for a different Expo project

**Solutions:**
- Check `getRecipientToken()` returns valid token
- Verify format: should start with `ExponentPushToken[`
- Confirm EAS projectId matches

### 🔴 "DeviceNotRegistered" receipt error

**Cause:** Token is stale (user reinstalled app, logged out, or uninstalled)

**Solution:** Remove or refresh the token
```typescript
// On login:
const token = await registerForPushNotificationsAsync();
if (token) {
  await saveTokenToFirebase(userId, token);
}

// On logout:
await removeTokenFromFirebase(userId);
```

### 🔴 Notification doesn't navigate to chat

**Causes:**
1. Notification tap handler not called
2. `router.push()` not working
3. Wrong conversation ID in payload

**Solutions:**
- Check `Notifications.addNotificationResponseReceivedListener` is set up
- Verify ChatScreen can load with passed parameters
- Log `data.chatId` and `data.senderId` in tap handler

### 🔴 Notifications appear as read immediately

**Cause:** Not marking as read in UI handler on tap

**Solution:** UI component already calls `markNotificationRead()` on tap

---

## 🔟 Production Checklist

- [ ] EAS projectId is set and consistent across builds
- [ ] Firebase rules allow token read/write for authenticated users
- [ ] Backend has correct Firebase credentials (serviceAccountKey.json)
- [ ] Backend can reach `https://exp.host` (no firewall blocks)
- [ ] Implement token refresh on user login/logout
- [ ] Handle expired tokens (DeviceNotRegistered)
- [ ] Log all Expo ticket and receipt responses
- [ ] Monitor failed notifications and alert on issues
- [ ] Test with both foreground and background states
- [ ] Test with app killed state (using deep link)

---

## 📋 File Reference

| File | Purpose |
|------|---------|
| `services/notificationService.ts` | Frontend token registration |
| `services/firebaseService.ts` | Token storage/retrieval |
| `services/notificationsService.ts` | Notification CRUD |
| `services/pushNotificationSender.ts` | Expo API integration with logging |
| `services/messagesService.ts` | Message flow + notification creation |
| `hooks/usePushNotification.tsx` | Token + navigation handler |
| `components/NotificationsHistory.tsx` | Notification UI component |
| `app/(tabs)/notifications.tsx` | Notifications screen |
| `types/models.ts` | Notification interface |
| `docs/BACKEND_NOTIFICATION_SETUP.ts` | Backend example code |

---

## 🆘 Quick Support

**Token not registering?**
```typescript
// Check in notificationService.ts
console.log('Token:', token);
console.log('ProjectID:', Constants.expoConfig?.extra?.eas?.projectId);
```

**Push not arriving?**
```typescript
// Check in pushNotificationSender.ts logs
// Should see: 📤 Sending → 🎫 Tickets → 📋 Receipts
```

**Navigation not working?**
```typescript
// Check in usePushNotification.tsx
console.log('Notification data:', data);
console.log('Navigate to:', conversationId);
```


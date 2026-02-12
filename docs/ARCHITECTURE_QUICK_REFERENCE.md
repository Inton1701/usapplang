# Notification System Architecture & Quick Reference

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER A SENDS MESSAGE TO USER B                      │
└─────────────────────────────────────────────────────────────────────────────┘

1. FRONTEND (User A)
   ├─ sendMessage(conversationId, senderId, text)
   │  ├─1. Save message → Firestore messages collection
   │  ├─2. Update conversation → lastMessage, updatedAt
   │  ├─3. Create notification doc → users/B/notifications/{id}
   │  └─4. Send push notification (fire-and-forget)
   │
   └─> Gets sender name from Firestore (users/senderId)

2. PUSH NOTIFICATION SENDING (Frontend or Backend)
   ├─ Lookup recipient token → Firestore users/B/pushToken
   ├─ POST to https://exp.host/--/api/v2/push/send
   │  └─ Payload: { to: token, title: senderName, body: messagePreview, data: {...} }
   ├─ Check response tickets for errors
   ├─ Extract ticket IDs
   └─ [ASYNC] Check receipts after 2 seconds

3. DEVICE (User B)
   ├─ Receives push notification
   ├─ Shows in notification center
   │
   └─> User taps notification
       ├─ Trigger: Notifications.addNotificationResponseReceivedListener
       ├─ Extract: notification.request.content.data
       ├─ Navigate: router.push(/(chat)/[conversationId])
       └─ Mark notification as read

4. NOTIFICATION HISTORY (User B's Device)
   ├─ Open Settings → Notifications
   ├─ Fetch: users/B/notifications (ordered by createdAt desc)
   ├─ Display: sender name, message preview, timestamp, unread status
   ├─ Tap: navigate to chat + mark as read
   └─ Delete: remove from collection

┌─────────────────────────────────────────────────────────────────────────────┐
│                          STATES OF A NOTIFICATION                          │
└─────────────────────────────────────────────────────────────────────────────┘

Created on User A's device when message is sent
        ↓
Stored in Firestore (users/B/notifications)
        ↓
Push sent to Expo API
        ↓
Notification appears in User B's device notification center
        ↓
User B taps it
        ↓
App opens / navigates to chat conversation
        ↓
Marked as read in Firestore
```

---

## Component Tree

```
App Layout
 └─ Providers (Auth, Notifications, Toast, etc.)
    └─ Stack Navigation
       ├─ (auth) — login/signup
       ├─ (tabs) — main app
       │  ├─ contacts
       │  ├─ settings
       │  │  └─ Notifications tab
       │  │     └─ NotificationsHistory component
       │  │        ├─ FlatList of notifications
       │  │        ├─ Each item shows:
       │  │        │  ├─ Sender avatar
       │  │        │  ├─ Sender name
       │  │        │  ├─ Message preview
       │  │        │  ├─ Timestamp
       │  │        │  ├─ Unread indicator (blue dot)
       │  │        │  └─ Delete button
       │  │        └─ Tap → navigate to chat + mark read
       │  └─ notifications (new screen)
       │
       └─ (chat) — conversation screen
          └─ [conversationId] (dynamic route)
             └─ Opened via notification deep link
```

---

## Service Layers

### Frontend Services

```typescript
// notificationService.ts
registerForPushNotificationsAsync()
  ↓ (requests permissions, gets token from Expo)
  ↓
saveTokenToFirebase(userId, token)
  ↓ (stores in users/{userId}/pushToken)
  ↓
// On login/app start
getRecipientToken(userId)
  ↓ (retrieves from Firestore)
  ↓
sendPushNotification(token, messageData)
  ↓ (sends to Expo API, checks tickets + receipts)
```

### Notification CRUD

```typescript
// notificationsService.ts
createNotification(...)
  ├─ Saves to users/{recipientId}/notifications/{id}
  └─ Called when message is sent

getNotifications(userId, pageParam)
  ├─ Fetches paginated notifications
  └─ Ordered by createdAt DESC

markNotificationRead(userId, notificationId)
  └─ Sets isRead = true

onNotificationsSnapshot(userId, callback)
  └─ Real-time listener for notification changes

deleteNotification(userId, notificationId)
  └─ Removes from collection
```

---

## Data Flow Example

### Scenario: User A sends "Hey!" to User B

**Time: T=0ms — Message is sent**
```
Frontend (A) sends message:
  POST /messages/send { conversationId, senderId, text: "Hey!" }

Server creates:
  ├─ messages collection entry
  ├─ updates conversation { lastMessage, updatedAt, unreadCount }
  ├─ calls sendNotification(B's userId, messageData)
  │  └─ creates users/B/notifications/{id} with:
  │     ├─ recipientId: "B"
  │     ├─ senderId: "A"
  │     ├─ senderName: "Alice"
  │     ├─ messagePreview: "Hey!"
  │     ├─ isRead: false
  │     └─ createdAt: T+0ms
  │
  └─ sendPushToExpo({ to: B's token, title: "Alice", body: "Hey!" })
     ├─ HTTP 200 ✅
     └─ Sends ticket ID: "ticket-123"
```

**Time: T=2000ms — Expo generates receipt**
```
checkReceipts(["ticket-123"]):
  ├─ Calls getReceipts API
  ├─ Sees status: "ok" → delivery confirmed
  └─ Logs: "✅ Ticket ticket-123: Delivered"
```

**Time: T=5000ms — Notification appears on B's device**
```
B's device receives push:
  ├─ Shows notification in notification center
  ├─ Audio + vibration (if enabled)
  └─ Badge on app icon

B sees: [Alice] "Hey!"
B taps notification:
  ├─ Triggers: Notifications.addNotificationResponseReceivedListener
  ├─ Extracts: data.chatId, data.senderId
  ├─ Navigation: router.push(/(chat)/conversationId)
  ├─ Chat screen loads with A
  └─ Marks notification as read:
     └─ users/B/notifications/{id} → isRead: true

B opens Settings → Notifications:
  ├─ Fetches users/B/notifications (ordered DESC)
  ├─ Shows notification in history (without blue dot now)
  └─ B can tap to go back to chat
```

---

## Quick Reference: File Locations

| Feature | File | Function |
|---------|------|----------|
| **Register Token** | `services/notificationService.ts` | `registerForPushNotificationsAsync()` |
| **Save Token** | `services/firebaseService.ts` | `saveTokenToFirebase(userId, token)` |
| **Get Token** | `services/firebaseService.ts` | `getRecipientToken(userId)` |
| **Create Notification** | `services/notificationsService.ts` | `createNotification(...)` |
| **Get Notifications** | `services/notificationsService.ts` | `getNotifications(userId)` |
| **Mark as Read** | `services/notificationsService.ts` | `markNotificationRead(userId, notifId)` |
| **Send Push** | `services/pushNotificationSender.ts` | `sendPushNotification(token, data)` |
| **Handle Tap** | `hooks/usePushNotification.tsx` | Inside `responseListener` callback |
| **UI Component** | `components/NotificationsHistory.tsx` | `NotificationsHistory` component |
| **Notifications Screen** | `app/(tabs)/notifications.tsx` | Default export |
| **Backend Example** | `docs/BACKEND_NOTIFICATION_SETUP.ts` | `sendNotification(recipientId, data)` |

---

## Quick Copy-Paste Debug Commands

### Check token in Settings
Settings tab → Settings screen → see "Push Notification Token" in dev mode

### Test manual push
```
Go to: https://expo.dev/notifications
Paste: [token from settings]
Send: Test notification
```

### Check Firestore token
```
Firebase Console → Firestore
Collection: users/{yourUserId}
Field: pushToken
```

### Check created notification
```
Firebase Console → Firestore
Collection: users/{B's userId}
Sub-collection: notifications
See: recent notification document
```

### Check logs on device
```
Android: adb logcat | grep "✅\|❌\|📤\|🎫\|👆\|🔗"
iOS: Xcode → Console → filter by app name
```

### Check backend logs
```
Node.js: console.log statements should log Expo responses
Look for: ticket IDs, receipt status, error messages
```

---

## Environment Setup

### Required

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id-from-eas-project-info"
      }
    },
    "plugins": ["expo-notifications"]
  }
}
```

### Firebase Rules (Firestore)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
      
      match /notifications/{notificationId} {
        allow read, write: if request.auth.uid == userId;
        allow delete: if request.auth.uid == userId;
      }
    }
    
    match /conversations/{conversationId} {
      allow read, write: if request.auth.uid in resource.data.participants;
      
      match /messages/{messageId} {
        allow read, write: if request.auth.uid in get(/databases/$(database)/documents/conversations/$(conversationId)).data.participants;
      }
    }
  }
}
```

---

## Troubleshooting Matrix

| Problem | What to Check | Where | Fix |
|---------|---------------|-------|-----|
| Token is `undefined` | EAS projectId | `app.json` | Add valid projectId |
| expo.dev works, app doesn't | Token mismatch | Settings vs backend logs | Verify same token used |
| No notification arrives | Device permissions | iOS/Android settings | Grant notifications permission |
| Notification doesn't navigate | Deep link params | `usePushNotification.tsx` logs | Check `chatId` in data |
| "Invalid Expo Push Token" | Token format/validity | Firestore `pushToken` field | Reinstall app, re-register token |
| Notification tap not called | Listener setup | `usePushNotification.tsx` | Verify `addNotificationResponseReceivedListener` is called |
| Receipt shows "DeviceNotRegistered" | Token stale | Timeout after device reinstall | Logout/login to refresh token |

---

## Performance Tips

1. **Token Registration**: ~500ms (once on app launch)
2. **Push Sending**: ~100ms (HTTP + Firestore read/write)
3. **Receipt Check**: 2000ms delay (Expo needs time to generate)
4. **Notification History**: ~50-100ms per page (depends on device)
5. **Deep Link Navigation**: Near instant if conversation already loaded

Optimize by:
- Caching tokens
- Batching notification sends (if backend)
- Using WebSocket for real-time in chat
- Pagination for large notification lists (already implemented)

---

## Security Considerations

1. **Never store tokens in localStorage** — use Firestore with auth rules
2. **Validate sender before sending push** — prevent spam
3. **Check user ownership** — ensure only recipient gets their notifications
4. **Rate limit** — cap push notifications per user/day
5. **Filter sensitive text** — don't include passwords/secrets in preview
6. **Use HTTPS** — all API calls use https://exp.host
7. **Auth in backend** — require Firebase auth token for sending

---

## Next: Production Monitoring

Once deployed:
- [ ] Monitor Expo ticket error rates
- [ ] Alert on high DeviceNotRegistered rates
- [ ] Track notification delivery time
- [ ] Log receipt statuses
- [ ] Monitor app deep link failures
- [ ] Test on different devices/OS versions
- [ ] Plan token refresh strategy
- [ ] Handle opt-out of notifications

All set! 🎉


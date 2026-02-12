# Push Notification System - Complete Architecture Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Firebase Structure](#firebase-structure)
3. [Data Flow and Lifecycle](#data-flow-and-lifecycle)
4. [Component Architecture](#component-architecture)
5. [Integration Points](#integration-points)
6. [Error Handling and Recovery](#error-handling-and-recovery)
7. [Token Management](#token-management)
8. [Notification Payload](#notification-payload)
9. [Sequence Diagrams](#sequence-diagrams)
10. [Testing Guide](#testing-guide)

---

## System Overview

The push notification system enables real-time message delivery to users across all app states (foreground, background, killed). It integrates Firebase Firestore for data persistence, Expo Push Service for delivery, and React Native notifications for user interactions.

### Key Components
- **Expo Push Service**: Cloud service that delivers push notifications to devices
- **Firebase Firestore**: Stores conversations, messages, tokens, and notification history
- **Push Notification Handler**: Listens for user interactions with notifications
- **Token Manager**: Manages device tokens across app lifecycle
- **Receipt Checker**: Verifies delivery status and handles errors

---

## Firebase Structure

### Collection Hierarchy

```
Firestore Root
├── conversations
│   ├── {conversationId}
│   │   ├── id: string (deterministic: uid1_uid2 sorted)
│   │   ├── participants: string[] (always 2 user IDs)
│   │   ├── lastMessage: object
│   │   │   ├── text: string
│   │   │   ├── senderId: string
│   │   │   └── timestamp: number (ms)
│   │   ├── unreadCount: Record<string, number>
│   │   │   ├── {uid1}: number
│   │   │   └── {uid2}: number
│   │   ├── createdAt: number (ms)
│   │   ├── updatedAt: number (ms)
│   │   │
│   │   └── messages (subcollection)
│   │       └── {messageId}
│   │           ├── conversationId: string
│   │           ├── senderId: string
│   │           ├── text: string
│   │           ├── status: 'sending'|'sent'|'delivered'|'read'
│   │           └── createdAt: number (ms)
│   │
│   └── {conversationId2}
│       └── ...
│
└── users
    ├── {userId}
    │   ├── uid: string
    │   ├── name: string
    │   ├── email: string
    │   ├── photoURL: string (optional)
    │   ├── status: 'online'|'offline'|'away'
    │   ├── lastSeen: number (optional, ms)
    │   ├── pushToken: string (device FCM token)
    │   ├── lastUpdated: string (ISO timestamp of token)
    │   ├── createdAt: number (ms)
    │   ├── updatedAt: number (ms)
    │   │
    │   └── notifications (subcollection)
    │       └── {notificationId}
    │           ├── recipientId: string (user receiving notification)
    │           ├── senderId: string (user who sent message)
    │           ├── senderName: string (cached for offline display)
    │           ├── messageId: string
    │           ├── conversationId: string
    │           ├── messagePreview: string (first 100 chars)
    │           ├── isRead: boolean
    │           └── createdAt: number (ms)
    │
    └── {userId2}
        └── ...
```

### Firestore Indexes Required

#### Collection: `conversations`
```
Fields to Index:
- participants (Array-Contains)
- updatedAt (Descending)
Purpose: Query "Get all conversations for this user"
```

#### Collection: `conversations/{conversationId}/messages`
```
Fields to Index:
- createdAt (Descending)
Purpose: Auto-created by Firestore for subcollection ordering
```

#### Collection: `users/{userId}/notifications`
```
Fields to Index:
- createdAt (Descending)
Purpose: Load paginated notification history
```

### Key Storage Fields
| Field | Location | Usage |
|-------|----------|-------|
| `pushToken` | `users/{uid}` | Device registration with FCM, used by sender to lookup recipient's token |
| `messageId` | `notifications` | Links notification to specific message for deep linking |
| `conversationId` | Multiple collections | Enables joining data across message, conversation, and notification |
| `senderId` | Multiple collections | Tracks message origin and notification history |
| `isRead` | `notifications` | Marks notification as seen by user |

---

## Data Flow and Lifecycle

### Complete Message → Notification Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Sends Message                                           │
├──────────────────────────────────────────────────────────────────────┤
│ Location: screens/(chat)/[conversationId].tsx                        │
│ Trigger: User types message and taps "Send"                          │
│ Action: Calls messagesService.sendMessage()                          │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: Message Saved to Firestore                                  │
├──────────────────────────────────────────────────────────────────────┤
│ Collection: conversations/{conversationId}/messages                  │
│ Data Saved:                                                          │
│   {                                                                  │
│     id: "auto-generated",                                           │
│     conversationId: "uid_a_uid_b",                                  │
│     senderId: "uid_a",                                              │
│     text: "Hello!",                                                 │
│     status: "sent",                                                 │
│     createdAt: 1707408000000                                        │
│   }                                                                  │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: Conversation Updated                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Collection: conversations/{conversationId}                           │
│ Updates:                                                             │
│   lastMessage: {                                                     │
│     text: "Hello!",                                                 │
│     senderId: "uid_a",                                              │
│     timestamp: 1707408000000                                        │
│   },                                                                 │
│   updatedAt: 1707408000000,                                         │
│   unreadCount.uid_b: increment(1)  ← recipient now has 1 unread     │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: Notification Document Created                                │
├──────────────────────────────────────────────────────────────────────┤
│ Collection: users/{uid_b}/notifications                             │
│ Data Saved:                                                          │
│   {                                                                  │
│     id: "auto-generated",                                           │
│     recipientId: "uid_b",                                           │
│     senderId: "uid_a",                                              │
│     senderName: "Alice",                                            │
│     messageId: "{messageId}",                                       │
│     conversationId: "uid_a_uid_b",                                  │
│     messagePreview: "Hello!",                                       │
│     isRead: false,                                                  │
│     createdAt: 1707408000000                                        │
│   }                                                                  │
│                                                                      │
│ Purpose: Local notification history for user dashboard              │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 5: Get Recipient's Push Token                                  │
├──────────────────────────────────────────────────────────────────────┤
│ Query: doc(db, 'users', uid_b)                                      │
│ Result: { pushToken: "ExponentPushToken[...]" }                     │
│                                                                      │
│ If No Token:                                                         │
│   ├─ User never registered for push notifications OR                │
│   └─ App was uninstalled / token expired                            │
│                                                                      │
│ Recovery: Skip push notification, rely on in-app notifications     │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 6: Send Push via Expo API                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Endpoint: https://exp.host/--/api/v2/push/send                      │
│ Method: POST                                                         │
│ Payload:                                                             │
│   {                                                                  │
│     to: "ExponentPushToken[...]",                                   │
│     title: "Alice",                 ← sender name                    │
│     body: "Hello!",                 ← message preview               │
│     data: {                                                          │
│       messageId: "{messageId}",                                     │
│       chatId: "uid_a_uid_b",                                        │
│       senderId: "uid_a",                                            │
│       type: "message"                                               │
│     },                                                               │
│     sound: "default",                                               │
│     priority: "high",                                               │
│     badge: 1                                                        │
│   }                                                                  │
│                                                                      │
│ Response: { data: [{ status: "ok", id: "ticket_123" }] }            │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 7: Poll Receipt (2s delay, up to 3 retries)                    │
├──────────────────────────────────────────────────────────────────────┤
│ Endpoint: https://exp.host/--/api/v2/push/getReceipts              │
│ Request: { ids: ["ticket_123"] }                                    │
│                                                                      │
│ Response Status: "ok"  → ✅ Delivered to device                     │
│ Response Status: "error" → ❌ Delivery failed                       │
│   ├─ DeviceNotRegistered → Token is stale/invalid                  │
│   │   └─ removeTokenFromFirebase(uid_b)  [cleanup]                 │
│   ├─ InvalidCredentials → FCM config issue                         │
│   └─ MessageTooBig → Payload exceeds 4KB                           │
│                                                                      │
│ Response Status: "pending" → ⏳ Still processing [retry]            │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 8: Device Receives Notification                                │
├──────────────────────────────────────────────────────────────────────┤
│ Delivery: OS native notification (Android/iOS)                      │
│ Display: Notification center / banner alert                         │
│                                                                      │
│ Payload Visible in Notification:                                    │
│   ├─ Title: "Alice"                                                 │
│   └─ Body: "Hello!"                                                 │
│                                                                      │
│ Payload Hidden (received in app):                                   │
│   └─ data: { messageId, chatId, senderId, type }                   │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 9: User Taps Notification                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Event Listener: usePushNotificationHandler()                        │
│ Handler: Notifications.addNotificationResponseReceivedListener      │
│                                                                      │
│ Flow Based on App State:                                            │
│                                                                      │
│ A) App in Foreground:                                               │
│    ├─ Listener fires immediately                                    │
│    └─ Navigate to chat: router.push({                              │
│         pathname: '/(chat)/[conversationId]',                       │
│         params: { conversationId, otherUid }                        │
│       })                                                             │
│                                                                      │
│ B) App in Background:                                               │
│    ├─ Notification tap brings app to foreground                     │
│    ├─ Listener fires                                                │
│    └─ Navigate to chat (same as A)                                  │
│                                                                      │
│ C) App Killed:                                                       │
│    ├─ Notification tap launches app                                 │
│    ├─ Root layout calls getLastNotificationAsync()                 │
│    ├─ Extracts notification data                                    │
│    └─ Navigate to chat via router.push()                           │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 10: Chat Screen Opened                                         │
├──────────────────────────────────────────────────────────────────────┤
│ Screen: (chat)/[conversationId].tsx                                 │
│ Route Params: { conversationId, otherUid }                          │
│                                                                      │
│ Actions:                                                             │
│   ├─ Load conversation messages                                     │
│   ├─ Mark as read: markConversationRead(conversationId, uid)       │
│   │   └─ Sets unreadCount.{uid} = 0                                │
│   └─ Display message history                                        │
│                                                                      │
│ Notification Metadata: Available via route params for highlighting  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Service Layer

#### `services/pushNotificationSender.ts`
**Responsibility**: Send notification via Expo API and verify delivery

```typescript
sendPushNotification(recipientToken: string, message: MessageData)
├─ POST to Expo API /push/send
├─ Extract ticket IDs
├─ Poll receipts (with retry logic)
└─ Handle errors (DeviceNotRegistered, etc.)

checkReceiptsAfterDelay(ticketIds, options, delay, maxRetries)
├─ Wait for 2s (Expo needs time to generate receipts)
├─ POST to Expo API /push/getReceipts
├─ Parse receipt statuses
├─ Detect errors and call handleDeviceNotRegistered()
└─ Retry up to 3 times if pending

handleDeviceNotRegistered(recipientUserId)
└─ removeTokenFromFirebase(recipientUserId)  [cleanup]
```

**Error Handling**:
- `DeviceNotRegistered` → Token is stale, remove from Firestore
- `InvalidCredentials` → FCM/EAS configuration issue
- `MessageTooBig` → Payload exceeds 4KB limit
- Network errors → Retry with exponential backoff

#### `services/messagesService.ts`
**Responsibility**: Manage conversations and messages, trigger notifications

```typescript
sendMessage(conversationId, senderId, text)
├─ 1. Save message to Firestore
├─ 2. Update conversation or create if missing
├─ 3. Create notification document
└─ 4. Call sendPushNotificationToRecipient() [async, fire-and-forget]

sendPushNotificationToRecipient(recipientId, messageId, conversationId, ...)
├─ Get recipient's push token: getRecipientToken(recipientId)
├─ Call sendPushNotification() with full message data
└─ Log errors but don't throw (non-blocking)
```

#### `services/notificationsService.ts`
**Responsibility**: Store and retrieve notification history

```typescript
createNotification(recipientId, senderId, senderName, messageId, ...)
├─ Create notification doc in users/{recipientId}/notifications
├─ Store sender name for offline display
└─ Store message preview (first 100 chars)

getNotifications(userId, pageParam?)
├─ Query notifications sub-collection
├─ Order by createdAt descending
├─ Paginate with cursor (lastDoc)
└─ Return notifications + lastDoc for next page
```

#### `services/notificationService.ts` (Device setup)
**Responsibility**: Register device with FCM and handle cold launches

```typescript
registerForPushNotificationsAsync()
├─ Check device support
├─ Request permission: requestPermissionsAsync()
├─ Get Expo project ID from app.json
├─ Get token: Notifications.getExpoPushTokenAsync()
└─ Return token (e.g., "ExponentPushToken[...]")

getLastNotificationAsync()
└─ Get notification from killed state launch
   └─ Used by root layout for deep linking
```

#### `services/firebaseService.ts`
**Responsibility**: Token lifecycle management

```typescript
saveTokenToFirebase(userId, token)
├─ Save to users/{uid}: { pushToken, lastUpdated }
└─ Called on app startup and after token refresh

getRecipientToken(userId)
├─ Query users/{uid}
└─ Return pushToken or null

removeTokenFromFirebase(userId)
├─ Set users/{uid}: { pushToken: null }
└─ Called when DeviceNotRegistered error occurs
```

### Hook Layer

#### `hooks/usePushNotification.tsx`

**`usePushNotificationHandler()`**
```typescript
Purpose: Global notification tap listener
├─ Called once in app/_layout.tsx
├─ Listens for: addNotificationResponseReceivedListener
├─ On tap:
│   ├─ Extract notification data
│   ├─ Navigate to chat: router.push(...)
│   └─ Log navigation intent
└─ Cleanup: Remove listener on unmount
```

**`useNotifications(userId, onNotificationTap?)` (Legacy)**
```typescript
Purpose: Component-level notification setup
├─ Register for push tokens
├─ Store token in Firebase
├─ Listen for foreground notifications
├─ Listen for taps (fallback if handler not in root)
└─ Call callback on tap
```

### UI/Router Layer

#### `app/_layout.tsx` (Root Layout)
```typescript
1. Import notification handlers and services
2. Call usePushNotificationHandler() for tap listener
3. useEffect(() => {
     - getLastNotificationAsync() on app init
     - Handle killed state notifications
     - router.push() to correct chat
   }, [router])
4. Render Stack.Navigator with all app routes
```

#### `app/(chat)/[conversationId].tsx` (Chat Screen)
```typescript
Route Params: { conversationId, otherUid, messageId? }
├─ Load conversation messages
├─ Mark conversation as read
├─ Scroll to messageId if provided (from notification)
└─ Display message history
```

---

## Integration Points

### 1. Message Send → Push Notification

```
messagesService.sendMessage()
  └─ sendPushNotificationToRecipient()
       └─ getRecipientToken(recipientId)
            └─ pushNotificationSender.sendPushNotification()
```

**Data Passed**:
```typescript
{
  messageId: "msg_123",
  chatId: "uid_a_uid_b",
  senderId: "uid_a",
  senderName: "Alice",
  text: "Hello!",
  recipientUserId: "uid_b"  // For error handling
}
```

### 2. User Registration → Token Storage

```
App Startup (root layout)
  └─ usePushNotificationHandler() [sets up listener]
     && useNotifications() or registerForPushNotificationsAsync()
        └─ saveTokenToFirebase(userId, token)
```

**Token Lifecycle**:
```
├─ App Install → Get token → Save to Firebase
├─ Token Refresh → Update Firebase (background)
├─ App Reinstall → Get new token → Save to Firebase
├─ App Uninstall → Token becomes stale (next message fails)
└─ Error (DeviceNotRegistered) → Remove from Firebase
```

### 3. Notification Tap → Chat Navigation

```
User taps notification
  └─ usePushNotificationHandler listener fires
       └─ handleNotificationNavigation() / router.push()
            └─ Navigate to (chat)/[conversationId]
                 └─ Load messages for that conversation
```

### 4. Error Recovery → Token Cleanup

```
sendPushNotification() → Poll receipts
  └─ DeviceNotRegistered error detected
       └─ handleDeviceNotRegistered(recipientUserId)
            └─ removeTokenFromFirebase(recipientUserId)
                 └─ Next message attempt: token will be null, skip push
```

---

## Error Handling and Recovery

### Error Categories and Responses

| Error | Root Cause | Detection | Recovery |
|-------|-----------|-----------|----------|
| **DeviceNotRegistered** | App uninstalled, token expired | Receipt with error "DeviceNotRegistered" | Remove token from Firestore |
| **InvalidCredentials** | FCM/EAS config issue | Ticket status "error" with code | Log error, notify admin |
| **MessageTooBig** | Payload > 4KB | Ticket error | Reduce body size, truncate text |
| **MissingRegistration** | Empty or invalid token | Ticket error | Log error, get fresh token |
| **No Token** | User never registered | getRecipientToken returns null | Skip push, rely on in-app |
| **Network Error** | Connection failure | fetch() throws error | Retry up to 3 times |
| **Parse Error** | Invalid JSON from Expo | JSON.parse() throws | Log and continue |

### Error Flow Diagram

```
sendPushNotification(token, data)
  │
  ├─ Fetch fails → Throw error → Log ❌
  │  Catch: Log and re-throw for caller
  │
  ├─ Response not ok → Parse response
  │  │
  │  ├─ Has failedTickets → Extract error codes
  │  │  └─ Throw with error details
  │  │
  │  └─ Throw `Expo API error: {status}`
  │
  ├─ Tickets extracted ✓
  │  │
  │  ├─ Call checkReceiptsAfterDelay(ticketIds)
  │  │
  │  └─ For each receipt in response:
  │     │
  │     ├─ status: "ok" → ✅ Delivered (increment counter)
  │     │
  │     ├─ status: "error" → ❌ Failed
  │     │  │
  │     │  ├─ error.details?.error === "DeviceNotRegistered"
  │     │  │  └─ handleDeviceNotRegistered(recipientUserId)
  │     │  │     └─ removeTokenFromFirebase(recipientUserId) ← Cleanup!
  │     │  │
  │     │  └─ Other error → Log details
  │     │
  │     └─ status: "pending" → ⏳ Still processing
  │        └─ Retry after 2s (max 3 attempts total)
  │
  ├─ After receipts checked:
  │  │
  │  ├─ delivered > 0 → Success ✅ Return
  │  │
  │  ├─ pending > 0 && attempts left → Retry
  │  │
  │  └─ No receipts → Log warning, continue
  │
  └─ Catch invoice error → Log and return (don't throw)
     └─ Prevents sendMessage() from failing
```

### Fallback Mechanisms

```
1. No Push Token
   ├─ Skip push notification
   ├─ Message still saved to Firestore
   └─ User sees message in-app when opening chat

2. Receipt Check Fails
   ├─ Retry up to 3 times with 2s delays
   ├─ After 3 failures, log warning
   └─ Assume delivery (notification likely went through)

3. Network Error During Send
   ├─ Throw error (caller logs)
   ├─ Message is already saved in Firestore
   └─ Next app startup can retry sending push

4. App Crash During Push
   ├─ Message saved in Firestore ✓
   ├─ Notification document created ✓
   ├─ Push may or may not send
   └─ User can still retrieve message in-app
```

---

## Token Management

### Token Lifecycle

#### Lifecycle States
```
┌─────────────────────────────┐
│ Device: App Never Installed │
└────────────┬────────────────┘
             │
             ▼
┌────────────────────────┐     Expired after ~90 days
│ Device: App Installed  │────────────────────────┐
│ NO token saved yet     │                        │
└───────────┬────────────┘                        │
            │                                     │
            ▼ First Launch                        ▼
┌──────────────────────────────┐        ┌──────────────────────┐
│ Token Valid & Saved          │        │ Token Expired        │
│ users/{uid}: {               │        │ (in Firestore but    │
│   pushToken: "Exponent[...]" │        │  not at FCM)         │
│ }                            │        └──────────┬───────────┘
│                              │                   │
│ ✓ Can receive push           │                   ▼
│ ✓ Notifications work         │        Next app launch
└────────┬─────────────────────┘        │
         │                              ├─ registerPushToken()
         │                              ├─ Get NEW token
         │◄─────────────────────────────┤ Save to Firebase
         │                              └─ Cycle repeats
         │ (Token remains valid unless)
         ├─ App uninstalled
         ├─ User revokes permissions
         ├─ FCM refresh event occurs
         └─ Token refresh scheduled
```

#### Uninstall Scenario
```
User Uninstalls                  Send Message
        │                               │
        ▼                               ▼
Token Becomes Stale    But Firestore Still Has Old Token
(at FCM level)              │
        │                   ├─ getRecipientToken() returns stale token
        │                   ├─ sendPushNotification() sends to Expo
        │                   ├─ Expo sends to FCM
        │                   │
        │                   ▼
        │          FCM Responds: "DeviceNotRegistered"
        │                   │
        │                   ├─ Expo API returns error in receipt
        │                   ├─ handleDeviceNotRegistered() called
        │                   └─ removeTokenFromFirebase() cleanup ✓
        │
        └──── Next Message to Same User
              └─ getRecipientToken() returns null
                 └─ Skip push, message saved in DB only
```

#### Best Practices

**On App Startup**:
```typescript
useEffect(() => {
  registerForPushNotificationsAsync().then((token) => {
    if (token && userId) {
      // Always re-save token on app start
      // Handles reinstalls, token refresh, etc.
      saveTokenToFirebase(userId, token);
    }
  });
}, [userId]);
```

**Error Recovery**:
```typescript
// Automatic cleanup on DeviceNotRegistered
handleDeviceNotRegistered(recipientUserId)
  └─ removeTokenFromFirebase(recipientUserId)
     └─ Next attempt: token will be null, skip push
```

**Manual Refresh** (if needed):
```typescript
async function refreshToken(userId: string) {
  const newToken = await registerForPushNotificationsAsync();
  if (newToken) {
    await saveTokenToFirebase(userId, newToken);
  }
}
```

---

## Notification Payload

### Expo Push Service Payload

**Full Structure Sent to Expo API**:
```typescript
{
  // Delivery target
  to: "ExponentPushToken[...ABC123...]",
  
  // Visible to user
  title: "Alice",                  // Sender name
  body: "Hello there!",            // Message text (truncated if > 100 chars)
  
  // Hidden but received in app
  data: {
    messageId: "msg_abc123",       // Link to specific message
    chatId: "uid_a_uid_b",        // Conversation ID for deep link
    senderId: "uid_a",             // Identify sender
    type: "message"                // Extensible for future types
  },
  
  // Behavior
  sound: "default",                // Notification sound
  priority: "high",                // Deliver immediately
  channelId: "default",            // Android notification channel
  badge: 1                         // Red badge count
}
```

### Data Payload Structure

```typescript
// In notification.request.content.data
interface PushNotificationData {
  chatId?: string;       // Conversation ID → use for router.push()
  messageId?: string;    // Message ID → optional, for highlighting
  senderId?: string;     // Sender user ID → pass as otherUid
  type?: string;         // Notification type (e.g., "message")
}
```

### Notification Display

**User Visible** (in notification center):
```
┌─────────────────────────────┐
│ Alice                       │  ← Title (from data.senderName)
│ Hello there!                │  ← Body (from message text)
└─────────────────────────────┘
```

**When Received in App** (foreground):
- `title` and `body` shown
- `data` object available to custom handlers
- Can display custom toast or alert

**When Tapped**:
- `usePushNotificationHandler` listener fires
- Extract `data.chatId` and `data.senderId`
- Navigate to chat: `router.push({...})`

### Text Truncation

```typescript
// Truncate long messages for display
body: message.text.length > 100 
  ? message.text.substring(0, 100) + '...' 
  : message.text,

// But full message saved to Firestore
// User sees full message when opening chat
```

---

## Sequence Diagrams

### Message Send → Notification Delivery

```
User                    App                Firestore              Expo API              FCM Device
 │                      │                     │                      │                      │
 ├─ Type message ──────>│                     │                      │                      │
 │                      │                     │                      │                      │
 ├─ Tap Send ──────────>│                     │                      │                      │
 │                      │                     │                      │                      │
 │                      ├─ sendMessage() ───>│                      │                      │
 │                      │                     │                      │                      │
 │                      │  Save message ───>Saved                   │                      │
 │                      │  (conversationId/messages)                │                      │
 │                      │                     │                      │                      │
 │                      │  Update conversation                       │                      │
 │                      │  + create notification                     │                      │
 │                      │<──── ✓ Done ────────│                      │                      │
 │                      │                     │                      │                      │
 │                      ├─ getRecipientToken()────────────────────>│                      │
 │                      │<─────── token ─────────────────────────┘  │                      │
 │                      │                     │                      │                      │
 │                      ├─ sendPushNotification()                   │                      │
 │                      │    (async, fire-and-forget)              │                      │
 │                      │                     │                      │                      │
 │                      ├─────────────────────────────────────────>│ POST /push/send      │
 │                      │                     │                      │                      │
 │                      │                     │                      ├────────────────────> │
 │                      │                     │                      │     Deliver notification
 │                      │                     │                      │<────── ✓ Received ──┤
 │                      │<────────────────────────────── ✓ ok ──────┤                      │
 │                      │                     │                      │                      │
 │                      ├─ checkReceiptsAfterDelay()                │                      │
 │                      │    (2s delay)      │                      │                      │
 │                      │                     │                      │                      │
 │                      ├─────────────────────────────────────────>│ POST /getReceipts    │
 │                      │<────────────────────────────── ✓ ok ──────┤                      │
 │                      │                     │                      │                      │
 │ [Device receives notification]◄──────────────────────────────────┤                      │
 │                      │                     │                      │<─ displayed ────────┤
 │                      │                     │                      │                      │
 ├─────────────────────────────────────────────────────────────────────────────────────────>│
 │                                                                  Notification appears in │
 │                                                                  notification center     │
 │                      │                     │                      │                      │
 ├─ [User taps notification]──────────────────────────────────────────────────────────────>│
 │                      │                     │                      │                      │
 │<─────────────────────────── notification tap event ────────────────────────────────────┤
 │                      │                     │                      │                      │
 │                      │<─ usePushNotificationHandler detects tap ─┤                      │
 │                      │                     │                      │                      │
 │                      ├─ router.push() to chat screen             │                      │
 │<───── Chat opens and shows message ───────│                      │                      │
 │                      │                     │                      │                      │
```

### Cold Start (App Killed) Navigation

```
User taps notification        Expo/FCM              App Process      Root Layout          Chat Screen
        │                          │                     │                 │                   │
        │                          │                     │                 │                   │
        ├─ Notification in        │                     │                 │                   │
        │  notification center    │                     │                 │                   │
        │                          │                     │                 │                   │
        ├─ Tap ────────────────────┼────────────────────>│                 │                   │
        │                          │  [App launches]     │                 │                   │
        │                          │                     │                 │                   │
        │                          │                     ├─ RootLayout renders                │
        │                          │                     │                 │                   │
        │                          │                     │  ├─ getLastNotificationAsync()   │
        │                          │                     │  │  └─ returns notification      │
        │                          │                     │  │                                │
        │                          │                     │  ├─ Extract data:               │
        │                          │                     │  │  {                            │
        │                          │                     │  │    chatId: "uid_a_uid_b",     │
        │                          │                     │  │    senderId: "uid_a"         │
        │                          │                     │  │  }                            │
        │                          │                     │  │                                │
        │                          │                     │  ├─ setTimeout(..., 1000ms)      │
        │                          │                     │  │  [Wait for nav ready]         │
        │                          │                     │  │                                │
        │                          │                     │  └─ router.push({                │
        │                          │                     │       pathname: '/(chat)/[conversationId]',
        │                          │                     │       params: {                  │
        │                          │                     │         conversationId: chatId,  │
        │                          │                     │         otherUid: senderId      │
        │                          │                     │       }                          │
        │                          │                     │     })                           │
        │                          │                     │                 │                │
        │                          │                     │                 ├─ Route change │
        │                          │                     │                 │                │
        │                          │                     │                 │                ├─ Render
        │                          │                     │                 │                │
        │<──────────────────────────────────────────────────────────────── Show Chat ──────┤
        │ [Chat screen opens with messages loaded]                                         │
        │                          │                     │                 │                │
```

### Notification Tap (App in Background)

```
app in background      Device OS           Notification Handler   Router          Chat Screen
        │                  │                       │               │                 │
        │              Receives                    │               │                 │
        │              notification in             │               │                 │
        │              notification center         │               │                 │
        │                  │                       │               │                 │
        ├─ Tap ────────────┼──────────────────────>│               │                 │
        │                  │                       │               │                 │
        │                  ├─ App comes ───────────┼────────────>│               │
        │                  │  to foreground        │               │                 │
        │                  │                       │               │                 │
        │                  │  Notification         │               │                 │
        │                  │  response event       │               │                 │
        │                  │<───────────────────┬──┤               │                 │
        │                  │  data: {            │                 │                 │
        │                  │    chatId,          │                 │                 │
        │                  │    senderId         │                 │                 │
        │                  │  }                  │                 │                 │
        │                  │                  ┌──┴──────────────┐  │                 │
        │                  │                  │Extract data,    │  │                 │
        │                  │                  │Build params,    │  │                 │
        │                  │                  │router.push()    │  │                 │
        │                  │                  └────────┬────────┘  │                 │
        │                  │                          │            │                 │
        │                  │                          ├──────────>│ Navigate to chat │
        │                  │                          │            │                 │
        │                  │                          │            ├─ Render chat ───┼────>
        │                  │                          │            │                 │
        │<──────────────────────────────────────────── [Chat screen displayed with messages] ──
        │         Chat opens and displays conversation
        │                  │                          │            │                 │
```

---

## Testing Guide

### Unit Tests

#### 1. Token Management

```typescript
describe('Token Management', () => {
  it('should save token to Firestore on app start', async () => {
    const userId = 'user_123';
    const token = 'ExponentPushToken[...]';
    
    await saveTokenToFirebase(userId, token);
    
    const userDoc = await getDoc(doc(db, 'users', userId));
    expect(userDoc.data().pushToken).toBe(token);
  });

  it('should retrieve token for recipient', async () => {
    // Setup: Save token
    await saveTokenToFirebase('user_456', 'token_xyz');
    
    // Test
    const token = await getRecipientToken('user_456');
    expect(token).toBe('token_xyz');
  });

  it('should remove invalid token on error', async () => {
    await saveTokenToFirebase('user_789', 'token_old');
    
    await handleDeviceNotRegistered('user_789');
    
    const userDoc = await getDoc(doc(db, 'users', 'user_789'));
    expect(userDoc.data().pushToken).toBeNull();
  });
});
```

#### 2. Message Creation

```typescript
describe('Message Service', () => {
  it('should save message and create notification', async () => {
    const conversationId = 'uid_a_uid_b';
    const senderId = 'uid_a';
    
    const message = await sendMessage(conversationId, senderId, 'Hello');
    
    // Message saved
    const msgDoc = await getDoc(
      doc(db, 'conversations', conversationId, 'messages', message.id)
    );
    expect(msgDoc.data().text).toBe('Hello');
    
    // Notification created
    const notifications = await getNotifications('uid_b');
    expect(notifications.notifications.length).toBeGreaterThan(0);
    expect(notifications.notifications[0].senderId).toBe(senderId);
  });
});
```

### Integration Tests

#### 1. End-to-End Message Flow

```typescript
describe('Message to Notification Flow', () => {
  it('should create message, notification, and send push', async () => {
    const userId_a = 'user_a';
    const userId_b = 'user_b';
    const conversationId = getConversationId(userId_a, userId_b);
    
    // Setup: Save token for recipient
    await saveTokenToFirebase(userId_b, 'ExponentPushToken[test]');
    
    // Send message
    const message = await sendMessage(
      conversationId,
      userId_a,
      'Integration test message'
    );
    
    // Verify message exists
    expect(message.id).toBeDefined();
    expect(message.text).toBe('Integration test message');
    
    // Verify notification created
    const notifs = await getNotifications(userId_b);
    expect(notifs.notifications[0]).toEqual(
      expect.objectContaining({
        senderId: userId_a,
        messageId: message.id,
        conversationId,
      })
    );
    
    // Verify push was sent (check logs or mock Expo API)
    // - Ticket ID received
    // - Receipt checked
    // - Status 'ok' or error logged
  });
});
```

### Manual Testing Checklist

#### A. Token Registration
```
[ ] Fresh Install
    [ ] App opens
    [ ] Check logs for "Expo push token: ExponentPushToken[...]"
    [ ] Firebase shows token in users/{uid}: { pushToken: "..." }

[ ] Reinstall
    [ ] Uninstall app
    [ ] Reinstall
    [ ] Check new token is saved (different from before)

[ ] App Restart
    [ ] Kill and reopen app
    [ ] Token should remain same (unchanged)
    [ ] lastUpdated field should update
```

#### B. Message Send → Push
```
[ ] Device A sends message to Device B
    [ ] Message appears in Device B's Firebase
    [ ] Notification document created in Device B's notifications
    [ ] Push notification delivered (check device notification center)
    [ ] Logs show:
        - "📤 Sending push to Expo API..."
        - "🎫 Expo tickets: [{ status: 'ok', id: '...' }]"
        - "📊 Summary: 1 delivered, 0 failed, 0 pending"
```

#### C. DeepLinking - All States
```
[ ] App Foreground
    [ ] Device B in app, receives message
    [ ] Notification appears in banner
    [ ] Tap notification
    [ ] Chat screen opens to conversation ✓

[ ] App Background
    [ ] Device B backgrounded
    [ ] Device A sends message
    [ ] Notification in notification center
    [ ] Tap notification
    [ ] Device B brings app to foreground
    [ ] Chat screen opens to conversation ✓

[ ] App Killed
    [ ] Device B app not running
    [ ] Device A sends message
    [ ] Notification in notification center
    [ ] Tap notification
    [ ] App launches and opens chat screen ✓
```

#### D. Error Handling
```
[ ] Uninstall & Message
    [ ] Device B: Uninstall app
    [ ] Device A: Send message
    [ ] Check logs:
        [ ] "💚 Found push token..."
        [ ] "📤 Sending push to Expo API..."
        [ ] "❌ Ticket ...: DeviceNotRegistered"
        [ ] "🗑️ Removed invalid token for user..."
    [ ] Verify Firestore: Device B's pushToken is now null
    [ ] Device B: Reinstall app → gets new token
    [ ] Device A: Send another message
    [ ] Notification delivered ✓

[ ] Invalid Token
    [ ] Manually set invalid token in Firestore
    [ ] Send message
    [ ] Verify automatic cleanup occurs
    [ ] Token is removed from database
```

#### E. Notification Interaction
```
[ ] Tap Notification
    [ ] Notification tapped
    [ ] Logs show: "👆 Notification tapped, navigating to: {chatId}"
    [ ] Chat screen opens
    [ ] Correct conversation shown
    [ ] Messages loaded

[ ] Mark as Read
    [ ] Open chat from notification
    [ ] Logs show: "markConversationRead(conversationId)"
    [ ] unreadCount.{uid} = 0 in Firestore
    [ ] Badge count decreases or disappears
```

#### F. Payload Verification
```
[ ] Notification Visible Content
    [ ] Title: Sender name "Alice"
    [ ] Body: Message preview (truncated if > 100 chars)
    [ ] Sound: Notification sound plays

[ ] Notification Hidden Content
    [ ] Tap notification
    [ ] Extract logs: "👆 Notification tapped, data:"
    [ ] Verify payload:
        [ ] "chatId": "uid_a_uid_b"
        [ ] "senderId": "uid_a"
        [ ] "messageId": "..." (exists)
        [ ] "type": "message"
```

---

## Quick Reference: Key Files and Their Roles

| File | Purpose | Key Functions |
|------|---------|----------------|
| `services/pushNotificationSender.ts` | Send via Expo API & verify delivery | `sendPushNotification()`, `checkReceiptsAfterDelay()`, `handleDeviceNotRegistered()` |
| `services/messagesService.ts` | Create messages, trigger notifications | `sendMessage()`, `sendPushNotificationToRecipient()` |
| `services/notificationsService.ts` | Store & retrieve notification history | `createNotification()`, `getNotifications()` |
| `services/notificationService.ts` | Device registration & cold start | `registerForPushNotificationsAsync()`, `getLastNotificationAsync()` |
| `services/firebaseService.ts` | Token lifecycle | `saveTokenToFirebase()`, `getRecipientToken()`, `removeTokenFromFirebase()` |
| `hooks/usePushNotification.tsx` | Notification listeners | `usePushNotificationHandler()`, `useNotifications()` |
| `app/_layout.tsx` | App root, cold start handling | `getLastNotificationAsync()`, `usePushNotificationHandler()`, deep linking | 
| `utils/notificationNavigation.ts` | Navigation logic | `handleNotificationNavigation()` |
| `types/notification.ts` | Data structures | `MessageData`, `PushNotificationData` |
| `types/models.ts` | Firebase doc structures | `Message`, `Notification`, `Conversation`, `User` |

---

## Conclusion

The notification system is a **multi-layer architecture** that:

1. **Detects** message sends in the app layer
2. **Persists** data across Firestore collections
3. **Delivers** notifications via Expo Push Service
4. **Handles** errors and cleans up stale tokens
5. **Routes** users to correct conversations via deep linking
6. **Works** from all app states (killed, background, foreground)

Each component has a single responsibility, and error handling is built in at every layer. The result is a reliable, user-friendly notification system that gracefully handles edge cases like app reinstalls, expired tokens, and network failures.

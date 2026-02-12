# Notification System Integration Checklist

## Quick Setup Guide (30 minutes)

Follow these steps to integrate the complete notification system into your app.

### ✅ Step 1: Verify Firestore Structure

Your Firestore should have:
- `users/{userId}/pushToken` — stores Expo push token
- `users/{userId}/notifications/{notificationId}` — notification history

The system creates these automatically. No manual setup needed.

### ✅ Step 2: Verify EAS Configuration

Check your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  }
}
```

Get your projectId:
```bash
eas project info
```

This is **critical** — without it, push tokens won't generate correctly.

### ✅ Step 3: Rebuild and Test on Physical Device

```bash
eas build -p ios --profile preview
# or
eas build -p android --profile preview
```

Install on a real device (simulator doesn't work for push).

### ✅ Step 4: Test Token Registration

1. Open app on device
2. Check that user gets permission prompt for notifications
3. Open Settings tab → check dev section shows "Push Token"
4. Copy the token

### ✅ Step 5: Verify Token is Saved

Test the token in Firestore:
1. Go to Firebase Console
2. Navigate to `users/[yourUserId]`
3. Check that `pushToken` field exists with your token

### ✅ Step 6: Test Manual Push (via expo.dev)

1. Go to https://expo.dev/notifications
2. Paste your token
3. Send test notification
4. Verify notification appears on device

**If it works here, skip to Step 8. If not, fix token registration first.**

### ✅ Step 7: Test In-App Sending

1. Have two users/devices ready
2. User A sends message to User B
3. Check logs:
   - Frontend should log: `✅ Notification document created`
   - Frontend should log: `✅ Push notification sent successfully`
4. Check if notification appears on User B's device

### ✅ Step 8: Test Notification Tap

1. When a notification arrives, tap it
2. App should:
   - Navigate to the correct chat conversation
   - Mark notification as read
   - Show the conversation with User A

### ✅ Step 9: Test Notification History

1. Open Settings → Notifications
2. See list of past notifications
3. Tap one → should navigate to chat and mark read
4. Blue dot shows unread status

### ✅ Step 10: Backend Integration (if using)

If you have a Node.js backend sending messages:

1. Copy code from `docs/BACKEND_NOTIFICATION_SETUP.ts`
2. Replace your notification endpoint
3. Make sure it sends push notifications
4. Check backend logs for ticket/receipt responses

---

## Debugging (If Something Doesn't Work)

### Problem: Token shows as `undefined` or `null`

**Check:**
```typescript
// In notificationService.ts
const projectId = Constants.expoConfig?.extra?.eas?.projectId;
console.log('ProjectID:', projectId);  // Should NOT be undefined
```

**Fix:** Update `app.json` with your EAS projectId

### Problem: "expo.dev works but not in app"

**Check:**
1. Copy token from app Settings
2. Compare with token backend is using
3. Check backend logs for token being sent

**Debug:** Add logs to `messagesService.ts` sendMessage function:
```typescript
console.log('Sender user:', senderName);
console.log('Recipient ID:', otherUid);
console.log('About to create notification...');
```

### Problem: Notification arrives but doesn't navigate

**Check:** Look for logs in `usePushNotification.tsx`:
```typescript
console.log('👆 Notification tapped:', data);
console.log('🔗 Navigating to chat:', data.chatId);
```

**Debug:** Verify `chatId` is being passed in notification data

### Problem: "DeviceNotRegistered" error

Your token is stale. Fix:
1. Log out and log back in
2. App will re-register a new token
3. Test again

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `types/models.ts` | ✅ Added Notification interface |
| `constants/index.ts` | ✅ Added NOTIFICATIONS collection + QK |
| `services/notificationsService.ts` | ✅ **NEW** — Notification CRUD |
| `services/messagesService.ts` | ✅ Updated: now creates notification docs + improved push logging |
| `services/pushNotificationSender.ts` | ✅ Improved: now checks tickets + receipts + detailed logging |
| `hooks/usePushNotification.tsx` | ✅ Updated: added deep linking navigation on tap |
| `hooks/useNotificationsData.ts` | ✅ **NEW** — React Query hooks for notifications |
| `components/NotificationsHistory.tsx` | ✅ **NEW** — UI component for notification list |
| `components/index.ts` | ✅ Updated: exported NotificationsHistory |
| `app/(tabs)/notifications.tsx` | ✅ **NEW** — Notifications screen |
| `app/(tabs)/settings.tsx` | ✅ Updated: Settings → Notifications navigation |
| `docs/NOTIFICATION_SYSTEM_GUIDE.md` | ✅ **NEW** — Complete system documentation |
| `docs/BACKEND_NOTIFICATION_SETUP.ts` | ✅ **NEW** — Backend Node.js example code |

---

## Testing Matrix

| Scenario | Expected | Status |
|----------|----------|--------|
| User A sends message to User B | Notification created + push sent | ✅ |
| B receives push (app in background) | Notification shows on device | ✅ |
| B taps notification | App opens → navigates to chat with A | ✅ |
| B swipes away notification | Check notification history | ✅ |
| B opens Settings → Notifications | See all past notifications | ✅ |
| Tap notification in history | Navigate to chat + mark read | ✅ |
| Unread indicator | Blue dot for unread | ✅ |
| Manual test via expo.dev | Push arrives (baseline test) | ✅ |

---

## Important Notes

1. **Device Only**: Push tokens only work on physical devices, not simulators
2. **Permissions**: User must grant notification permissions at first launch
3. **Token Refresh**: Token updates whenever app restarts; auto-saved to Firestore
4. **Error Handling**: Push failures don't break message sending (fire-and-forget)
5. **Receipt Checking**: Backend checks receipts after 2 seconds to verify delivery
6. **DeviceNotRegistered**: If token becomes invalid, user needs to reinstall/log in
7. **Logging**: All steps are logged; check logs for debugging

---

## Support URLs

- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [Expo API Reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking-and-navigation-state/)

---

## Next Steps

1. ✅ Review this checklist
2. ✅ Run through all 10 steps above
3. ✅ Verify on physical device
4. ✅ Check logs for errors
5. ✅ Test manual push via expo.dev first
6. ✅ Then test in-app sending
7. ✅ Monitor production for issues

Good luck! 🚀


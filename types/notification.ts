export interface MessageData {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
}

export interface PushNotificationData {
  chatId?: string;
  messageId?: string;
  senderId?: string;
  /** Sender's display name — used in quick-reply confirmation notification */
  senderName?: string;
}

// ── Notification category / action identifiers ──────────────────
// These must be identical in the sender payload and the response handler.

/** Category applied to every incoming chat message notification */
export const NOTIF_CATEGORY_MESSAGE = 'MESSAGE';

/** Action identifier for the inline quick-reply button */
export const NOTIF_ACTION_REPLY = 'QUICK_REPLY';

/** Android notification channel id */
export const ANDROID_CHANNEL_ID = 'messages';
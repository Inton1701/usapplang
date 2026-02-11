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
}
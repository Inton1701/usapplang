export interface MessageData {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
}

export async function sendPushNotification(
  recipientToken: string,
  message: MessageData
): Promise<void> {
  const messagePayload = {
    to: recipientToken,
    sound: 'default' as const,
    title: message.senderName,
    body: message.text.length > 100 
      ? message.text.substring(0, 100) + '...' 
      : message.text,
    data: {
      messageId: message.messageId,
      chatId: message.chatId,
      senderId: message.senderId,
      type: 'new_message',
    },
    priority: 'high' as const,
    channelId: 'default',
    badge: 1, // Shows notification badge on app icon
  };

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messagePayload),
  });

  const data = await response.json();
  
  // Check for errors
  if (data.data?.status === 'error') {
    throw new Error(`Push notification failed: ${data.data.message}`);
  }

  console.log('✅ Push notification sent successfully');
}
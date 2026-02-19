export interface MessageData {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  recipientUserId?: string;
}

/**
 * Send a push notification via Expo Push API
 * Includes ticket + receipt checking for delivery verification
 * 
 * Ticket = immediate response (queued or error)
 * Receipt = delayed response (delivered or failed)
 */
export async function sendPushNotification(
  recipientToken: string,
  message: MessageData
): Promise<void> {
  const payload = {
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
      senderName: message.senderName,
      type: 'message',
    },
    priority: 'high' as const,
    // Route into our Messages channel on Android (enables heads-up + inline reply)
    channelId: 'messages',
    // Attach the MESSAGE category so iOS/Android shows the Reply action button
    categoryId: 'MESSAGE',
    badge: 1,
  };

  try {
    console.log('📤 Sending push to Expo API...');
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Parse response
    let responseData: any;
    const text = await res.text();
    try {
      responseData = text ? JSON.parse(text) : null;
    } catch (parseErr) {
      console.error('❌ Failed to parse Expo response:', text);
      throw new Error('Invalid JSON from Expo API');
    }

    // Check HTTP status
    if (!res.ok) {
      console.error('❌ Expo API returned error status:', res.status);
      console.error('   Response:', responseData);
      throw new Error(`Expo API error: ${res.status}`);
    }

    // Handle response tickets
    // Response format: { data: [...tickets] }
    const tickets = Array.isArray(responseData?.data)
      ? responseData.data
      : responseData?.data
        ? [responseData.data]
        : [];

    if (tickets.length === 0) {
      console.error('❌ No tickets in Expo response');
      throw new Error('Empty ticket response');
    }

    console.log('🎫 Expo tickets:', JSON.stringify(tickets, null, 2));

    // Check for immediate errors in tickets
    const failedTickets = tickets.filter(
      (ticket: any) => ticket.status === 'error'
    );

    if (failedTickets.length > 0) {
      console.error('❌ Ticket errors:', failedTickets);
      const errors = failedTickets
        .map((t: any) => `${t.code}: ${t.message}`)
        .join('; ');
      throw new Error(`Push ticket failed: ${errors}`);
    }

    // Extract ticket IDs for receipt checking
    const ticketIds = tickets
      .filter((t: any) => t.status === 'ok' && t.id)
      .map((t: any) => t.id);

    if (ticketIds.length === 0) {
      console.warn('⚠️ No valid ticket IDs for receipt checking');
      return;
    }

    console.log(`✅ ${ticketIds.length} ticket(s) queued, ID(s):`, ticketIds);

    // Schedule receipt check after delay
    // (Expo takes a few seconds to generate receipts)
    await checkReceiptsAfterDelay(ticketIds, {
      recipientUserId: message.recipientUserId,
      recipientToken,
    });
  } catch (error) {
    console.error('❌ Push notification error:', error);
    throw error;
  }
}

/**
 * Check receipts after a delay
 * Receipts contain actual delivery status (delivered or failed)
 * Also handles invalid tokens by removing them from Firestore
 */
async function checkReceiptsAfterDelay(
  ticketIds: string[],
  options?: {
    recipientUserId?: string;
    recipientToken?: string;
  },
  delay: number = 2000,
  maxRetries: number = 3
): Promise<void> {
  // Wait for Expo to generate receipts
  await new Promise((resolve) => setTimeout(resolve, delay));

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(
        `📋 Checking receipts (attempt ${attempt + 1}/${maxRetries})...`
      );

      const receiptRes = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ ids: ticketIds }),
      });

      if (!receiptRes.ok) {
        console.error(`⚠️ Receipt check returned ${receiptRes.status}`);
        if (attempt < maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        return;
      }

      const receiptData = await receiptRes.json();
      const receipts = receiptData?.data || {};

      console.log('📋 Receipts:', JSON.stringify(receipts, null, 2));

      // Analyze receipts
      let delivered = 0;
      let failed = 0;
      let pending = 0;

      Object.entries(receipts).forEach(([ticketId, receipt]: [string, any]) => {
        if (receipt.status === 'ok') {
          delivered++;
          console.log(`   ✅ Ticket ${ticketId}: Delivered`);
        } else if (receipt.status === 'error') {
          failed++;
          console.error(
            `   ❌ Ticket ${ticketId}: ${receipt.message} (${receipt.details?.error})`
          );

          // Handle specific errors
          if (receipt.details?.error === 'DeviceNotRegistered') {
            console.warn(
              '   → Device token is invalid/expired. Removing from Firestore...'
            );
            // Remove invalid token from Firestore (async, non-blocking)
            if (options?.recipientUserId) {
              handleDeviceNotRegistered(options.recipientUserId);
            }
          }
        } else {
          pending++;
          console.log(`   ⏳ Ticket ${ticketId}: ${receipt.status}`);
        }
      });

      console.log(
        `📊 Summary: ${delivered} delivered, ${failed} failed, ${pending} pending`
      );

      // If we got receipts, we're done
      if (delivered > 0 || failed > 0) {
        return;
      }

      // Still pending, retry if we have attempts left
      if (attempt < maxRetries - 1) {
        console.log('⏳ Receipts still pending, retrying...');
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (error) {
      console.error(`❌ Receipt check failed:`, error);
      if (attempt === maxRetries - 1) {
        // Last attempt failed, log and return
        console.error('⚠️ Could not verify receipts, but ticket was accepted by Expo');
        return;
      }
      // Retry
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

/**
 * Handle DeviceNotRegistered error by removing invalid token from Firestore
 * This prevents future attempts to send to a stale token
 * NOTE: Errors are logged but not thrown - this is a cleanup operation
 */
async function handleDeviceNotRegistered(recipientUserId: string): Promise<void> {
  try {
    // Dynamically import to avoid circular dependencies
    const { removeTokenFromFirebase } = await import('./firebaseService');
    await removeTokenFromFirebase(recipientUserId);
    console.log(`Removed invalid token for user ${recipientUserId}`);
  } catch (error) {
    // Log error but don't throw - this is a non-critical cleanup operation
    console.error('Failed to clean up invalid token:', error);
  }
}

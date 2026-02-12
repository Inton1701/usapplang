// ──────────────────────────────────────────────
// Backend: sendNotification — Node.js/Express
// ──────────────────────────────────────────────
// This function is called when User A sends a message to User B
// It should:
//   1. Create a notification document in Firestore
//   2. Send Expo push notification
//   3. Log ticket and receipt responses for debugging

import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize Firebase Admin (do this once at app startup)
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccountKey),
//   databaseURL: 'https://YOUR_PROJECT.firebaseio.com',
// });

const db = admin.firestore();

interface MessageData {
  messageId: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
}

/**
 * Send notification when a message is created
 * Call this from your message creation endpoint
 */
export async function sendNotification(
  recipientId: string,
  data: MessageData
): Promise<void> {
  console.log('📤 [Backend] Sending notification to:', recipientId);

  try {
    // 1. Get recipient's push token from Firestore
    const userDoc = await db.collection('users').doc(recipientId).get();
    const recipientToken = userDoc.data()?.pushToken;

    if (!recipientToken) {
      console.warn(
        '⚠️ [Backend] No push token found for recipient:',
        recipientId
      );
      return;
    }

    console.log('✅ [Backend] Found token:', recipientToken.slice(0, 20) + '...');

    // 2. Send to Expo Push API
    const ticketResponse = await sendPushToExpo(recipientToken, data);

    // 3. Check tickets for immediate errors
    if (!ticketResponse.ok) {
      throw new Error(
        `Expo API error: ${ticketResponse.status} ${ticketResponse.statusText}`
      );
    }

    const ticketData = await ticketResponse.json();
    const tickets = Array.isArray(ticketData?.data)
      ? ticketData.data
      : ticketData?.data
        ? [ticketData.data]
        : [];

    console.log(
      '🎫 [Backend] Expo tickets:',
      JSON.stringify(tickets, null, 2)
    );

    // Check for ticket errors
    const failedTickets = tickets.filter((t: any) => t.status === 'error');
    if (failedTickets.length > 0) {
      console.error('❌ [Backend] Ticket errors:', failedTickets);
      throw new Error(
        `Push failed: ${failedTickets.map((t: any) => t.message).join('; ')}`
      );
    }

    // Extract valid ticket IDs
    const ticketIds = tickets
      .filter((t: any) => t.status === 'ok' && t.id)
      .map((t: any) => t.id);

    console.log(
      `✅ [Backend] ${ticketIds.length} ticket(s) accepted by Expo`
    );

    // 4. Check receipts after delay (optional but recommended)
    if (ticketIds.length > 0) {
      // Schedule receipt check
      // In production, you'd want to queue this as a delayed job
      setTimeout(() => {
        checkReceiptsAsync(ticketIds);
      }, 2000);
    }
  } catch (error) {
    console.error('❌ [Backend] Notification error:', error);
    // Don't throw — notification failures shouldn't break message sending
  }
}

/**
 * Send the actual push request to Expo
 */
async function sendPushToExpo(
  recipientToken: string,
  data: MessageData
): Promise<Response> {
  const payload = {
    to: recipientToken,
    sound: 'default',
    title: data.senderName,
    body:
      data.text.length > 100
        ? data.text.substring(0, 100) + '...'
        : data.text,
    data: {
      messageId: data.messageId,
      chatId: data.chatId,
      senderId: data.senderId,
      type: 'message',
    },
    priority: 'high',
    channelId: 'default',
  };

  console.log('📤 [Backend] POST to https://exp.host/--/api/v2/push/send');
  console.log('   Payload:', JSON.stringify(payload, null, 2));

  return fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

/**
 * Check receipts asynchronously
 * Receipts contain the final delivery status
 * Should be called 2-3 seconds after ticket creation
 */
async function checkReceiptsAsync(ticketIds: string[]): Promise<void> {
  try {
    console.log('📋 [Backend] Checking receipts for:', ticketIds);

    const receiptRes = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ ids: ticketIds }),
    });

    if (!receiptRes.ok) {
      console.error(
        `⚠️ [Backend] Receipt check failed: ${receiptRes.status}`
      );
      return;
    }

    const receiptData = await receiptRes.json();
    const receipts = receiptData?.data || {};

    console.log(
      '📋 [Backend] Receipts:',
      JSON.stringify(receipts, null, 2)
    );

    // Analyze results
    Object.entries(receipts).forEach(([ticketId, receipt]: [string, any]) => {
      if (receipt.status === 'ok') {
        console.log(`   ✅ Ticket ${ticketId}: Delivered`);
      } else if (receipt.status === 'error') {
        console.error(
          `   ❌ Ticket ${ticketId}: ${receipt.message} (${receipt.details?.error})`
        );

        // Handle DeviceNotRegistered
        if (receipt.details?.error === 'DeviceNotRegistered') {
          console.warn(
            '   → Token invalid. Consider removing from DB or marking stale.'
          );
          // In production: remove the token from Firestore
          // await removeTokenFromDB(userId);
        }
      } else {
        console.log(`   ⏳ Ticket ${ticketId}: ${receipt.status}`);
      }
    });
  } catch (error) {
    console.error('❌ [Backend] Receipt check error:', error);
    // Receipt check failures shouldn't be fatal
  }
}

// ──────────────────────────────────────────────
// Express endpoint example
// ──────────────────────────────────────────────

/*
import express from 'express';
import { sendNotification } from './notifications';

const app = express();
app.use(express.json());

// Called when message is sent
app.post('/api/messages/send', async (req, res) => {
  try {
    const { recipientId, senderId, senderName, text, conversationId, messageId } = req.body;

    // 1. Create message in Firestore (your existing code)
    // ...

    // 2. Create notification document in Firestore (your existing code)
    // ...

    // 3. Send push notification to recipient's device
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
*/

// ──────────────────────────────────────────────
// messagesService — conversations + messages
// ──────────────────────────────────────────────
// Data model
//   conversations/{id}         → Conversation doc
//   conversations/{id}/messages/{msgId} → Message doc
//
// Indexes needed (create in Firebase console):
//   conversations: participants (array‑contains) + updatedAt (desc)
//   messages:      createdAt (desc)  — automatic on sub‑collection

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  DocumentSnapshot,
  Timestamp,
  increment,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PAGE_SIZE } from '@/constants';
import type { Conversation, Message } from '@/types';
import { sendPushNotification } from '@/services/pushNotificationSender';
import { getRecipientToken } from './firebaseService';
import { createNotification } from './notificationsService';


// ─── Helpers ─────────────────────────────────

function conversationsRef() {
  return collection(db, COLLECTIONS.CONVERSATIONS);
}

function messagesRef(conversationId: string) {
  return collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES);
}

/** Deterministic conversation id for 2 users */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

// ─── Conversation queries ────────────────────

export async function getOrCreateConversation(
  myUid: string,
  otherUid: string,
): Promise<Conversation> {
  const id = getConversationId(myUid, otherUid);
  const ref = doc(db, COLLECTIONS.CONVERSATIONS, id);
  const snap = await getDoc(ref);

  if (snap.exists()) return { id: snap.id, ...snap.data() } as Conversation;

  const now = Date.now();
  const convo: Conversation = {
    id,
    participants: [myUid, otherUid],
    unreadCount: { [myUid]: 0, [otherUid]: 0 },
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(ref, convo);
  return convo;
}

export async function getConversations(uid: string): Promise<Conversation[]> {
  const q = query(
    conversationsRef(),
    where('participants', 'array-contains', uid),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
}

// ─── Messages queries ────────────────────────

export async function getMessages(
  conversationId: string,
  pageParam?: DocumentSnapshot,
): Promise<{ messages: Message[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    messagesRef(conversationId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const snap = await getDocs(q);
  const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { messages, lastDoc };
}

// ─── Realtime listener (Firebase fallback when WS down) ──────

export function onMessagesSnapshot(
  conversationId: string,
  callback: (messages: Message[]) => void,
) {
  const q = query(
    messagesRef(conversationId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message));
    callback(messages);
  });
}

// ─── Send message ────────────────────────────

// ─── Send message ────────────────────────────

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<Message> {
  console.log('📨 [sendMessage START] conversationId:', conversationId, 'senderId:', senderId);
  
  const now = Date.now();
  const msg: Omit<Message, 'id'> = {
    conversationId,
    senderId,
    text,
    status: 'sent',
    createdAt: now,
  };

  // 1. Save message
  console.log('📝 Saving message to Firestore...');
  const ref = await addDoc(messagesRef(conversationId), msg);
  console.log('✅ Message saved, ID:', ref.id);

  // 2. Update conversation & get other user
  console.log('📋 Fetching conversation document...');
  let convoRef = doc(db, 'conversations', conversationId);
  let convoSnap = await getDoc(convoRef);
  console.log('📋 Conversation exists?', convoSnap.exists());
  
  // If conversation doesn't exist, try to create it
  if (!convoSnap.exists()) {
    console.warn('⚠️ Conversation not found, attempting to extract participants from ID...');
    // Conversation ID format: uid1_uid2 (sorted)
    const participants = conversationId.split('_');
    if (participants.length === 2) {
      console.log('Creating conversation with participants:', participants);
      const newConvo: Conversation = {
        id: conversationId,
        participants,
        lastMessage: { text, senderId, timestamp: now },
        unreadCount: { [participants[0]]: 0, [participants[1]]: 0 },
        createdAt: now,
        updatedAt: now,
      };
      await setDoc(convoRef, newConvo);
      console.log('✅ Conversation created');
      convoSnap = await getDoc(convoRef);
    }
  }
  
  if (convoSnap.exists()) {
    const convo = convoSnap.data();
    console.log('👥 Participants:', convo.participants);
    
    const otherUid = convo.participants?.find((p: string) => p !== senderId) ?? '';
    console.log('🔍 Other user ID:', otherUid);
    
    await updateDoc(convoRef, {
      lastMessage: { text, senderId, timestamp: now },
      updatedAt: now,
      [`unreadCount.${otherUid}`]: increment(1),
    });
    console.log('✅ Conversation updated');

    // 3. Get sender info for notifications
    if (otherUid) {
      console.log('========== NOTIFICATION CREATION START ==========');
      const senderDoc = await getDoc(doc(db, 'users', senderId));
      const senderName = senderDoc.data()?.displayName || 
                         senderDoc.data()?.name || 
                         'Someone';
      console.log('👤 Sender name:', senderName);

      // 4. Create notification document in Firestore
      try {
        console.log('📝 Creating notification...');
        console.log('   recipientId:', otherUid);
        console.log('   senderId:', senderId);
        console.log('   senderName:', senderName);
        console.log('   messageId:', ref.id);
        console.log('   conversationId:', conversationId);
        console.log('   text:', text.substring(0, 50));
        
        const notif = await createNotification(
          otherUid,
          senderId,
          senderName,
          ref.id,
          conversationId,
          text
        );
        console.log('✅ Notification document created:', notif.id);
        console.log('✅ Full notification:', notif);
      } catch (err) {
        console.error('❌ Failed to create notification doc:', err);
        console.error('   Error type:', err instanceof Error ? err.constructor.name : typeof err);
        console.error('   Error message:', err instanceof Error ? err.message : JSON.stringify(err));
        console.error('   Full error:', err);
      }
      console.log('========== NOTIFICATION CREATION END ==========');

      // 5. Send push notification (fire and forget)
      console.log('========== PUSH NOTIFICATION START ==========');
      console.log('🚀 Sending push notification to:', otherUid);
      sendPushNotificationToRecipient(
        otherUid,
        ref.id,
        conversationId,
        senderId,
        senderName,
        text
      ).catch(err => {
        console.error('❌ Push notification failed:', err);
      });
      console.log('========== PUSH NOTIFICATION END ==========');
    } else {
      console.warn('⚠️ No other user found in conversation');
    }
  } else {
    console.error('❌ Conversation document could not be created or found');
  }

  console.log('📨 [sendMessage END]');
  return { id: ref.id, ...msg };
}

// Helper function to send push notification
async function sendPushNotificationToRecipient(
  recipientId: string,
  messageId: string,
  conversationId: string,
  senderId: string,
  senderName: string,
  text: string,
): Promise<void> {
  try {
    console.log('📱 Looking up push token for:', recipientId);
    const recipientToken = await getRecipientToken(recipientId);
    
    if (!recipientToken) {
      console.log('⚠️ No push token found for recipient:', recipientId);
      return;
    }
    
    console.log('✅ Found push token:', recipientToken.slice(0, 20) + '...');

    // Send the notification with recipientUserId for error handling
    await sendPushNotification(recipientToken, {
      messageId,
      chatId: conversationId,
      senderId,
      senderName,
      text,
      recipientUserId: recipientId, // ✅ Pass recipient ID for DeviceNotRegistered handling
    });
    
    console.log('✅ Push notification sent successfully');
  } catch (error) {
    console.error('❌ Error in sendPushNotificationToRecipient:', error);
    throw error;
  }
}

// ─── Mark read ───────────────────────────────

export async function markConversationRead(
  conversationId: string,
  uid: string,
): Promise<void> {
  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  await updateDoc(convoRef, { [`unreadCount.${uid}`]: 0 });
}

// ─── Update message status ───────────────────

export async function updateMessageStatus(
  conversationId: string,
  messageId: string,
  status: Message['status'],
): Promise<void> {
  const ref = doc(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES, messageId);
  await updateDoc(ref, { status });
}

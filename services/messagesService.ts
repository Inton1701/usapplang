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
  deleteDoc,
} from 'firebase/firestore';
import { getInfoAsync } from 'expo-file-system/legacy';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PAGE_SIZE } from '@/constants';
import type { Conversation, Message, MessageAttachment } from '@/types';
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

  // Check if they are contacts
  const contactsRef = collection(db, COLLECTIONS.USERS, myUid, COLLECTIONS.CONTACTS);
  const contactQuery = query(contactsRef, where('uid', '==', otherUid));
  const contactSnap = await getDocs(contactQuery);
  const areContacts = !contactSnap.empty;

  const now = Date.now();
  const convo: Conversation = {
    id,
    participants: [myUid, otherUid],
    status: areContacts ? 'active' : 'pending', // pending if not contacts
    initiatedBy: myUid,
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

// ─── Send message ────────────────────────────

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  text: string;
  attachments?: MessageAttachment[];
  localId?: string;
}

export async function uploadAttachment(
  conversationId: string,
  file: { uri: string; type: string; name: string; size: number; duration?: number },
): Promise<MessageAttachment> {
  console.log('[uploadAttachment] Starting upload:', { conversationId, file });

  try {
    // Get accurate file size
    let fileSize = file.size;
    if (file.uri.startsWith('file://')) {
      try {
        const fileInfo = await getInfoAsync(file.uri);
        if (fileInfo.exists && typeof fileInfo.size === 'number') {
          fileSize = fileInfo.size;
          console.log('[uploadAttachment] Got accurate file size:', fileSize);
        }
      } catch (fsError) {
        console.log('[uploadAttachment] getInfoAsync failed, using provided size:', fsError);
      }
    }

    // Validate file size (5MB limit)
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size (${(fileSize / 1024 / 1024).toFixed(2)}MB) exceeds 5MB limit`);
    }

    // Convert file to base64 (same method as profile pictures)
    console.log('[uploadAttachment] Converting to base64...');
    const response = await fetch(file.uri);
    const blob = await response.blob();
    
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = result.split(',')[1] || result;
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log('[uploadAttachment] Base64 conversion complete, length:', base64.length);

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${conversationId}_${timestamp}_${sanitizedName}`;

    // Determine attachment type
    let attachmentType: 'image' | 'file' | 'voice' = 'file';
    if (file.type.startsWith('image/')) {
      attachmentType = 'image';
    } else if (file.type.startsWith('audio/')) {
      attachmentType = 'voice';
    }

    // Store as base64 in Firestore (same as profile pictures)
    const attachmentDoc = {
      fileName,
      base64Data: base64,
      contentType: file.type,
      size: fileSize,
      conversationId,
      uploadedAt: serverTimestamp(),
    };

    const attachmentsRef = collection(db, 'attachments');
    const docRef = await addDoc(attachmentsRef, attachmentDoc);

    console.log('[uploadAttachment] Saved to Firestore:', docRef.id);

    // Return attachment metadata
    const attachment: MessageAttachment = {
      id: docRef.id,
      url: docRef.id, // Use document ID as reference
      type: attachmentType,
      name: file.name,
      size: fileSize,
      mimeType: file.type,
      ...(file.duration && { duration: file.duration }), // Add duration for audio files
    };

    console.log('[uploadAttachment] Upload complete:', attachment);
    return attachment;
  } catch (error) {
    console.error('[uploadAttachment] Upload failed:', error);
    if (error instanceof Error) {
      console.error('[uploadAttachment] Error message:', error.message);
      console.error('[uploadAttachment] Error stack:', error.stack);
    }
    throw error;
  }
}

export async function sendMessage({
  conversationId,
  senderId,
  text,
  attachments = [],
  localId,
}: SendMessageParams): Promise<Message> {
  console.log('📨 [sendMessage START] conversationId:', conversationId, 'senderId:', senderId);
  
  const now = Date.now();
  const msg: Omit<Message, 'id'> = {
    conversationId,
    senderId,
    text,
    attachments,
    status: 'sent',
    createdAt: now,
    localId,
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
        status: 'active',
        initiatedBy: ''
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
    
    
    // Determine message type from attachments
    let messageType: 'text' | 'image' | 'file' | 'audio' = 'text';
    if (attachments.length > 0) {
      const firstAttachment = attachments[0];
      if (firstAttachment.type === 'image') messageType = 'image';
      else if (firstAttachment.type === 'voice') messageType = 'audio';
      else if (firstAttachment.type === 'file') messageType = 'file';
    }
    
    await updateDoc(convoRef, {
      lastMessage: { 
        text, 
        senderId, 
        timestamp: now,
        type: messageType,
        deleted: false,
      },
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

// ─── Message request actions ─────────────────

export async function acceptMessageRequest(
  conversationId: string,
  myUid: string,
  otherUid: string,
): Promise<void> {
  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  await updateDoc(convoRef, { status: 'active', updatedAt: Date.now() });

  // Add each other as contacts
  const myContactRef = doc(db, COLLECTIONS.USERS, myUid, COLLECTIONS.CONTACTS, otherUid);
  const otherContactRef = doc(db, COLLECTIONS.USERS, otherUid, COLLECTIONS.CONTACTS, myUid);
  const now = Date.now();
  await Promise.all([
    setDoc(myContactRef, { uid: otherUid, addedAt: now }),
    setDoc(otherContactRef, { uid: myUid, addedAt: now }),
  ]);
}

export async function declineMessageRequest(conversationId: string): Promise<void> {
  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  await updateDoc(convoRef, { status: 'declined', updatedAt: Date.now() });
}

// ─── Delete message ──────────────────────────

export async function deleteMessage(
  conversationId: string,
  messageId: string,
  userId: string,
  userName: string,
): Promise<void> {
  const ref = doc(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES, messageId);
  
  // Get the message first to check if it's the last message
  const msgSnap = await getDoc(ref);
  if (!msgSnap.exists()) return;
  
  const msgData = msgSnap.data() as Message;
  
  // Update the message as deleted
  await updateDoc(ref, {
    deleted: true,
    deletedAt: Date.now(),
    text: `${userName} deleted a message`,
    senderName: userName,
    attachments: [], // Remove attachments when deleted
  });
  
  // If this is the last message in the conversation, update the conversation's lastMessage
  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  const convoSnap = await getDoc(convoRef);
  if (convoSnap.exists()) {
    const convo = convoSnap.data() as Conversation;
    // Check if the deleted message is the last message
    if (convo.lastMessage?.timestamp === msgData.createdAt) {
      await updateDoc(convoRef, {
        'lastMessage.deleted': true,
        'lastMessage.text': `${userName} deleted a message`,
      });
    }
  }
}

// ─── Attachment helpers ──────────────────────

export async function getAttachmentData(attachmentId: string): Promise<string> {
  try {
    const docRef = doc(db, 'attachments', attachmentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Attachment not found');
    }
    
    const data = docSnap.data();
    // Return as data URL for display
    return `data:${data.contentType};base64,${data.base64Data}`;
  } catch (error) {
    console.error('[getAttachmentData] Failed to retrieve attachment:', error);
    throw error;
  }
}

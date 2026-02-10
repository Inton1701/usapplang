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

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<Message> {
  const now = Date.now();
  const msg: Omit<Message, 'id'> = {
    conversationId,
    senderId,
    text,
    status: 'sent',
    createdAt: now,
  };

  const ref = await addDoc(messagesRef(conversationId), msg);

  // Update conversation's lastMessage + bump unreadCount for other participant
  const convoRef = doc(db, COLLECTIONS.CONVERSATIONS, conversationId);
  const convoSnap = await getDoc(convoRef);
  if (convoSnap.exists()) {
    const convo = convoSnap.data() as Conversation;
    const otherUid = convo.participants.find((p) => p !== senderId) ?? '';
    await updateDoc(convoRef, {
      lastMessage: { text, senderId, timestamp: now },
      updatedAt: now,
      [`unreadCount.${otherUid}`]: increment(1),
    });
  }

  return { id: ref.id, ...msg };
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

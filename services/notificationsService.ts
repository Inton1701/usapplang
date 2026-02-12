// ──────────────────────────────────────────────
// notificationsService — notification history
// ──────────────────────────────────────────────
// Firestore structure:
//   users/{uid}/notifications/{notifId} → Notification doc

import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  deleteDoc,
  onSnapshot,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PAGE_SIZE } from '@/constants';
import type { Notification } from '@/types';

// ─── Helpers ─────────────────────────────────

function notificationsRef(userId: string) {
  return collection(db, 'users', userId, COLLECTIONS.NOTIFICATIONS);
}

// ─── Create notification ────────────────────

export async function createNotification(
  recipientId: string,
  senderId: string,
  senderName: string,
  messageId: string,
  conversationId: string,
  messageText: string,
): Promise<Notification> {
  console.log('[createNotification] START');
  console.log('  Recipient collection path: users/' + recipientId + '/notifications');
  
  const now = Date.now();
  const messagePreview = messageText.length > 100 
    ? messageText.substring(0, 100) + '...' 
    : messageText;

  const notif: Omit<Notification, 'id'> = {
    recipientId,
    senderId,
    senderName,
    messageId,
    conversationId,
    messagePreview,
    isRead: false,
    createdAt: now,
  };

  console.log('[createNotification] Notification object:', notif);
  
  try {
    console.log('[createNotification] Calling addDoc...');
    const ref = await addDoc(notificationsRef(recipientId), notif);
    console.log('[createNotification] ✅ Document created with ID:', ref.id);
    const result = { id: ref.id, ...notif };
    console.log('[createNotification] Returning:', result);
    return result;
  } catch (error) {
    console.error('[createNotification] ❌ addDoc failed:', error);
    console.error('[createNotification] Error type:', error instanceof Error ? error.constructor.name : typeof error);
    throw error;
  }
}

// ─── Get notifications (paginated) ──────────

export async function getNotifications(
  userId: string,
  pageParam?: DocumentSnapshot,
): Promise<{ notifications: Notification[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    notificationsRef(userId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const snap = await getDocs(q);
  const notifications = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Notification)
  );
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { notifications, lastDoc };
}

// ─── Mark notification as read ──────────────

export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const ref = doc(db, 'users', userId, COLLECTIONS.NOTIFICATIONS, notificationId);
  await updateDoc(ref, { isRead: true });
}

// ─── Mark all notifications as read ────────

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await getDocs(
    query(notificationsRef(userId), where('isRead', '==', false))
  );

  for (const docSnap of snap.docs) {
    await updateDoc(docSnap.ref, { isRead: true });
  }
}

// ─── Delete notification ───────────────────

export async function deleteNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  const ref = doc(db, 'users', userId, COLLECTIONS.NOTIFICATIONS, notificationId);
  await deleteDoc(ref);
}

// ─── Realtime listener ─────────────────────

export function onNotificationsSnapshot(
  userId: string,
  callback: (notifications: Notification[]) => void,
) {
  const q = query(
    notificationsRef(userId),
    orderBy('createdAt', 'desc'),
    limit(PAGE_SIZE),
  );
  return onSnapshot(q, (snap) => {
    const notifications = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Notification)
    );
    callback(notifications);
  });
}

// ─── Get unread count ──────────────────────

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const snap = await getDocs(
    query(notificationsRef(userId), where('isRead', '==', false))
  );
  return snap.size;
}

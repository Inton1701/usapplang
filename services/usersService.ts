// ──────────────────────────────────────────────
// usersService — Admin CRUD on the `users` collection
// ──────────────────────────────────────────────

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS, PAGE_SIZE } from '@/constants';
import type { User } from '@/types';

// ─── Queries ─────────────────────────────────

export async function getUser(uid: string): Promise<User | null> {
  console.log('[usersService] getUser called for uid:', uid);
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    console.log('[usersService] getUser - document exists:', snap.exists());
    if (snap.exists()) {
      const user = { uid: snap.id, ...snap.data() } as User;
      console.log('[usersService] getUser - user data:', user);
      return user;
    }
    console.log('[usersService] getUser - user not found');
    return null;
  } catch (error) {
    console.error('[usersService] getUser error:', error);
    throw error;
  }
}

export async function getUsers(
  searchQuery?: string,
  pageParam?: DocumentSnapshot,
): Promise<{ users: User[]; lastDoc: DocumentSnapshot | null }> {
  // Strategy: Client-side filtering for case-insensitive search
  // Firestore doesn't support case-insensitive queries or full-text search
  // For small-medium user bases, fetch all users and filter client-side
  // For production at scale, consider: Algolia, Typesense, or store lowercase fields
  
  let q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy('name'),
    limit(100), // Fetch more for client-side filtering
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  const snap = await getDocs(q);
  let users = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
  
  // Client-side case-insensitive filtering
  if (searchQuery && searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    users = users.filter(user => {
      const nameMatch = user.name?.toLowerCase().includes(query);
      const emailMatch = user.email?.toLowerCase().includes(query);
      return nameMatch || emailMatch;
    });
  }
  
  // Limit results after filtering
  users = users.slice(0, PAGE_SIZE);
  const lastDoc = snap.docs[snap.docs.length - 1] ?? null;
  return { users, lastDoc };
}

// ─── Mutations (Admin) ──────────────────────

export async function createUser(data: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
  console.log('[usersService] createUser called with data:', data);
  try {
    const now = Date.now();
    const user: User = { ...data, createdAt: now, updatedAt: now };
    console.log('[usersService] Creating user document in Firestore:', user);
    await setDoc(doc(db, COLLECTIONS.USERS, user.uid), user);
    console.log('[usersService] User document created successfully');
    return user;
  } catch (error) {
    console.error('[usersService] createUser error:', error);
    throw error;
  }
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, uid), {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
}

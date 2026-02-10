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
  let q = query(
    collection(db, COLLECTIONS.USERS),
    orderBy('name'),
    limit(PAGE_SIZE),
  );

  if (pageParam) {
    q = query(q, startAfter(pageParam));
  }

  // Firestore doesn't support full‑text search.
  // For simple prefix matching we use range queries on `name`.
  if (searchQuery) {
    const end = searchQuery + '\uf8ff';
    q = query(
      collection(db, COLLECTIONS.USERS),
      orderBy('name'),
      where('name', '>=', searchQuery),
      where('name', '<=', end),
      limit(PAGE_SIZE),
    );
  }

  const snap = await getDocs(q);
  const users = snap.docs.map((d) => ({ uid: d.id, ...d.data() } as User));
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

// ──────────────────────────────────────────────
// contactsService — manage contacts sub‑collection
// ──────────────────────────────────────────────
// Data model: users/{uid}/contacts/{contactUid}
// This avoids a top‑level join and keeps reads scoped.

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import type { Contact, User } from '@/types';

function contactsRef(uid: string) {
  return collection(db, COLLECTIONS.USERS, uid, COLLECTIONS.CONTACTS);
}

// ─── Queries ─────────────────────────────────

export async function getContacts(uid: string): Promise<Contact[]> {
  const snap = await getDocs(query(contactsRef(uid), orderBy('addedAt', 'desc')));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as Contact));
}

/** Search all users (for "add contact" flow) */
export { getUsers as searchUsers } from './usersService';

// ─── Mutations ───────────────────────────────

export async function addContact(myUid: string, contactUid: string): Promise<void> {
  const contact: Contact = { uid: contactUid, addedAt: Date.now() };
  // Both sides get the contact (mutual)
  await Promise.all([
    setDoc(doc(contactsRef(myUid), contactUid), contact),
    setDoc(doc(contactsRef(contactUid), myUid), { uid: myUid, addedAt: Date.now() }),
  ]);
}

export async function removeContact(myUid: string, contactUid: string): Promise<void> {
  await Promise.all([
    deleteDoc(doc(contactsRef(myUid), contactUid)),
    deleteDoc(doc(contactsRef(contactUid), myUid)),
  ]);
}

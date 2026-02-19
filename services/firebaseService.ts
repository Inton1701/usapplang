import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase'; // Your firebase config

export async function saveTokenToFirebase(
  userId: string,
  token: string
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', userId),
      {
        pushToken: token,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log('Token saved to Firebase');
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
}

export async function getRecipientToken(userId: string): Promise<string | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data()?.pushToken || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting recipient token:', error);
    return null;
  }
}

export async function removeTokenFromFirebase(userId: string): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', userId),
      { pushToken: null },
      { merge: true }
    );
  } catch (error) {
    console.error('Error removing token:', error);
  }
}
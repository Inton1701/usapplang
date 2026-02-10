

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  // TODO: Replace with your Firebase project config
  apiKey: process.env.EXPO_PUBLIC_FB_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FB_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FB_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FB_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FB_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FB_APP_ID,
};

// Prevent double‑init during fast‑refresh
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth instance (persistence is automatic in modern Firebase)
export const auth = getAuth(app);

export const db = getFirestore(app);

export default app;

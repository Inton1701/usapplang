// ──────────────────────────────────────────────
// useAuth — Firebase auth state + login/logout
// ──────────────────────────────────────────────

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  signInAnonymously,
  createUserWithEmailAndPassword,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser, getUser } from '@/services/usersService';
import type { User } from '@/types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginAnonymous: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[useAuth] Setting up auth state listener');
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      console.log('[useAuth] Auth state changed:', fbUser ? `User: ${fbUser.uid}` : 'No user');
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          console.log('[useAuth] Fetching user profile for uid:', fbUser.uid);
          const profile = await getUser(fbUser.uid);
          console.log('[useAuth] User profile fetched:', profile);
          setUser(profile);
        } catch (error) {
          console.error('[useAuth] Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        console.log('[useAuth] No user, clearing profile');
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[useAuth] Login attempt for email:', email);
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      console.log('[useAuth] Login successful, user uid:', result.user.uid);
    } catch (error) {
      console.error('[useAuth] Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    console.log('[useAuth] Registration attempt for email:', email, 'name:', name);
    setLoading(true);
    try {
      console.log('[useAuth] Creating Firebase auth user...');
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[useAuth] Firebase user created, uid:', cred.user.uid);
      console.log('[useAuth] Creating user profile in Firestore...');
      await createUser({
        uid: cred.user.uid,
        name,
        email,
        status: 'online',
        isOnline: true,
        lastActiveAt: Date.now(),
      });
      console.log('[useAuth] User profile created successfully');
    } catch (error) {
      console.error('[useAuth] Registration failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const loginAnonymous = useCallback(async () => {
    console.log('[useAuth] Anonymous login attempt');
    setLoading(true);
    try {
      console.log('[useAuth] Signing in anonymously...');
      const cred = await signInAnonymously(auth);
      console.log('[useAuth] Anonymous user created, uid:', cred.user.uid);
      // Create a user profile for the anonymous user
      console.log('[useAuth] Creating user profile for anonymous user...');
      await createUser({
        uid: cred.user.uid,
        name: `User ${cred.user.uid.slice(0, 6)}`,
        email: '',
        status: 'online',
        isOnline: true,
        lastActiveAt: Date.now(),
      });
      console.log('[useAuth] Anonymous user profile created successfully');
    } catch (error) {
      console.error('[useAuth] Anonymous login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      // Clear push token before logging out
      if (firebaseUser) {
        const { removeTokenFromFirebase } = await import('@/services/firebaseService');
        try {
          await removeTokenFromFirebase(firebaseUser.uid);
          console.log('[useAuth] Push token removed on logout');
        } catch (err) {
          console.warn('[useAuth] Failed to remove push token on logout:', err);
          // Don't fail logout if token removal fails
        }
      }
      
      await signOut(auth);
      console.log('[useAuth] Logout successful');
    } catch (error) {
      console.error('[useAuth] Logout failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, login, register, loginAnonymous, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

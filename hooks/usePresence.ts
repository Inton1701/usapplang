// ──────────────────────────────────────────────
// usePresence — manage user online/offline status
// ──────────────────────────────────────────────
// Updates user presence in Firestore when app state changes

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { useAuth } from './useAuth';

export function usePresence() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, COLLECTIONS.USERS, user.uid);

    // Set online when component mounts
    const setOnline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: true,
          lastActiveAt: Date.now(),
          status: 'online',
        });
        console.log('[usePresence] User set to online');
      } catch (error) {
        console.error('[usePresence] Error setting online:', error);
      }
    };

    // Set offline when component unmounts or app backgrounds
    const setOffline = async () => {
      try {
        await updateDoc(userRef, {
          isOnline: false,
          lastActiveAt: Date.now(),
          status: 'offline',
        });
        console.log('[usePresence] User set to offline');
      } catch (error: any) {
        // Suppress "Missing or insufficient permissions" error during logout
        // This is expected when auth token is cleared before cleanup runs
        if (error?.code === 'permission-denied') {
          console.log('[usePresence] Skipped setOffline during logout (expected)');
          return;
        }
        console.error('[usePresence] Error setting offline:', error);
      }
    };

    // Handle app state changes
    const handleAppStateChange = (state: AppStateStatus) => {
      if (state === 'active') {
        setOnline();
      } else if (state === 'background' || state === 'inactive') {
        setOffline();
      }
    };

    setOnline();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup: set offline when component unmounts
    return () => {
      setOffline();
      subscription.remove();
    };
  }, [user]);
}

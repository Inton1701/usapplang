// ──────────────────────────────────────────────
// useUserPresence — Real-time user presence subscription
// ──────────────────────────────────────────────

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { useAuth } from './useAuth';
import type { User } from '@/types';

/**
 * Subscribe to real-time presence updates for a specific user
 * Uses TanStack Query for caching and automatic updates
 */
export function useUserPresence(uid: string | undefined) {
  const qc = useQueryClient();
  const { firebaseUser } = useAuth();

  return useQuery<User | null>({
    queryKey: ['user', uid],
    queryFn: async () => {
      if (!uid || !firebaseUser) return null;
      
      console.log('[useUserPresence] Initial fetch for uid:', uid);
      
      // Set up real-time listener
      return new Promise<User | null>((resolve) => {
        const unsubscribe = onSnapshot(
          doc(db, COLLECTIONS.USERS, uid),
          (snapshot) => {
            if (snapshot.exists()) {
              const userData = { uid: snapshot.id, ...snapshot.data() } as User;
              console.log('[useUserPresence] Snapshot update for:', userData.name, {
                isOnline: userData.isOnline,
                lastActiveAt: userData.lastActiveAt,
                status: userData.status,
                source: snapshot.metadata.fromCache ? 'cache' : 'server',
              });
              
              // Update cache immediately on snapshot
              qc.setQueryData(['user', uid], userData);
              
              // Resolve initial promise
              resolve(userData);
            } else {
              console.log('[useUserPresence] User not found:', uid);
              resolve(null);
            }
          },
          (error) => {
            // Suppress permission-denied errors that occur during logout
            if ((error as any)?.code === 'permission-denied') {
              console.log('[useUserPresence] Permission denied (expected during logout)');
              resolve(null);
              return;
            }
            console.error('[useUserPresence] Snapshot error for uid:', uid, error);
            resolve(null);
          }
        );

        // Store unsubscribe for cleanup
        return () => {
          console.log('[useUserPresence] Unsubscribing from uid:', uid);
          unsubscribe();
        };
      });
    },
    enabled: !!uid && !!firebaseUser,
    staleTime: Infinity, // Real-time subscription keeps it fresh
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes after unmount
  });
}

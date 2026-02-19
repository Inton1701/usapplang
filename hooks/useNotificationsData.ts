// ──────────────────────────────────────────────
// useNotificationsData — notifications query hook
// ──────────────────────────────────────────────

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getNotifications, getUnreadNotificationCount } from '@/services/notificationsService';
import { QK } from '@/constants';
import type { Notification } from '@/types';

/**
 * Fetch paginated notifications
 */
export function useNotificationsQuery(userId: string | null) {
  return useInfiniteQuery({
    queryKey: QK.NOTIFICATIONS(userId || ''),
    queryFn: ({ pageParam }) => getNotifications(userId || '', pageParam),
    getNextPageParam: (lastPage) => lastPage.lastDoc,
    enabled: !!userId,
  });
}

/**
 * Fetch all notifications in one query (no pagination)
 */
export function useNotificationsListQuery(userId: string | null) {
  return useQuery({
    queryKey: QK.NOTIFICATIONS(userId || ''),
    queryFn: () => getNotifications(userId || ''),
    enabled: !!userId,
  });
}

/**
 * Get unread notification count
 */
export function useUnreadNotificationsCount(userId: string | null) {
  return useQuery({
    queryKey: [...QK.NOTIFICATIONS(userId || ''), 'unread'],
    queryFn: () => getUnreadNotificationCount(userId || ''),
    enabled: !!userId,
    refetchInterval: 30000, // Recheck every 30 seconds
  });
}

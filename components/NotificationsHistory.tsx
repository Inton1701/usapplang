// ──────────────────────────────────────────────
// NotificationsHistory — shows notification list
// ──────────────────────────────────────────────

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Text, Row, Avatar, Spacer, Divider } from '@/components';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import type { Notification } from '@/types';
import {
  getNotifications,
  markNotificationRead,
  deleteNotification,
  onNotificationsSnapshot,
} from '@/services/notificationsService';

interface NotificationsHistoryProps {
  userId: string | null;
}

export function NotificationsHistory({ userId }: NotificationsHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load notifications
  useEffect(() => {
    if (!userId) {
      console.warn('NotificationsHistory: no userId provided');
      return;
    }

    console.log('NotificationsHistory: loading for user', userId);

    const load = async () => {
      try {
        console.log('Fetching notifications from:', `users/${userId}/notifications`);
        const { notifications } = await getNotifications(userId);
        console.log('Loaded notifications:', notifications.length, notifications);
        setNotifications(notifications);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    load();

    // Subscribe to real-time updates
    console.log('Setting up real-time listener for', userId);
    const unsub = onNotificationsSnapshot(userId, (notifs) => {
      console.log('Real-time update:', notifs.length, 'notifications');
      setNotifications(notifs);
    });
    return unsub;
  }, [userId]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const { notifications } = await getNotifications(userId);
      setNotifications(notifications);
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, [userId]);

  // Handle notification tap
  const handleNotificationTap = useCallback(
    async (notification: Notification) => {
      if (!userId) return;

      // Mark as read
      if (!notification.isRead) {
        try {
          await markNotificationRead(userId, notification.id);
        } catch (err) {
          console.error('Failed to mark as read:', err);
        }
      }

      // Navigate to chat
      router.push({
        pathname: '/(chat)/[conversationId]',
        params: {
          conversationId: notification.conversationId,
          otherUid: notification.senderId,
        },
      });
    },
    [userId]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (notification: Notification) => {
      if (!userId) return;
      try {
        await deleteNotification(userId, notification.id);
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      } catch (err) {
        console.error('Failed to delete:', err);
      }
    },
    [userId]
  );

  // Empty state
  if (!loading && notifications.length === 0) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Ionicons name="notifications-off-outline" size={48} color="#d1d5db" />
        <Spacer size={12} />
        <Text className="text-gray-500 text-center">No notifications yet</Text>
      </View>
    );
  }

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Render notification item
  const renderItem = ({ item }: { item: Notification }) => {
    const time = new Date(item.createdAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const date = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <>
        <Pressable
          onPress={() => handleNotificationTap(item)}
          className={`px-4 py-3 ${item.isRead ? 'bg-white' : 'bg-blue-50'}`}
        >
          <Row align="flex-start">
            {/* Sender avatar */}
            <Avatar
              fallbackText={item.senderName.charAt(0)}
              size={48}
            />
            
            {/* Notification content */}
            <View className="flex-1 ml-3">
              <Row align="center" className="mb-1">
                <Text className="font-semibold flex-1" numberOfLines={1}>
                  {item.senderName}
                </Text>
                {!item.isRead && (
                  <View className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </Row>
              
              <Text
                variant="muted"
                className="text-sm mb-1"
                numberOfLines={2}
              >
                {item.messagePreview}
              </Text>
              
              <Row align="center">
                <Text variant="muted" className="text-xs flex-1">
                  {date} at {time}
                </Text>
                <Pressable
                  onPress={() => handleDelete(item)}
                  className="active:opacity-50"
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color="#9ca3af" />
                </Pressable>
              </Row>
            </View>
          </Row>
        </Pressable>
        <Divider className="ml-16" />
      </>
    );
  };

  return (
    <FlatList
      data={notifications}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      className="bg-white"
    />
  );
}

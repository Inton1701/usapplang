// ──────────────────────────────────────────────
// Notifications screen — notification history
// ──────────────────────────────────────────────

import React from 'react';
import { View } from 'react-native';
import { Screen, NotificationsHistory } from '@/components';
import { Text } from '@/components';
import { useAuth } from '@/hooks/useAuth';

export default function NotificationsScreen() {
  const { user } = useAuth();

  return (
    <Screen>
      <View className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
        <Text variant="title" className="text-2xl">Notifications</Text>
      </View>

      {user?.uid ? (
        <NotificationsHistory userId={user.uid} />
      ) : (
        <View className="flex-1 items-center justify-center">
          <Text>Loading...</Text>
        </View>
      )}
    </Screen>
  );
}

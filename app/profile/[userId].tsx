// ──────────────────────────────────────────────
// User Profile screen — view other user's profile
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Text, Avatar, Button, Divider } from '@/components';
import { useUserPresence } from '@/hooks/useUserPresence';
import { formatLastSeen } from '@/utils/format';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { data: user, isLoading } = useUserPresence(userId);
  const { width } = Dimensions.get('window');

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-gray-500 text-center">User not found</Text>
          <Button
            onPress={() => router.back()}
            className="mt-4"
          >
            Go Back
          </Button>
        </View>
      </Screen>
    );
  }

  const statusText = user.isOnline
    ? 'Online'
    : user.lastActiveAt
      ? `Active ${formatLastSeen(Date.now() - user.lastActiveAt)} ago`
      : 'Offline';

  return (
    <Screen>
      <ScrollView className="flex-1">
        {/* Header with back button */}
        <View className="px-4 pt-4 pb-2 flex-row items-center">
          <Pressable onPress={() => router.back()}>
            <Text className="text-blue-500 text-base">← Back</Text>
          </Pressable>
        </View>

        {/* Profile Header */}
        <View className="items-center py-6 px-4">
          <Avatar
            source={user.photoURL}
            fallbackText={user.name}
            size={120}
            isOnline={user.isOnline}
            showPresence
          />
          
          <Text className="text-2xl font-bold mt-4">{user.name}</Text>
          
          <View className="flex-row items-center mt-2">
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                user.isOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <Text variant="muted" className="text-sm">
              {statusText}
            </Text>
          </View>
        </View>

        <Divider />

        {/* Profile Information */}
        <View className="px-4 py-4">
          <Text className="text-lg font-semibold mb-3">About</Text>
          
          <View className="mb-4">
            <Text variant="muted" className="text-xs mb-1">Email</Text>
            <Text className="text-base">{user.email}</Text>
          </View>

          {user.status && user.status !== 'online' && (
            <View className="mb-4">
              <Text variant="muted" className="text-xs mb-1">Status</Text>
              <Text className="text-base capitalize">{user.status}</Text>
            </View>
          )}
        </View>

        {/* Photo Gallery */}
        {user.photos && user.photos.length > 0 && (
          <>
            <Divider />
            <View className="px-4 py-4">
              <Text className="text-lg font-semibold mb-3">
                Photos ({user.photos.length})
              </Text>
              <View className="flex-row flex-wrap">
                {user.photos.map((photoUrl, index) => (
                  <Pressable
                    key={index}
                    className="mr-2 mb-2"
                    style={{ width: (width - 48) / 3, height: (width - 48) / 3 }}
                  >
                    <Avatar
                      source={photoUrl}
                      fallbackText=""
                      size={(width - 48) / 3}
                      className="rounded-lg"
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Action Buttons */}
        <View className="px-4 py-6">
          <Button
            onPress={() => {
              router.back();
              // The chat should already be open when coming from chat screen
            }}
            variant="primary"
            className="mb-3"
          >
            Send Message
          </Button>
        </View>
      </ScrollView>
    </Screen>
  );
}

// ──────────────────────────────────────────────
// StoriesCarousel — Horizontal scrollable user avatars
// ──────────────────────────────────────────────

import React, { memo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Avatar } from './Avatar';
import { Text } from './Text';
import type { User } from '@/types';

export interface StoriesCarouselProps {
  users: User[];
  onUserPress?: (user: User) => void;
  isLoading?: boolean;
  className?: string;
}

const StoryItem = memo(({ user, onPress }: { user: User; onPress?: (user: User) => void }) => {
  console.log('[StoriesCarousel] Rendering story for:', user.name, 'isOnline:', user.isOnline);
  
  return (
    <Pressable
      onPress={() => onPress?.(user)}
      className="items-center mr-4 active:opacity-70"
      accessibilityLabel={`View ${user.name}'s story`}
    >
      <View className="relative">
        <Avatar
          source={user.photoURL}
          fallbackText={user.name}
          size={64}
          isOnline={user.isOnline}
          showPresence
          className="border-2 border-blue-500"
        />
      </View>
      <Text className="text-xs mt-1 text-gray-700 max-w-[68px]" numberOfLines={1}>
        {user.name}
      </Text>
    </Pressable>
  );
});

StoryItem.displayName = 'StoryItem';

export const StoriesCarousel = memo(function StoriesCarousel({
  users,
  onUserPress,
  isLoading = false,
  className = '',
}: StoriesCarouselProps) {
  console.log('[StoriesCarousel] Rendering with', users.length, 'users, isLoading:', isLoading);

  if (isLoading) {
    return (
      <View className={`bg-white py-4 px-4 border-b border-gray-100 ${className}`}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  if (!users || users.length === 0) {
    return (
      <View className={`bg-white py-4 px-4 border-b border-gray-100 ${className}`}>
        <Text variant="muted" className="text-xs text-center">
          No contacts online
        </Text>
      </View>
    );
  }

  return (
    <View className={`bg-white border-b border-gray-100 ${className}`}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        {users.map((user) => (
          <StoryItem key={user.uid} user={user} onPress={onUserPress} />
        ))}
      </ScrollView>
    </View>
  );
});

// ──────────────────────────────────────────────
// Profile Modal — shows user profile with photo carousel
// ──────────────────────────────────────────────

import React from 'react';
import { View, Modal, Pressable, ScrollView } from 'react-native';
import { Text, Avatar, ProfileCarousel, Row, Spacer } from '@/components';
import { CloseIcon } from '@/components/icons';
import { formatLastSeen } from '@/utils/format';
import type { User } from '@/types';

export interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: User | null;
}

export function ProfileModal({ visible, onClose, user }: ProfileModalProps) {
  if (!user) return null;

  const photos = user.photos || (user.photoURL ? [user.photoURL] : []);
  const isOnline = user.isOnline ?? false;
  const lastSeen = user.lastActiveAt ? formatLastSeen(user.lastActiveAt) : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 pt-12 pb-4 border-b border-gray-200">
          <Text variant="title" className="text-xl">Profile</Text>
          <Pressable onPress={onClose} className="p-2">
            <CloseIcon size={24} color="#374151" />
          </Pressable>
        </View>

        <ScrollView>
          {/* Photo Carousel */}
          {photos.length > 0 && (
            <ProfileCarousel photos={photos} showDots={photos.length > 1} />
          )}

          <View className="px-4 py-6">
            {/* Name and status */}
            <Row align="center" className="mb-4">
              <Avatar
                source={user.photoURL}
                fallbackText={user.name}
                size={60}
                isOnline={isOnline}
                showPresence
              />
              <View className="flex-1 ml-4">
                <Text className="text-2xl font-bold">{user.name}</Text>
                <Text variant="muted" className="text-sm">
                  {isOnline ? 'Online' : lastSeen ? lastSeen : 'Offline'}
                </Text>
              </View>
            </Row>

            <Spacer size={16} />

            {/* Email */}
            {user.email && (
              <View className="mb-4">
                <Text variant="muted" className="text-xs mb-1">Email</Text>
                <Text className="text-base">{user.email}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

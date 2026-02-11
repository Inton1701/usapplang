// ──────────────────────────────────────────────
// Admin — User detail / edit screen
// ──────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Screen,
  Text,
  Input,
  Avatar,
  Button,
  Row,
  Spacer,
  IconButton,
} from '@/components';
import { BackIcon } from '@/components/icons';
import { QK } from '@/constants';
import { getUser, updateUser } from '@/services/usersService';
import { showToast } from '@/providers/ToastProvider';
import type { User } from '@/types';

export default function UserDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const qc = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: QK.USER(userId),
    queryFn: () => getUser(userId),
    enabled: !!userId,
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [status, setStatus] = useState<User['status']>('offline');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setPhotoURL(user.photoURL ?? '');
      setStatus(user.status);
    }
  }, [user]);

  const updateMut = useMutation({
    mutationFn: (data: Partial<User>) => updateUser(userId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.USER(userId) });
      qc.invalidateQueries({ queryKey: QK.USERS });
      showToast('success', 'User updated');
    },
    onError: () => {
      showToast('error', 'Update failed');
    },
  });

  const handleSave = () => {
    updateMut.mutate({ name, email, photoURL: photoURL || undefined, status });
  };

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
        <View className="flex-1 items-center justify-center">
          <Text variant="muted">User not found</Text>
          <Spacer size={12} />
          <Button variant="ghost" onPress={() => router.back()}>Go Back</Button>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
        <Row align="center">
          <IconButton
            icon={<BackIcon size={24} color="#374151" />}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          />
          <Text variant="title" className="flex-1 ml-2 text-xl">
            Edit User
          </Text>
        </Row>
      </View>

      <ScrollView className="flex-1 bg-white px-4 pt-6">
        {/* Avatar preview */}
        <View className="items-center mb-6">
          <Avatar
            source={photoURL || undefined}
            fallbackText={name}
            size={80}
          />
          <Text variant="muted" className="mt-2 text-xs">UID: {user.uid}</Text>
        </View>

        {/* Fields */}
        <Text variant="muted" className="mb-1 ml-1">Name</Text>
        <Input value={name} onChangeText={setName} placeholder="Name" />
        <Spacer size={16} />

        <Text variant="muted" className="mb-1 ml-1">Email</Text>
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Spacer size={16} />

        <Text variant="muted" className="mb-1 ml-1">Photo URL</Text>
        <Input
          value={photoURL}
          onChangeText={setPhotoURL}
          placeholder="https://…"
          autoCapitalize="none"
        />
        <Spacer size={16} />

        <Text variant="muted" className="mb-1 ml-1">Status</Text>
        <Row gap={2}>
          {(['online', 'offline', 'away'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={status === s ? 'primary' : 'ghost'}
              onPress={() => setStatus(s)}
            >
              {s}
            </Button>
          ))}
        </Row>
        <Spacer size={16} />

        <Text variant="muted" className="text-xs">
          Created: {new Date(user.createdAt).toLocaleString()}{'\n'}
          Updated: {new Date(user.updatedAt).toLocaleString()}
        </Text>

        <Spacer size={24} />

        <Button onPress={handleSave} loading={updateMut.isPending}>
          Save Changes
        </Button>

        <Spacer size={40} />
      </ScrollView>
    </Screen>
  );
}

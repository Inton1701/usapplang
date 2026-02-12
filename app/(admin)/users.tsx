// ──────────────────────────────────────────────
// Admin — Users list screen
// ──────────────────────────────────────────────

import React, { useState } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  Screen,
  Text,
  Input,
  Avatar,
  Row,
  Divider,
  Button,
  IconButton,
  Spacer,
} from '@/components';
import { SearchIcon, BackIcon, CloseIcon } from '@/components/icons';
import { Ionicons } from '@expo/vector-icons';
import { QK } from '@/constants';
import { getUsers, deleteUser, createUser } from '@/services/usersService';
import type { User } from '@/types';

export default function AdminUsersScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  // ── Form state ──
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: [...QK.USERS, 'admin', search],
    queryFn: () => getUsers(search || undefined),
  });

  const deleteMut = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.USERS });
    },
  });

  const createMut = useMutation({
    mutationFn: async ({ name, email, password }: { name: string; email: string; password: string }) => {
      console.log('[AdminUsersScreen] Creating user with email and password');
      // Create Firebase Auth user
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      console.log('[AdminUsersScreen] Auth user created, uid:', cred.user.uid);
      // Create Firestore profile
      await createUser({
        uid: cred.user.uid,
        name,
        email,
        status: 'offline',
        isOnline: false,
        lastActiveAt: Date.now(),
      });
      console.log('[AdminUsersScreen] User profile created');
      return cred.user;
    },
    onSuccess: () => {
      console.log('[AdminUsersScreen] User creation successful');
      qc.invalidateQueries({ queryKey: QK.USERS });
      setShowCreate(false);
      setFormName('');
      setFormEmail('');
      setFormPassword('');
    },
    onError: (error) => {
      console.error('[AdminUsersScreen] User creation failed:', error);
      Alert.alert('Error', 'Failed to create user. Check console for details.');
    },
  });

  const handleDelete = (uid: string, name: string) => {
    Alert.alert('Delete User', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteMut.mutate(uid),
      },
    ]);
  };

  const handleCreate = () => {
    console.log('[AdminUsersScreen] handleCreate called');
    if (!formName.trim() || !formEmail.trim()) {
      Alert.alert('Validation', 'Name and email are required');
      return;
    }
    if (!formPassword || formPassword.length < 6) {
      Alert.alert('Validation', 'Password must be at least 6 characters');
      return;
    }
    console.log('[AdminUsersScreen] Creating user:', formName, formEmail);
    createMut.mutate({
      name: formName.trim(),
      email: formEmail.trim(),
      password: formPassword,
    });
  };

  const renderUser = ({ item }: { item: User }) => (
    <>
      <Pressable
        onPress={() => router.push(`/(admin)/users/${item.uid}`)}
        className="active:bg-gray-50"
      >
        <Row align="center" className="px-4 py-3">
          <Avatar source={item.photoURL} fallbackText={item.name} size={44} />
          <View className="flex-1 ml-3">
            <Text className="font-semibold">{item.name}</Text>
            <Text variant="muted" className="text-xs">{item.email || 'No email'}</Text>
          </View>
          <Text variant="muted" className="text-xs mr-2">
            {item.status}
          </Text>
          <Pressable
            onPress={() => handleDelete(item.uid, item.name)}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </Pressable>
        </Row>
      </Pressable>
      <Divider className="ml-16" />
    </>
  );

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
            Admin — Users
          </Text>
          <Button size="sm" onPress={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : '+ New'}
          </Button>
        </Row>

        <Spacer size={8} />

        <Input
          placeholder="Search users…"
          value={search}
          onChangeText={setSearch}
          leftIcon={<SearchIcon size={18} color="#9ca3af" />}
        />
      </View>

      {/* Create form */}
      {showCreate && (
        <View className="bg-blue-50 p-4 border-b border-blue-100">
          <Text className="font-semibold mb-2">Create New User</Text>
          <Input placeholder="Name" value={formName} onChangeText={setFormName} />
          <Spacer size={8} />
          <Input
            placeholder="Email"
            value={formEmail}
            onChangeText={setFormEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Spacer size={8} />
          <Input
            placeholder="Password (min 6 characters)"
            value={formPassword}
            onChangeText={setFormPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <Spacer size={12} />
          <Button onPress={handleCreate} loading={createMut.isPending}>
            Create User
          </Button>
        </View>
      )}

      {/* User list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={data?.users}
          keyExtractor={(u) => u.uid}
          renderItem={renderUser}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center pt-20">
              <Text variant="muted">No users found</Text>
            </View>
          }
          className="bg-white flex-1"
        />
      )}
    </Screen>
  );
}

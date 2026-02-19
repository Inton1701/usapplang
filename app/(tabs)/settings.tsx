// ──────────────────────────────────────────────
// Settings screen
// ──────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Avatar, Row, Spacer, Divider, Button } from '@/components';
import { SettingsIcon } from '@/components/icons';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { usePresence } from '@/hooks/usePresence';
import { useDev } from '@/providers/DevProvider';
import { useNotifications } from '@/hooks/usePushNotification';
import * as Clipboard from 'expo-clipboard';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isDevMode } = useDev();
  const { expoPushToken } = useNotifications(user?.uid || null);

  // Log token for easy viewing in terminal
  useEffect(() => {
    if (expoPushToken) {
      console.log(' Expo Push Token:', expoPushToken);
    }
  }, [expoPushToken]);
  
  // Track user presence (online/offline)
  usePresence();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };


  const SettingsRow = ({
    icon,
    label,
    onPress,
    color = '#374151',
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }) => (
    <>
      <Pressable onPress={onPress} className="active:bg-gray-50">
        <Row align="center" className="px-4 py-3.5">
          <Ionicons name={icon as any} size={22} color={color} />
          <Text className="flex-1 ml-3" style={{ color }}>
            {label}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#d1d5db" />
        </Row>
      </Pressable>
      <Divider className="ml-12" />
    </>
  );

  return (
    <Screen>
      <View className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
        <Text variant="title" className="text-2xl">Settings</Text>
      </View>

      <View className="bg-white mt-3">
        {/* Profile section */}
        <Row align="center" className="px-4 py-4">
          <Avatar
            source={user?.photoURL}
            fallbackText={user?.name ?? '?'}
            size={56}
          />
          <View className="flex-1 ml-4">
            <Text className="font-semibold text-lg">{user?.name}</Text>
            <Text variant="muted">{user?.email || 'Guest account'}</Text>
          </View>
        </Row>
        <Divider />
      </View>

      <Spacer size={16} />

      <View className="bg-white">
        <SettingsRow icon="person-outline" label="Edit Profile" onPress={() => {}} />
        <SettingsRow 
          icon="notifications-outline" 
          label="Notifications" 
          onPress={() => router.push('/(tabs)/notifications')} 
        />
        <SettingsRow
          icon="person-outline"
          label="Edit Profile"
          onPress={() => router.push('/account')}
        />
        <SettingsRow icon="moon-outline" label="Appearance" onPress={() => {}} />
      </View>

      
      {/* Admin entry (dev only) */}
      {isDevMode && (
        <>
          <Spacer size={16} />
          <View className="bg-white">
            <SettingsRow
              icon="construct-outline"
              label="Admin Panel (Dev)"
              onPress={() => router.push('/(admin)/users')}
              color="#f59e0b"
            />
          </View>
        </>
      )}

      <Spacer size={16} />

      <View className="bg-white">
        <SettingsRow
          icon="log-out-outline"
          label="Log Out"
          onPress={handleLogout}
          color="#ef4444"
        />
      </View>
    </Screen>
  );
}
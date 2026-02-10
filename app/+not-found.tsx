// ──────────────────────────────────────────────
// 404 — Page Not Found
// ──────────────────────────────────────────────

import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Text, Button, Spacer } from '@/components';
import { Ionicons } from '@expo/vector-icons';

export default function NotFoundScreen() {
  return (
    <Screen>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={72} color="#d1d5db" />
        <Spacer size={16} />
        <Text variant="title" className="text-3xl text-center">
          404
        </Text>
        <Text variant="muted" className="text-center mt-2 mb-8">
          This page doesn't exist or has been moved.
        </Text>
        <Button onPress={() => router.replace('/(auth)/login')}>
          Back to Login
        </Button>
      </View>
    </Screen>
  );
}

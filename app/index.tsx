// ──────────────────────────────────────────────
// App index — redirect to correct route based on auth
// ──────────────────────────────────────────────

import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)/contacts" />;
  }

  return <Redirect href="/(auth)/login" />;
}

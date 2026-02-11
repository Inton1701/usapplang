// ──────────────────────────────────────────────
// Root layout — wraps the entire app with providers
// ──────────────────────────────────────────────

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';
import { DevProvider, ErrorBoundary, ToastProvider } from '@/providers';
import '../global.css';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <DevProvider>
              <ToastProvider>
                <StatusBar style="dark" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen
                    name="(chat)"
                    options={{ animation: 'slide_from_right' }}
                  />
                  <Stack.Screen name="(admin)" />
                  <Stack.Screen name="+not-found" />
                </Stack>
              </ToastProvider>
            </DevProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

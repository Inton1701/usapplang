// ──────────────────────────────────────────────
// Root layout — wraps the entire app with providers
// ──────────────────────────────────────────────

import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider } from '@/hooks/useAuth';
import { DevProvider, ErrorBoundary, ToastProvider, ChatHeadProvider } from '@/providers';
import { ChatHeadPortal } from '@/components/chat-head';
import { NotificationSetup } from '@/hooks/usePushNotification';
import { getLastNotificationAsync } from '@/services/notificationService';
import { PushNotificationData } from '@/types/notification';
import '../global.css';


export default function RootLayout() {
  const router = useRouter();

  // Handle initial notification when app launches from killed state
  useEffect(() => {
    const handleInitialNotification = async () => {
      try {
        const notification = await getLastNotificationAsync();
        if (notification) {
          const data = notification.request.content.data as PushNotificationData;
          console.log('🎯 Handling initial notification from killed state:', data);
          
          if (data.chatId) {
            router.push({
              pathname: '/(chat)/[conversationId]',
              params: {
                conversationId: data.chatId,
                otherUid: data.senderId,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error handling initial notification:', error);
      }
    };

    // Wait for initial navigation to settle
    const timer = setTimeout(handleInitialNotification, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <ChatHeadProvider>
                <NotificationSetup>
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
                      {/* Floating chat head — rendered above the navigator,
                          pointerEvents="box-none" on the portal so navigation
                          gestures pass through uninhibited */}
                      <ChatHeadPortal />
                    </ToastProvider>
                  </DevProvider>
                </NotificationSetup>
              </ChatHeadProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

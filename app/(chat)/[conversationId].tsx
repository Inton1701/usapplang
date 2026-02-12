// ──────────────────────────────────────────────
// Chat screen — realtime messaging
// ──────────────────────────────────────────────

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Screen,
  ChatHeader,
  MessageListItem,
  MessageComposer,
  TypingIndicator,
  ReadReceipt,
  IconButton,
} from '@/components';
import { PhoneIcon, VideoIcon } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { useMessages, useSendMessage, useMarkRead } from '@/hooks/useMessages';
import { useWebSocketChat } from '@/hooks/useWebSocketChat';
import { useUserPresence } from '@/hooks/useUserPresence';
import { onMessagesSnapshot } from '@/services/messagesService';
import { formatLastSeen } from '@/utils/format';
import type { Message, User } from '@/types';

export default function ChatScreen() {
  const { conversationId, otherUid } = useLocalSearchParams<{
    conversationId: string;
    otherUid?: string;
  }>();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // ── Other user info (real-time presence) ──
  const { data: otherUser, isLoading: isLoadingUser } = useUserPresence(otherUid);

  // Log presence data for debugging
  React.useEffect(() => {
    if (otherUser && otherUid) {
      console.log('[ChatScreen] Other user presence update:', {
        uid: otherUser.uid,
        name: otherUser.name,
        isOnline: otherUser.isOnline,
        lastActiveAt: otherUser.lastActiveAt,
        status: otherUser.status,
        timestamp: Date.now(),
      });
    }
  }, [otherUser, otherUid]);

  // ── Messages (infinite scroll) ──
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(conversationId);

  const messages = useMemo(
    () => data?.pages.flatMap((p) => p.messages) ?? [],
    [data],
  );

  // ── Send message ──
  const sendMut = useSendMessage(conversationId);

  const handleSend = useCallback(
    (text: string) => sendMut.mutate(text),
    [sendMut],
  );

  // ── Mark read on mount ──
  const markRead = useMarkRead(conversationId);
  useEffect(() => {
    markRead.mutate();
  }, [conversationId]);

  // ── WebSocket integration ──
  const { isConnected, sendTyping } = useWebSocketChat(conversationId);

  // ── Firebase fallback when WS is not connected ──
  useEffect(() => {
    if (isConnected) return; // WS handles it
    const unsub = onMessagesSnapshot(conversationId, () => {
      // The snapshot listener triggers a refetch for fresh data
      // We don't directly set messages — TanStack is the source of truth.
    });
    return unsub;
  }, [conversationId, isConnected]);

  // ── Typing indicator state ──
  const [peerTyping, setPeerTyping] = useState(false);

  // ── Scroll to bottom when keyboard shows ──
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100);
    });
    return () => showSub.remove();
  }, []);

  // ── Render message item ──
  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isOutgoing = item.senderId === user?.uid;
      return (
        <View className="mb-1">
          <MessageListItem
            message={item.text}
            isOutgoing={isOutgoing}
            timestamp={new Date(item.createdAt).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
            senderName={isOutgoing ? undefined : otherUser?.name}
            senderAvatar={isOutgoing ? undefined : otherUser?.photoURL}
            showAvatar={!isOutgoing}
          />
          {isOutgoing && (
            <View className="self-end mr-4 -mt-1">
              <ReadReceipt status={item.status === 'sending' ? 'sent' : item.status} />
            </View>
          )}
        </View>
      );
    },
    [user, otherUser],
  );

  return (
    <Screen safe={false}>
      <View style={{ flex: 1, paddingTop: insets.top }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={0}
        >
          {/* Header */}
          <ChatHeader
            title={otherUser?.name ?? 'Chat'}
            subtitle={
              otherUser?.isOnline
                ? 'Online'
                : otherUser?.lastActiveAt
                  ? `Last seen ${formatLastSeen(otherUser.lastActiveAt)}`
                  : ''
            }
            avatar={otherUser?.photoURL}
            isOnline={otherUser?.isOnline}
            onBackPress={() => router.back()}
            rightActions={
              <View className="flex-row">
                <IconButton
                  icon={<PhoneIcon size={20} color="#3b82f6" />}
                  accessibilityLabel="Voice call"
                  onPress={() => {}}
                />
                <IconButton
                  icon={<VideoIcon size={20} color="#3b82f6" />}
                  accessibilityLabel="Video call"
                  onPress={() => {}}
                  className="ml-1"
                />
              </View>
            }
          />

          {/* Message list */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={renderItem}
              inverted
              contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
              onEndReached={() => {
                if (hasNextPage && !isFetchingNextPage) fetchNextPage();
              }}
              onEndReachedThreshold={0.3}
              ListFooterComponent={
                isFetchingNextPage ? (
                  <ActivityIndicator size="small" color="#3b82f6" className="py-4" />
                ) : null
              }
              ListHeaderComponent={
                peerTyping ? (
                  <TypingIndicator userName={otherUser?.name} className="mb-2 ml-2" />
                ) : null
              }
            />
          )}

          {/* Composer */}
          <View style={{ paddingBottom: insets.bottom }}>
            <MessageComposer onSend={handleSend} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

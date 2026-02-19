// ──────────────────────────────────────────────
// MiniChatWindow — fully functional inline chat panel
//
// • Real-time Firestore message history (onSnapshot)
// • Typable TextInput with send button
// • Keyboard-aware (shifts up when keyboard shows)
// • Scrollable message list (auto-scrolls to bottom)
// • Opens full conversation screen via "↗" button
// • Animated ZoomIn/ZoomOut entrance
// • Multi-conversation tabs when >1 unread peer
// ──────────────────────────────────────────────

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { sendMessage } from '@/services/messagesService';
import { markConversationRead } from '@/services/messagesService';
import { useChatHead, type ChatHeadPeer } from '@/providers/ChatHeadProvider';
import { useAuth } from '@/hooks/useAuth';
import { Text } from '@/components/ui/Text';
import type { Message } from '@/types';
import { formatRelative } from '@/utils/format';

// ─── Constants ─────────────────────────────────

const WINDOW_WIDTH = 300;
/** How many messages to load in the mini window */
const MINI_MSG_LIMIT = 20;
/** Bottom offset so the window sits above the bubble */
const PANEL_BOTTOM = 84;

// ─── Inner live chat panel ─────────────────────

interface LivePanelProps {
  peer: ChatHeadPeer;
  onOpenFull: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

function LivePanel({ peer, onOpenFull, onMinimize, onClose }: LivePanelProps) {
  const { user } = useAuth();
  const flatListRef = useRef<FlatList<Message>>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const conversationId = peer.conversation.id;
  const avatarUri = peer.user.photoURL ?? peer.user.photos?.[0];

  // ── Real-time message subscription ──────────
  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS, conversationId, COLLECTIONS.MESSAGES),
      orderBy('createdAt', 'desc'),
      limit(MINI_MSG_LIMIT),
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Message))
        .reverse(); // show oldest→newest
      setMessages(msgs);
      // scroll to bottom after new message
      requestAnimationFrame(() =>
        flatListRef.current?.scrollToEnd({ animated: true }),
      );
    });
    return unsub;
  }, [conversationId]);

  // ── Mark read when panel is open ────────────
  useEffect(() => {
    if (user?.uid) {
      markConversationRead(conversationId, user.uid).catch(() => {});
    }
  }, [conversationId, user?.uid]);

  // ── Send message ─────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !user?.uid || sending) return;
    setText('');
    setSending(true);
    try {
      await sendMessage({
        conversationId,
        senderId: user.uid,
        text: trimmed,
        localId: `mini_${Date.now()}`,
      });
    } finally {
      setSending(false);
    }
  }, [text, user?.uid, conversationId, sending]);

  // ── Render a single message bubble ──────────
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = item.senderId === user?.uid;
      return (
        <View
          style={[
            styles.msgRow,
            isMine ? styles.msgRowMine : styles.msgRowTheirs,
          ]}
        >
          <View
            style={[
              styles.msgBubble,
              isMine ? styles.msgBubbleMine : styles.msgBubbleTheirs,
            ]}
          >
            {item.deleted ? (
              <Text style={styles.msgDeleted}>Message deleted</Text>
            ) : item.attachments && item.attachments.length > 0 ? (
              <Text style={styles.msgText}>
                {item.attachments[0].type === 'image'
                  ? '📷 Photo'
                  : item.attachments[0].type === 'voice'
                  ? '🎵 Voice'
                  : '📎 File'}
              </Text>
            ) : (
              <Text style={isMine ? styles.msgTextMine : styles.msgText}>
                {item.text}
              </Text>
            )}
            <Text style={isMine ? styles.msgTimeMine : styles.msgTime}>
              {formatRelative(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [user?.uid],
  );

  return (
    <>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerAvatarFallback}>
              <Text style={styles.headerInitials}>
                {peer.user.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.headerName} numberOfLines={1}>
              {peer.user.name}
            </Text>
            <Text style={styles.headerStatus}>
              {peer.user.isOnline ? '● Online' : 'Offline'}
            </Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          {/* Open full screen */}
          <Pressable
            style={styles.actionBtn}
            onPress={onOpenFull}
            hitSlop={8}
            accessibilityLabel="Open full conversation"
          >
            <Text style={styles.actionBtnText}>↗</Text>
          </Pressable>
          {/* Minimise to bubble */}
          <Pressable
            style={styles.actionBtn}
            onPress={onMinimize}
            hitSlop={8}
            accessibilityLabel="Minimise"
          >
            <Text style={styles.actionBtnText}>−</Text>
          </Pressable>
          {/* Close entirely */}
          <Pressable
            style={styles.actionBtn}
            onPress={onClose}
            hitSlop={8}
            accessibilityLabel="Close chat head"
          >
            <Text style={styles.actionBtnText}>×</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Scrollable message list ── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Say hello 👋</Text>
        }
      />

      {/* ── Composer ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.composer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Aa"
            placeholderTextColor="#8a8d91"
            multiline
            maxLength={1000}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
            accessibilityLabel="Type a message"
          />
          <Pressable
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim() || sending}
            accessibilityLabel="Send message"
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Main exported component ───────────────────

export function MiniChatWindow() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    visibility,
    unreadPeers,
    activePeer,
    snappedSide,
    collapseToBubble,
    hide,
    setActivePeer,
  } = useChatHead();

  const isOpen = visibility === 'mini-window';

  // Prevent the tap that opened the window from immediately
  // landing on the backdrop and closing it again (touch-bleed).
  const [backdropReady, setBackdropReady] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setBackdropReady(false);
      return;
    }
    const t = setTimeout(() => setBackdropReady(true), 320);
    return () => clearTimeout(t);
  }, [isOpen]);

  const handleOpenFull = useCallback(
    (peer: ChatHeadPeer) => {
      hide();
      router.push({
        pathname: '/(chat)/[conversationId]',
        params: { conversationId: peer.conversation.id, otherUid: peer.user.uid },
      });
    },
    [hide],
  );

  if (!isOpen || !activePeer) return null;

  // Position the panel near the snapped edge
  const panelRight = snappedSide === 'right' ? insets.right + 8 : undefined;
  const panelLeft = snappedSide === 'left' ? insets.left + 8 : undefined;
  const maxPanelHeight = Math.min(420, H * 0.55);

  return (
    <>
      {/* Backdrop — tap to collapse.
          pointerEvents="box-none" so the child Pressable receives events.
          Pressable is disabled until backdropReady to avoid touch-bleed. */}
      <Animated.View
        entering={FadeIn.duration(120)}
        exiting={FadeOut.duration(120)}
        style={styles.backdrop}
        pointerEvents="box-none"
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={collapseToBubble}
          disabled={!backdropReady}
        />
      </Animated.View>

      {/* Panel */}
      <Animated.View
        entering={ZoomIn.springify().damping(16).stiffness(220)}
        exiting={ZoomOut.duration(140)}
        style={[
          styles.window,
          {
            right: panelRight,
            left: panelLeft,
            bottom: PANEL_BOTTOM + insets.bottom,
            maxHeight: maxPanelHeight,
          },
        ]}
      >
        <LivePanel
          peer={activePeer}
          onOpenFull={() => handleOpenFull(activePeer)}
          onMinimize={collapseToBubble}
          onClose={hide}
        />

        {/* Multi-peer tabs */}
        {unreadPeers.length > 1 && (
          <View style={styles.peersSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.peersScrollContent}
            >
              {unreadPeers.map((peer) => {
                const isActive = peer.conversation.id === activePeer.conversation.id;
                const uri = peer.user.photoURL ?? peer.user.photos?.[0];
                return (
                  <Pressable
                    key={peer.conversation.id}
                    style={[styles.peerTab, isActive && styles.peerTabActive]}
                    onPress={() => setActivePeer(peer)}
                  >
                    <View style={styles.peerTabAvatarWrap}>
                      {uri ? (
                        <Image source={{ uri }} style={styles.peerTabAvatar} />
                      ) : (
                        <View style={styles.peerTabAvatarFallback}>
                          <Text style={styles.peerTabInitials}>
                            {peer.user.name[0].toUpperCase()}
                          </Text>
                        </View>
                      )}
                      {peer.unreadCount > 0 && !isActive && (
                        <View style={styles.peerBadge}>
                          <Text style={styles.peerBadgeText}>
                            {peer.unreadCount > 9 ? '9+' : peer.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.peerTabName} numberOfLines={1}>
                      {peer.user.name.split(' ')[0]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Animated.View>
    </>
  );
}

// ─── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9997,
  },
  window: {
    position: 'absolute',
    width: WINDOW_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 9998,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#1877F2',
    gap: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    minWidth: 0,
  },
  headerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInitials: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerStatus: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
    flexShrink: 0,
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  // ── Message list ──
  messageList: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  messageListContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#8a8d91',
    fontSize: 13,
    paddingVertical: 16,
  },
  msgRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  msgRowMine: {
    justifyContent: 'flex-end',
  },
  msgRowTheirs: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '82%',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  msgBubbleMine: {
    backgroundColor: '#1877F2',
    borderBottomRightRadius: 4,
  },
  msgBubbleTheirs: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  msgText: {
    fontSize: 13,
    color: '#1c1e21',
    lineHeight: 18,
  },
  msgTextMine: {
    fontSize: 13,
    color: '#fff',
    lineHeight: 18,
  },
  msgDeleted: {
    fontSize: 12,
    color: '#8a8d91',
    fontStyle: 'italic',
  },
  msgTime: {
    fontSize: 9,
    color: '#8a8d91',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  msgTimeMine: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  // ── Composer ──
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e6eb',
    gap: 6,
  },
  input: {
    flex: 1,
    minHeight: 34,
    maxHeight: 80,
    backgroundColor: '#f0f2f5',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'ios' ? 8 : 6,
    paddingBottom: Platform.OS === 'ios' ? 8 : 6,
    fontSize: 14,
    color: '#1c1e21',
    lineHeight: 18,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#bec3c9',
  },
  sendBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  // ── Peer tabs ──
  peersSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e6eb',
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  peersScrollContent: {
    paddingHorizontal: 10,
    gap: 8,
  },
  peerTab: {
    alignItems: 'center',
    width: 52,
    gap: 3,
    opacity: 0.65,
  },
  peerTabActive: {
    opacity: 1,
  },
  peerTabAvatarWrap: {
    position: 'relative',
  },
  peerTabAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  peerTabAvatarFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1877F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peerTabInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  peerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E41E3F',
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  peerBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '800',
  },
  peerTabName: {
    fontSize: 10,
    color: '#4b4f56',
    textAlign: 'center',
  },
});

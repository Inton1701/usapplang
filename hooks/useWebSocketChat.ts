// ──────────────────────────────────────────────
// useWebSocketChat — wire WS events → TanStack cache
// ──────────────────────────────────────────────
// When WS is connected, new messages arrive here instantly.
// If WS drops, the chat screen falls back to a Firestore
// onSnapshot listener (see useMessages + chat screen).

import { useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/lib/wsClient';
import { QK } from '@/constants';
import { useAuth } from './useAuth';
import type { WSEvent, WSNewMessagePayload, WSStatusPayload, WSDeletedMessagePayload, Message } from '@/types';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL ?? 'ws://localhost:8080';

export function useWebSocketChat(conversationId?: string) {
  const { firebaseUser } = useAuth();
  const qc = useQueryClient();
  const connected = useRef(false);

  // ── Connect on mount ─────────────────────
  useEffect(() => {
    if (!firebaseUser) return;

    firebaseUser.getIdToken().then((token) => {
      wsClient.connect(WS_URL, token);
      connected.current = true;
      console.log('[WS] Connected and authenticated');
    });

    return () => {
      wsClient.disconnect();
      connected.current = false;
    };
  }, [firebaseUser]);

  // ── Subscribe to specific conversation on mount ──
  useEffect(() => {
    if (!conversationId || !connected.current) return;

    console.log(`[WS] Subscribing to conversation: ${conversationId}`);
    wsClient.subscribe(conversationId);

    return () => {
      console.log(`[WS] Unsubscribing from conversation: ${conversationId}`);
      wsClient.unsubscribe(conversationId);
    };
  }, [conversationId, firebaseUser]);

  // ── Handle AppState (foreground / background) ──
  useEffect(() => {
    const handler = (state: AppStateStatus) => {
      if (state === 'active') {
        wsClient.onForeground();
      } else {
        wsClient.onBackground();
      }
    };
    const sub = AppState.addEventListener('change', handler);
    return () => sub.remove();
  }, []);

  // ── Subscribe to new messages → inject into cache ──
  useEffect(() => {
    const unsub = wsClient.on('message:new', (event: WSEvent) => {
      const { message, conversationId: cid } = event.payload as WSNewMessagePayload;

      console.log(`[WS] Received message:new for conversation ${cid}`, message);

      // Update message list cache
      qc.setQueryData(QK.MESSAGES(cid), (old: any) => {
        if (!old) return old;
        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          messages: [message, ...newPages[0].messages],
        };
        return { ...old, pages: newPages };
      });

      // Invalidate conversations so unread counts refresh
      if (firebaseUser) {
        qc.invalidateQueries({ queryKey: QK.CONVERSATIONS(firebaseUser.uid) });
      }
    });

    return unsub;
  }, [qc, firebaseUser]);

  // ── Subscribe to status changes ──
  useEffect(() => {
    const unsub = wsClient.on('message:status', (event: WSEvent) => {
      const { messageId, conversationId: cid, status } = event.payload as WSStatusPayload;

      qc.setQueryData(QK.MESSAGES(cid), (old: any) => {
        if (!old) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((m: Message) =>
            m.id === messageId ? { ...m, status } : m,
          ),
        }));
        return { ...old, pages: newPages };
      });
    });

    return unsub;
  }, [qc]);

  // ── Subscribe to message deletions ──
  useEffect(() => {
    const unsub = wsClient.on('message:deleted', (event: WSEvent) => {
      const { messageId, conversationId: cid, deletedByName } = event.payload as WSDeletedMessagePayload;

      qc.setQueryData(QK.MESSAGES(cid), (old: any) => {
        if (!old) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((m: Message) =>
            m.id === messageId
              ? {
                  ...m,
                  deleted: true,
                  text: `${deletedByName} deleted a message`,
                  attachments: [],
                }
              : m,
          ),
        }));
        return { ...old, pages: newPages };
      });
    });

    return unsub;
  }, [qc]);

  // ── Send typing events ──
  const sendTyping = useCallback(
    (typing: boolean) => {
      if (!conversationId || !firebaseUser) return;
      wsClient.send(typing ? 'typing:start' : 'typing:stop', {
        conversationId,
        userId: firebaseUser.uid,
      });
    },
    [conversationId, firebaseUser],
  );

  return { isConnected: connected.current, sendTyping };
}

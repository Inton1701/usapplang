// ──────────────────────────────────────────────
// useMessages — infinite query + optimistic send
// ──────────────────────────────────────────────

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants';
import {
  getMessages,
  sendMessage,
  markConversationRead,
  getConversations,
  acceptMessageRequest,
  declineMessageRequest,
} from '@/services/messagesService';
import type { Message, Conversation } from '@/types';
import { useAuth } from './useAuth';


// ─── Conversations list ──────────────────────

export function useConversations() {
  const { user } = useAuth();
  return useInfiniteQuery<{ messages: never[]; conversations: Conversation[] }>({
    queryKey: QK.CONVERSATIONS(user?.uid ?? ''),
    queryFn: async () => {
      const conversations = await getConversations(user!.uid);
      return { messages: [], conversations };
    },
    initialPageParam: undefined,
    getNextPageParam: () => undefined,
    enabled: !!user,
  });
}

// ─── Messages (infinite scroll) ──────────────

export function useMessages(conversationId: string) {
  return useInfiniteQuery({
    queryKey: QK.MESSAGES(conversationId),
    queryFn: ({ pageParam }) => getMessages(conversationId, pageParam),
    initialPageParam: undefined as any,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: !!conversationId,
  });
}

// ─── Send message with optimistic update ─────

export function useSendMessage(conversationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => sendMessage(conversationId, user!.uid, text),

    // Optimistic: immediately show the message in the list
    onMutate: async (text) => {
      const key = QK.MESSAGES(conversationId);
      await qc.cancelQueries({ queryKey: key });

      const prev = qc.getQueryData(key);

      const optimisticMsg: Message = {
        id: `tmp_${Date.now()}`,
        conversationId,
        senderId: user!.uid,
        text,
        status: 'sending',
        createdAt: Date.now(),
      };

      qc.setQueryData(key, (old: any) => {
        if (!old) return { pages: [{ messages: [optimisticMsg], lastDoc: null }], pageParams: [undefined] };
        const newPages = [...old.pages];
        newPages[0] = {
          ...newPages[0],
          messages: [optimisticMsg, ...newPages[0].messages],
        };
        return { ...old, pages: newPages };
      });

      return { prev };
    },

    onError: (_err, _text, context) => {
      // Rollback on failure
      if (context?.prev) {
        qc.setQueryData(QK.MESSAGES(conversationId), context.prev);
      }
    },

    onSettled: () => {
      // Refetch to get server truth
      qc.invalidateQueries({ queryKey: QK.MESSAGES(conversationId) });
      // Also update conversation list (lastMessage changed)
      if (user) {
        qc.invalidateQueries({ queryKey: QK.CONVERSATIONS(user.uid) });
      }
    },
  });
}

// ─── Mark read ───────────────────────────────

export function useMarkRead(conversationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => markConversationRead(conversationId, user!.uid),
    onSettled: () => {
      if (user) qc.invalidateQueries({ queryKey: QK.CONVERSATIONS(user.uid) });
    },
  });
}

// ─── Accept message request ──────────────────

export function useAcceptRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, otherUid }: { conversationId: string; otherUid: string }) =>
      acceptMessageRequest(conversationId, user!.uid, otherUid),
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({ queryKey: QK.CONVERSATIONS(user.uid) });
        qc.invalidateQueries({ queryKey: QK.CONTACTS(user.uid) });
      }
    },
  });
}

// ─── Decline message request ─────────────────

export function useDeclineRequest() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) => declineMessageRequest(conversationId),
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: QK.CONVERSATIONS(user.uid) });
    },
  });
}

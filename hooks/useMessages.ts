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
  uploadAttachment,
  deleteMessage,
  type SendMessageParams,
} from '@/services/messagesService';
import type { Message, Conversation, MessageAttachment } from '@/types';
import { useAuth } from './useAuth';
import { showToast } from '@/providers/ToastProvider';


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
    mutationFn: (params: { text: string; attachments?: MessageAttachment[] }) =>
      sendMessage({
        conversationId,
        senderId: user!.uid,
        text: params.text,
        attachments: params.attachments,
        localId: `tmp_${Date.now()}`,
      }),

    // Optimistic: immediately show the message in the list
    onMutate: async (params) => {
      const key = QK.MESSAGES(conversationId);
      await qc.cancelQueries({ queryKey: key });

      const prev = qc.getQueryData(key);

      const optimisticMsg: Message = {
        id: `tmp_${Date.now()}`,
        conversationId,
        senderId: user!.uid,
        text: params.text,
        attachments: params.attachments,
        status: 'sending',
        createdAt: Date.now(),
        localId: `tmp_${Date.now()}`,
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

      return { prev, optimisticMsg };
    },

    onError: (_err, _params, context) => {
      // Mark message as failed instead of rollback
      if (context?.optimisticMsg) {
        const key = QK.MESSAGES(conversationId);
        qc.setQueryData(key, (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.id === context.optimisticMsg.id ? { ...m, status: 'failed' as const } : m,
            ),
          }));
          return { ...old, pages: newPages };
        });
      }
      showToast('error', 'Failed to send message');
    },

    onSuccess: (data, _params, context) => {
      // Replace optimistic message with server message.
      // Guard: the snapshot listener may have already injected the real message
      // (identified by data.id). In that case just remove the optimistic entry
      // to avoid duplicates.
      if (context?.optimisticMsg) {
        const key = QK.MESSAGES(conversationId);
        qc.setQueryData(key, (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any) => {
            const realAlreadyPresent = page.messages.some(
              (m: Message) => m.id === data.id && m.id !== context.optimisticMsg.id,
            );
            return {
              ...page,
              messages: realAlreadyPresent
                ? // Remove orphaned optimistic — real message already in list
                  page.messages.filter((m: Message) => m.id !== context.optimisticMsg.id)
                : // Normal path: swap optimistic → real
                  page.messages.map((m: Message) =>
                    m.id === context.optimisticMsg.id ? data : m,
                  ),
            };
          });
          return { ...old, pages: newPages };
        });
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

// ─── Retry failed message ────────────────────

export function useRetryMessage(conversationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (message: Message) =>
      sendMessage({
        conversationId,
        senderId: user!.uid,
        text: message.text,
        attachments: message.attachments,
        localId: message.localId,
      }),

    onMutate: async (message) => {
      const key = QK.MESSAGES(conversationId);
      await qc.cancelQueries({ queryKey: key });

      // Update message status to sending
      qc.setQueryData(key, (old: any) => {
        if (!old) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((m: Message) =>
            m.id === message.id ? { ...m, status: 'sending' as const } : m,
          ),
        }));
        return { ...old, pages: newPages };
      });

      return { message };
    },

    onError: (_err, _message, context) => {
      // Mark as failed again
      if (context?.message) {
        const key = QK.MESSAGES(conversationId);
        qc.setQueryData(key, (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.id === context.message.id ? { ...m, status: 'failed' as const } : m,
            ),
          }));
          return { ...old, pages: newPages };
        });
      }
      showToast('error', 'Failed to send message');
    },

    onSuccess: (data, _message, context) => {
      // Replace failed message with successful one
      if (context?.message) {
        const key = QK.MESSAGES(conversationId);
        qc.setQueryData(key, (old: any) => {
          if (!old) return old;
          const newPages = old.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((m: Message) =>
              m.id === context.message.id ? data : m,
            ),
          }));
          return { ...old, pages: newPages };
        });
      }
      showToast('success', 'Message sent');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.MESSAGES(conversationId) });
      if (user) {
        qc.invalidateQueries({ queryKey: QK.CONVERSATIONS(user.uid) });
      }
    },
  });
}

// ─── Delete message ──────────────────────────

export function useDeleteMessage(conversationId: string) {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (messageId: string) =>
      deleteMessage(conversationId, messageId, user!.uid, user!.name),

    onMutate: async (messageId) => {
      const key = QK.MESSAGES(conversationId);
      await qc.cancelQueries({ queryKey: key });

      const prev = qc.getQueryData(key);

      // Optimistically update UI
      qc.setQueryData(key, (old: any) => {
        if (!old) return old;
        const newPages = old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((m: Message) =>
            m.id === messageId
              ? {
                  ...m,
                  deleted: true,
                  text: `${user!.name} deleted a message`,
                  attachments: [],
                }
              : m,
          ),
        }));
        return { ...old, pages: newPages };
      });

      return { prev };
    },

    onError: (_err, _messageId, context) => {
      if (context?.prev) {
        qc.setQueryData(QK.MESSAGES(conversationId), context.prev);
      }
      showToast('error', 'Failed to delete message');
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.MESSAGES(conversationId) });
    },
  });
}

// ─── Upload attachment ───────────────────────

export function useUploadAttachment(conversationId: string) {
  return useMutation({
    mutationFn: (file: { uri: string; type: string; name: string; size: number }) =>
      uploadAttachment(conversationId, file),
    onError: (error: any) => {
      showToast('error', error.message || 'Failed to upload file');
    },
  });
}

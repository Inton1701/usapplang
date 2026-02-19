// ──────────────────────────────────────────────
// ChatHeadProvider — global floating chat head state
//
// Architecture:
//   • Holds a real-time Firestore subscription to all conversations
//     where the current user has unread messages.
//   • Exposes the "hottest" conversation (most-recently-updated with
//     unread messages) as the active chat head subject.
//   • Controls three visibility states:
//       hidden      → chat head not rendered at all
//       bubble      → small floating circle
//       mini-window → expanded preview panel
// ──────────────────────────────────────────────

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/constants';
import { useAuth } from '@/hooks/useAuth';
import type { Conversation, User } from '@/types';
import { getUser } from '@/services/usersService';

// ─── Types ─────────────────────────────────────

export type ChatHeadVisibility = 'hidden' | 'bubble' | 'mini-window';

export interface ChatHeadPeer {
  conversation: Conversation;
  /** The other participant's profile (cached) */
  user: User;
  unreadCount: number;
}

interface ChatHeadState {
  visibility: ChatHeadVisibility;
  /** All conversations that have unread messages, ordered by updatedAt desc */
  unreadPeers: ChatHeadPeer[];
  /** The peer currently shown in the chat head / mini-window */
  activePeer: ChatHeadPeer | null;
  /** Total unread across ALL conversations */
  totalUnread: number;
  /** Which conversationId is currently open in the full chat screen
   *  (so we suppress the chat head for that one) */
  openConversationId: string | null;
  /** Which screen edge the bubble is snapped to — drives badge + window position */
  snappedSide: 'left' | 'right';
}

type ChatHeadAction =
  | { type: 'SET_UNREAD_PEERS'; peers: ChatHeadPeer[] }
  | { type: 'SET_ACTIVE_PEER'; peer: ChatHeadPeer | null }
  | { type: 'SET_VISIBILITY'; visibility: ChatHeadVisibility }
  | { type: 'SET_OPEN_CONVERSATION'; conversationId: string | null }
  | { type: 'SET_SNAPPED_SIDE'; side: 'left' | 'right' }
  | { type: 'RESET' };

interface ChatHeadContextValue extends ChatHeadState {
  /** Show the bubble (called e.g. after leaving a chat screen) */
  showBubble: () => void;
  /** Expand to mini-window */
  expandMiniWindow: () => void;
  /** Collapse back to bubble */
  collapseToBubble: () => void;
  /** Fully hide the chat head */
  hide: () => void;
  /** Pin a specific conversation as the active peer */
  setActivePeer: (peer: ChatHeadPeer) => void;
  /** Tell the provider which conversation is open so it can suppress */
  setOpenConversation: (id: string | null) => void;
  /** Called by FloatingChatHead after every snap to keep window aligned */
  setSnappedSide: (side: 'left' | 'right') => void;
}

// ─── Reducer ───────────────────────────────────

function reducer(state: ChatHeadState, action: ChatHeadAction): ChatHeadState {
  switch (action.type) {
    case 'SET_UNREAD_PEERS': {
      const peers = action.peers;
      const totalUnread = peers.reduce((sum, p) => sum + p.unreadCount, 0);

      // When the mini-window is open the user is actively reading, so
      // markConversationRead() will fire and push unread → 0.
      // Freeze activePeer and the peer list so the window stays rendered.
      // The user must explicitly close it (−/× buttons or backdrop).
      if (state.visibility === 'mini-window') {
        // Still refresh peer data if the active conv is still in the list,
        // so name/avatar/online status stay current.
        const refreshed = peers.find(
          (p) => p.conversation.id === state.activePeer?.conversation.id,
        );
        return {
          ...state,
          totalUnread,
          // Only replace activePeer when there is an actual updated record.
          activePeer: refreshed ?? state.activePeer,
          // Keep the full peer list frozen so tabs don't disappear.
          unreadPeers: peers.length > 0 ? peers : state.unreadPeers,
        };
      }

      // Normal path: bubble is idle or hidden.
      const stillActive = peers.find(
        (p) => p.conversation.id === state.activePeer?.conversation.id,
      );
      const activePeer = stillActive ?? peers[0] ?? null;

      let visibility = state.visibility;
      if (totalUnread > 0 && state.visibility === 'hidden') {
        visibility = 'bubble';
      } else if (totalUnread === 0 && state.visibility === 'bubble') {
        visibility = 'hidden';
      }

      return { ...state, unreadPeers: peers, totalUnread, activePeer, visibility };
    }

    case 'SET_ACTIVE_PEER':
      return { ...state, activePeer: action.peer };

    case 'SET_VISIBILITY':
      return { ...state, visibility: action.visibility };

    case 'SET_OPEN_CONVERSATION':
      return { ...state, openConversationId: action.conversationId };

    case 'SET_SNAPPED_SIDE':
      return { ...state, snappedSide: action.side };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

const initialState: ChatHeadState = {
  visibility: 'hidden',
  unreadPeers: [],
  activePeer: null,
  totalUnread: 0,
  openConversationId: null,
  snappedSide: 'right',
};

// ─── Context ───────────────────────────────────

const ChatHeadContext = createContext<ChatHeadContextValue | null>(null);

// ─── Provider ──────────────────────────────────

export function ChatHeadProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  // Cache for peer user profiles so we don't re-fetch on every snapshot
  const userCache = useRef<Record<string, User>>({});

  // ── Real-time Firestore subscription ──────────
  useEffect(() => {
    if (!user?.uid) {
      dispatch({ type: 'RESET' });
      return;
    }

    const q = query(
      collection(db, COLLECTIONS.CONVERSATIONS),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc'),
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const conversations = snapshot.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Conversation),
      );

      // Filter to conversations with unread messages for this user
      const unread = conversations.filter(
        (c) =>
          (c.unreadCount?.[user.uid] ?? 0) > 0 &&
          c.id !== state.openConversationId,
      );

      if (unread.length === 0) {
        dispatch({ type: 'SET_UNREAD_PEERS', peers: [] });
        return;
      }

      // Resolve peer user profiles (with cache)
      const peers = await Promise.all(
        unread.map(async (conv) => {
          const otherUid = conv.participants.find((p) => p !== user.uid)!;
          if (!userCache.current[otherUid]) {
            try {
              const fetched = await getUser(otherUid);
              userCache.current[otherUid] = fetched ?? {
                uid: otherUid,
                name: 'Unknown',
                email: '',
                status: 'offline',
                isOnline: false,
                lastActiveAt: 0,
                createdAt: 0,
                updatedAt: 0,
              };
            } catch {
              // Fallback minimal user object
              userCache.current[otherUid] = {
                uid: otherUid,
                name: 'Unknown',
                email: '',
                status: 'offline',
                isOnline: false,
                lastActiveAt: 0,
                createdAt: 0,
                updatedAt: 0,
              };
            }
          }
          return {
            conversation: conv,
            user: userCache.current[otherUid],
            unreadCount: conv.unreadCount[user.uid] ?? 0,
          } satisfies ChatHeadPeer;
        }),
      );

      dispatch({ type: 'SET_UNREAD_PEERS', peers });
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // ── Actions ────────────────────────────────
  const showBubble = useCallback(
    () => dispatch({ type: 'SET_VISIBILITY', visibility: 'bubble' }),
    [],
  );
  const expandMiniWindow = useCallback(
    () => dispatch({ type: 'SET_VISIBILITY', visibility: 'mini-window' }),
    [],
  );
  const collapseToBubble = useCallback(
    () => dispatch({ type: 'SET_VISIBILITY', visibility: 'bubble' }),
    [],
  );
  const hide = useCallback(
    () => dispatch({ type: 'SET_VISIBILITY', visibility: 'hidden' }),
    [],
  );
  const setActivePeer = useCallback((peer: ChatHeadPeer) => {
    dispatch({ type: 'SET_ACTIVE_PEER', peer });
  }, []);
  const setOpenConversation = useCallback((id: string | null) => {
    dispatch({ type: 'SET_OPEN_CONVERSATION', conversationId: id });
    // When a conversation opens, hide the chat head; when it closes, re-evaluate
    if (id) {
      dispatch({ type: 'SET_VISIBILITY', visibility: 'hidden' });
    }
  }, []);
  const setSnappedSide = useCallback((side: 'left' | 'right') => {
    dispatch({ type: 'SET_SNAPPED_SIDE', side });
  }, []);

  const value = useMemo<ChatHeadContextValue>(
    () => ({
      ...state,
      showBubble,
      expandMiniWindow,
      collapseToBubble,
      hide,
      setActivePeer,
      setOpenConversation,
      setSnappedSide,
    }),
    [state, showBubble, expandMiniWindow, collapseToBubble, hide, setActivePeer, setOpenConversation, setSnappedSide],
  );

  return (
    <ChatHeadContext.Provider value={value}>{children}</ChatHeadContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────

export function useChatHead() {
  const ctx = useContext(ChatHeadContext);
  if (!ctx) throw new Error('useChatHead must be used inside <ChatHeadProvider>');
  return ctx;
}

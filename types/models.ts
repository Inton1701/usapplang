// ──────────────────────────────────────────────
// Core data models — mirrors Firestore documents
// ──────────────────────────────────────────────

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: number; // timestamp ms
  createdAt: number;
  updatedAt: number;
}

export interface Contact {
  uid: string; // the contact's user id
  addedAt: number;
  nickname?: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // uids – always 2 for 1‑to‑1
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: number;
  };
  unreadCount: Record<string, number>; // { [uid]: count }
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  createdAt: number;
}

// ──────────────────────────────────────────────
// WebSocket event types
// ──────────────────────────────────────────────

export type WSEventType =
  | 'message:new'
  | 'message:status'
  | 'typing:start'
  | 'typing:stop'
  | 'user:online'
  | 'user:offline';

export interface WSEvent<T = unknown> {
  type: WSEventType;
  payload: T;
  timestamp: number;
}

export interface WSNewMessagePayload {
  message: Message;
  conversationId: string;
}

export interface WSStatusPayload {
  messageId: string;
  conversationId: string;
  status: Message['status'];
}

export interface WSTypingPayload {
  conversationId: string;
  userId: string;
  userName?: string;
}

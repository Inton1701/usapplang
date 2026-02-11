// ──────────────────────────────────────────────
// Core data models — mirrors Firestore documents
// ──────────────────────────────────────────────

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  photos?: string[]; // Array of photo URLs for carousel
  status: 'online' | 'offline' | 'away';
  isOnline: boolean; // Real-time online status
  lastActiveAt: number; // timestamp ms
  lastSeen?: number; // timestamp ms (deprecated, use lastActiveAt)
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
  status: 'active' | 'pending' | 'declined'; // message request status
  initiatedBy: string; // uid of who started the conversation
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

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
    type?: 'text' | 'image' | 'file' | 'audio';
    deleted?: boolean;
  };
  unreadCount: Record<string, number>; // { [uid]: count }
  createdAt: number;
  updatedAt: number;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'file' | 'voice';
  url: string;
  name: string;
  size: number;
  mimeType: string;
  duration?: number; // For voice messages (in seconds)
  width?: number; // For images
  height?: number; // For images
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string; // For deleted message placeholder
  text: string;
  attachments?: MessageAttachment[];
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  deleted?: boolean;
  deletedAt?: number;
  createdAt: number;
  localId?: string; // For optimistic updates and retry logic
}

export interface Notification {
  id: string;
  recipientId: string; // user who receives the notification
  senderId: string; // user who sent the message
  senderName: string; // cached for quick display
  messageId: string;
  conversationId: string;
  messagePreview: string; // first 100 chars
  isRead: boolean;
  createdAt: number;
}

// ──────────────────────────────────────────────
// WebSocket event types
// ──────────────────────────────────────────────

export type WSEventType =
  | 'message:new'
  | 'message:status'
  | 'message:deleted'
  | 'message:failed'
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

export interface WSDeletedMessagePayload {
  messageId: string;
  conversationId: string;
  deletedBy: string;
  deletedByName: string;
}

export interface WSTypingPayload {
  conversationId: string;
  userId: string;
  userName?: string;
}

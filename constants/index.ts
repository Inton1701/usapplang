// Firestore collection paths
export const COLLECTIONS = {
  USERS: 'users',
  CONTACTS: 'contacts', // sub: users/{uid}/contacts/{contactUid}
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages', // sub: conversations/{id}/messages/{msgId}
  NOTIFICATIONS: 'notifications', // sub: users/{uid}/notifications/{notifId}
} as const;

// TanStack Query keys
export const QK = {
  AUTH: ['auth'] as const,
  USERS: ['users'] as const,
  USER: (uid: string) => ['users', uid] as const,
  CONTACTS: (uid: string) => ['contacts', uid] as const,
  CONVERSATIONS: (uid: string) => ['conversations', uid] as const,
  MESSAGES: (conversationId: string) => ['messages', conversationId] as const,
  NOTIFICATIONS: (uid: string) => ['notifications', uid] as const,
} as const;

// Default page size for infinite queries
export const PAGE_SIZE = 25;

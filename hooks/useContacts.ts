// ──────────────────────────────────────────────
// useContacts — TanStack Query for contacts list
// ──────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QK } from '@/constants';
import { getContacts, addContact, removeContact } from '@/services/contactsService';
import { getUsers } from '@/services/usersService';
import type { Contact, User } from '@/types';
import { useAuth } from './useAuth';

// ─── Contacts list ───────────────────────────

export function useContacts() {
  const { user } = useAuth();
  return useQuery<Contact[]>({
    queryKey: QK.CONTACTS(user?.uid ?? ''),
    queryFn: () => getContacts(user!.uid),
    enabled: !!user,
  });
}

// ─── Search users (for adding contacts) ──────

export function useSearchUsers(searchQuery: string) {
  return useQuery<{ users: User[]; lastDoc: unknown }>({
    queryKey: [...QK.USERS, 'search', searchQuery],
    queryFn: () => getUsers(searchQuery),
    enabled: searchQuery.length >= 2,
  });
}

// ─── Add contact mutation ────────────────────

export function useAddContact() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (contactUid: string) => addContact(user!.uid, contactUid),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.CONTACTS(user!.uid) });
    },
  });
}

// ─── Remove contact mutation ─────────────────

export function useRemoveContact() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (contactUid: string) => removeContact(user!.uid, contactUid),
    // Optimistic removal
    onMutate: async (contactUid) => {
      const key = QK.CONTACTS(user!.uid);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Contact[]>(key);
      qc.setQueryData<Contact[]>(key, (old) =>
        old ? old.filter((c) => c.uid !== contactUid) : [],
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) {
        qc.setQueryData(QK.CONTACTS(user!.uid), context.prev);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.CONTACTS(user!.uid) });
    },
  });
}

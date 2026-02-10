// ──────────────────────────────────────────────
// Contacts screen — list + search + add
// ──────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import {
  Screen,
  Text,
  Input,
  Avatar,
  Badge,
  Row,
  Spacer,
  Divider,
  Button,
  IconButton,
} from '@/components';
import { SearchIcon, CloseIcon } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { useContacts, useSearchUsers, useAddContact, useRemoveContact } from '@/hooks/useContacts';
import { getConversationId } from '@/services/messagesService';
import { getUser } from '@/services/usersService';
import { showToast } from '@/providers/ToastProvider';
import type { Contact, User } from '@/types';

export default function ContactsScreen() {
  const { user } = useAuth();
  const { data: contacts, isLoading, refetch } = useContacts();
  const addContactMut = useAddContact();
  const removeContactMut = useRemoveContact();

  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { data: searchResults } = useSearchUsers(search);

  // Enrich contacts with user data (cached by TanStack)
  const [contactUsers, setContactUsers] = useState<Map<string, User>>(new Map());

  React.useEffect(() => {
    if (!contacts) return;
    const loadUsers = async () => {
      const map = new Map<string, User>();
      await Promise.all(
        contacts.map(async (c) => {
          const u = await getUser(c.uid);
          if (u) map.set(c.uid, u);
        }),
      );
      setContactUsers(map);
    };
    loadUsers();
  }, [contacts]);

  const handleOpenChat = (contactUid: string) => {
    if (!user) return;
    const conversationId = getConversationId(user.uid, contactUid);
    router.push(`/(chat)/${conversationId}?otherUid=${contactUid}`);
  };

  const handleAddContact = async (contactUid: string) => {
    try {
      await addContactMut.mutateAsync(contactUid);
      showToast('success', 'Contact added');
      setShowSearch(false);
      setSearch('');
    } catch {
      showToast('error', 'Failed to add contact');
    }
  };

  const handleRemoveContact = (contactUid: string, name: string) => {
    Alert.alert('Remove Contact', `Remove ${name} from contacts?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeContactMut.mutate(contactUid),
      },
    ]);
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const contactUser = contactUsers.get(item.uid);
    const name = contactUser?.name ?? 'Unknown';

    return (
      <Pressable
        onPress={() => handleOpenChat(item.uid)}
        onLongPress={() => handleRemoveContact(item.uid, name)}
        className="active:bg-gray-50"
      >
        <Row align="center" className="px-4 py-3">
          <Avatar
            source={contactUser?.photoURL}
            fallbackText={name}
            size={48}
          />
          <View className="flex-1 ml-3">
            <Text className="font-semibold">{name}</Text>
            <Text variant="muted" className="text-xs">
              {contactUser?.status === 'online' ? '🟢 Online' : 'Offline'}
            </Text>
          </View>
        </Row>
        <Divider className="ml-16" />
      </Pressable>
    );
  };

  const renderSearchResult = ({ item }: { item: User }) => {
    const alreadyContact = contacts?.some((c) => c.uid === item.uid);
    const isMe = item.uid === user?.uid;

    if (isMe) return null;

    return (
      <Row align="center" className="px-4 py-3">
        <Avatar source={item.photoURL} fallbackText={item.name} size={44} />
        <View className="flex-1 ml-3">
          <Text className="font-semibold">{item.name}</Text>
          <Text variant="muted" className="text-xs">{item.email}</Text>
        </View>
        {alreadyContact ? (
          <Text variant="muted" className="text-xs">Added</Text>
        ) : (
          <Button size="sm" onPress={() => handleAddContact(item.uid)}>
            Add
          </Button>
        )}
      </Row>
    );
  };

  return (
    <Screen>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
        <Row align="center" justify="between">
          <Text variant="title" className="text-2xl">Contacts</Text>
          <IconButton
            icon={showSearch ? <CloseIcon size={22} color="#3b82f6" /> : <SearchIcon size={22} color="#3b82f6" />}
            onPress={() => {
              setShowSearch((v) => !v);
              setSearch('');
            }}
            accessibilityLabel={showSearch ? 'Close search' : 'Search users'}
          />
        </Row>

        {showSearch && (
          <>
            <Spacer size={8} />
            <Input
              placeholder="Search users by name…"
              value={search}
              onChangeText={setSearch}
              leftIcon={<SearchIcon size={18} color="#9ca3af" />}
              autoFocus
            />
          </>
        )}
      </View>

      {/* Search results */}
      {showSearch && searchResults?.users?.length ? (
        <FlatList
          data={searchResults.users}
          keyExtractor={(u) => u.uid}
          renderItem={renderSearchResult}
          className="bg-white"
        />
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(c) => c.uid}
          renderItem={renderContact}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text variant="muted" className="text-center">
                No contacts yet.{'\n'}Tap 🔍 to search and add people.
              </Text>
            </View>
          }
          className="bg-white flex-1"
        />
      )}
    </Screen>
  );
}

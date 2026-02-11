// ──────────────────────────────────────────────
// Contacts screen — list + search + add
// ──────────────────────────────────────────────

import React, { useState, useMemo } from 'react';
import { View, FlatList, Pressable, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
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
  StoriesCarousel,
} from '@/components';
import { SearchIcon, CloseIcon } from '@/components/icons';
import { useAuth } from '@/hooks/useAuth';
import { useContacts, useSearchUsers, useAddContact, useRemoveContact } from '@/hooks/useContacts';
import {
  useConversations,
  useAcceptRequest,
  useDeclineRequest,
} from '@/hooks/useMessages';
import { useDebounce } from '@/hooks/useDebounce';
import { getConversationId } from '@/services/messagesService';
import { getUser } from '@/services/usersService';
import { showToast } from '@/providers/ToastProvider';
import { formatLastSeen } from '@/utils/format';
import type { Contact, User, Conversation } from '@/types';

export default function ContactsScreen() {
  const { user } = useAuth();
  const { data: contacts, isLoading, refetch } = useContacts();
  const { data: conversationsData } = useConversations();
  const addContactMut = useAddContact();
  const removeContactMut = useRemoveContact();
  const acceptMut = useAcceptRequest();
  const declineMut = useDeclineRequest();

  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const { data: searchResults } = useSearchUsers(debouncedSearch);

  // Extract conversations first (needed by effects below)
  const conversations = useMemo(
    () => conversationsData?.pages.flatMap((p) => p.conversations) ?? [],
    [conversationsData],
  );

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

  // Enrich conversations with user data
  const [conversationUsers, setConversationUsers] = useState<Map<string, User>>(new Map());

  React.useEffect(() => {
    if (!conversations.length) return;
    const loadConversationUsers = async () => {
      const map = new Map<string, User>();
      await Promise.all(
        conversations.map(async (conv) => {
          const otherUid = conv.participants.find((p) => p !== user?.uid);
          if (otherUid) {
            const u = await getUser(otherUid);
            if (u) map.set(conv.id, u);
          }
        }),
      );
      setConversationUsers(map);
    };
    loadConversationUsers();
  }, [conversations, user]);

  // Extract pending message requests (where user is recipient)
  const messageRequests = useMemo(
    () =>
      conversations.filter(
        (c) => c.status === 'pending' && c.initiatedBy !== user?.uid,
      ),
    [conversations, user],
  );

  const [requestUsers, setRequestUsers] = useState<Map<string, User>>(new Map());

  React.useEffect(() => {
    if (!messageRequests.length) return;
    const loadRequestUsers = async () => {
      const map = new Map<string, User>();
      await Promise.all(
        messageRequests.map(async (r) => {
          const otherUid = r.participants.find((p) => p !== user?.uid);
          if (otherUid) {
            const u = await getUser(otherUid);
            if (u) map.set(otherUid, u);
          }
        }),
      );
      setRequestUsers(map);
    };
    loadRequestUsers();
  }, [messageRequests, user]);

  const handleOpenChat = (contactUid: string) => {
    if (!user) return;
    const conversationId = getConversationId(user.uid, contactUid);
    router.push(`/(chat)/${conversationId}?otherUid=${contactUid}`);
  };

  const handleOpenConversation = (conversationId: string, otherUid: string) => {
    router.push(`/(chat)/${conversationId}?otherUid=${otherUid}`);
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

  const handleAcceptRequest = async (conversationId: string, otherUid: string) => {
    try {
      await acceptMut.mutateAsync({ conversationId, otherUid });
      showToast('success', 'Message request accepted');
    } catch {
      showToast('error', 'Failed to accept request');
    }
  };

  const handleDeclineRequest = async (conversationId: string) => {
    try {
      await declineMut.mutateAsync(conversationId);
      showToast('success', 'Message request declined');
    } catch {
      showToast('error', 'Failed to decline request');
    }
  };

  const renderConversation = ({ item }: { item: Conversation }) => {
    const otherUid = item.participants.find((p) => p !== user?.uid) ?? '';
    const conversationUser = conversationUsers.get(item.id);
    const name = conversationUser?.name ?? 'Unknown';
    const isOnline = conversationUser?.isOnline ?? false;
    const unreadCount = item.unreadCount[user?.uid ?? ''] ?? 0;
    
    // Last message preview
    const lastMessageText = item.lastMessage?.text ?? 'No messages yet';
    const lastMessageTime = item.lastMessage?.timestamp 
      ? formatLastSeen(Date.now() - item.lastMessage.timestamp)
      : '';

    return (
      <Pressable
        onPress={() => handleOpenConversation(item.id, otherUid)}
        className="active:bg-gray-50"
      >
        <Row align="center" className="px-4 py-3">
          <Avatar
            source={conversationUser?.photoURL}
            fallbackText={name}
            size={56}
            isOnline={isOnline}
            showPresence
          />
          <View className="flex-1 ml-3">
            <Row align="center" justify="between" className="mb-1">
              <Text className="font-semibold text-base">{name}</Text>
              {lastMessageTime && (
                <Text variant="muted" className="text-xs">
                  {lastMessageTime}
                </Text>
              )}
            </Row>
            <Row align="center" justify="between">
              <Text 
                variant="muted" 
                className={`text-sm flex-1 ${unreadCount > 0 ? 'font-semibold text-gray-900' : ''}`}
                numberOfLines={1}
              >
                {lastMessageText}
              </Text>
              {unreadCount > 0 && (
                <View className="ml-2">
                  <Badge count={unreadCount} />
                </View>
              )}
            </Row>
          </View>
        </Row>
        <Divider className="ml-20" />
      </Pressable>
    );
  };

  const renderContact = ({ item }: { item: Contact }) => {
    const contactUser = contactUsers.get(item.uid);
    const name = contactUser?.name ?? 'Unknown';
    const isOnline = contactUser?.isOnline ?? false;
    const lastSeen = contactUser?.lastActiveAt 
      ? formatLastSeen(Date.now() - contactUser.lastActiveAt) 
      : null;

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
            isOnline={isOnline}
            showPresence
          />
          <View className="flex-1 ml-3">
            <Text className="font-semibold">{name}</Text>
            <Text variant="muted" className="text-xs">
              {isOnline ? 'Online' : lastSeen ? `Active ${lastSeen} ago` : 'Offline'}
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
    const isOnline = item.isOnline ?? false;

    if (isMe) return null;

    const handleUserClick = async () => {
      if (!alreadyContact) {
        // Auto-add contact first
        try {
          await addContactMut.mutateAsync(item.uid);
        } catch (error) {
          console.log('Failed to add contact:', error);
        }
      }
      // Then open chat
      handleOpenChat(item.uid);
      setShowSearch(false);
      setSearch('');
    };

    return (
      <Pressable onPress={handleUserClick} className="active:bg-gray-50">
        <Row align="center" className="px-4 py-3">
          <Avatar 
            source={item.photoURL} 
            fallbackText={item.name} 
            size={44}
            isOnline={isOnline}
            showPresence
          />
          <View className="flex-1 ml-3">
            <Text className="font-semibold">{item.name}</Text>
            <Text variant="muted" className="text-xs">{item.email}</Text>
          </View>
          {alreadyContact && (
            <Text variant="muted" className="text-xs">Added</Text>
          )}
        </Row>
      </Pressable>
    );
  };

  const renderRequest = ({ item }: { item: Conversation }) => {
    const otherUid = item.participants.find((p) => p !== user?.uid) ?? '';
    const requestUser = requestUsers.get(otherUid);
    const name = requestUser?.name ?? 'Unknown';
    const isOnline = requestUser?.isOnline ?? false;

    return (
      <View className="px-4 py-3 bg-white border-b border-gray-100">
        <Row align="center">
          <Avatar
            source={requestUser?.photoURL}
            fallbackText={name}
            size={48}
            isOnline={isOnline}
            showPresence
          />
          <View className="flex-1 ml-3">
            <Text className="font-semibold">{name}</Text>
            <Text variant="muted" className="text-xs">
              {item.lastMessage?.text ?? 'Wants to send you a message'}
            </Text>
          </View>
        </Row>
        <Row className="mt-3" gap={8}>
          <Button
            size="sm"
            onPress={() => handleAcceptRequest(item.id, otherUid)}
            className="flex-1"
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onPress={() => handleDeclineRequest(item.id)}
            className="flex-1"
          >
            Decline
          </Button>
        </Row>
      </View>
    );
  };

  return (
    <Screen>
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 pt-2 pb-3">
        <Row align="center" justify="between">
          <Text variant="title" className="text-2xl">Messages</Text>
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

      {/* Tabs */}
      {!showSearch && (
        <View className="bg-white border-b border-gray-200">
          <Row className="px-4">
            <TouchableOpacity
              onPress={() => setActiveTab('chats')}
              className="flex-1 py-3"
              style={{
                borderBottomWidth: 2,
                borderBottomColor: activeTab === 'chats' ? '#3b82f6' : 'transparent',
              }}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === 'chats' ? 'text-blue-500' : 'text-gray-500'
                }`}
              >
                Chats
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab('requests')}
              className="flex-1 py-3"
              style={{
                borderBottomWidth: 2,
                borderBottomColor: activeTab === 'requests' ? '#3b82f6' : 'transparent',
              }}
            >
              <Row align="center" justify="center" gap={6}>
                <Text
                  className={`text-center font-semibold ${
                    activeTab === 'requests' ? 'text-blue-500' : 'text-gray-500'
                  }`}
                >
                  Requests
                </Text>
                {messageRequests.length > 0 && (
                  <View className="bg-blue-500 rounded-full px-2 py-0.5">
                    <Text className="text-white text-xs font-bold">
                      {messageRequests.length}
                    </Text>
                  </View>
                )}
              </Row>
            </TouchableOpacity>
          </Row>
        </View>
      )}

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
      ) : activeTab === 'requests' ? (
        /* Message Requests Tab */
        <FlatList
          data={messageRequests}
          keyExtractor={(c) => c.id}
          renderItem={renderRequest}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center pt-20">
              <Text variant="muted" className="text-center">
                No message requests.
              </Text>
            </View>
          }
          className="bg-white flex-1"
        />
      ) : (
        /* Chats Tab */
        <FlatList
          data={
            conversations.filter((c) => c.status === 'active').length > 0
              ? conversations.filter((c) => c.status === 'active')
              : (() => {
                  // Show contacts if no conversations
                  return contacts?.map(c => ({
                    id: c.uid,
                    participants: [user?.uid ?? '', c.uid],
                    status: 'active' as const,
                    initiatedBy: c.uid,
                    createdAt: 0,
                    updatedAt: 0,
                    lastMessage: undefined,
                    unreadCount: {},
                  })) ?? [];
                })()
          }
          keyExtractor={(c) => c.id}
          renderItem={(props) => {
            const hasLastMessage = props.item.lastMessage !== undefined;
            return hasLastMessage ? renderConversation(props) : renderContact({
              item: { uid: props.item.participants.find(p => p !== user?.uid) ?? '' } as Contact
            });
          }}
          refreshing={isLoading}
          onRefresh={refetch}
          ListHeaderComponent={
            <StoriesCarousel
              users={
                conversationUsers.size > 0 
                  ? Array.from(conversationUsers.values())
                  : Array.from(contactUsers.values())
              }
              onUserPress={(pressedUser) => {
                const conv = conversations.find(c => 
                  c.participants.includes(pressedUser.uid) && c.participants.includes(user?.uid ?? '')
                );
                if (conv) {
                  handleOpenConversation(conv.id, pressedUser.uid);
                } else {
                  handleOpenChat(pressedUser.uid);
                }
              }}
              isLoading={isLoading && conversationUsers.size === 0 && contactUsers.size === 0}
            />
          }
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

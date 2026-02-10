import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  Screen,
  ChatHeader,
  MessageListItem,
  MessageComposer,
  TypingIndicator,
  IconButton,
  Text,
} from '@/components';
import { PhoneIcon, VideoIcon } from '@/components/icons';

// Sample data
const MESSAGES = [
  {
    id: '1',
    message: 'Hey! How are you doing?',
    isOutgoing: false,
    timestamp: '10:30 AM',
    senderName: 'Sarah Johnson',
    senderAvatar: '',
  },
  {
    id: '2',
    message: "I'm doing great! Just working on the new project.",
    isOutgoing: true,
    timestamp: '10:32 AM',
  },
  {
    id: '3',
    message: 'That sounds exciting! What kind of project is it?',
    isOutgoing: false,
    timestamp: '10:33 AM',
    senderName: 'Sarah Johnson',
    senderAvatar: '',
  },
  {
    id: '4',
    message: "It's a React Native messenger app with a clean component library. Using NativeWind for styling!",
    isOutgoing: true,
    timestamp: '10:35 AM',
  },
  {
    id: '5',
    message: 'Wow, that sounds really cool! NativeWind is amazing for styling.',
    isOutgoing: false,
    timestamp: '10:36 AM',
    senderName: 'Sarah Johnson',
    senderAvatar: '',
  },
];

export default function ChatScreen() {
  const [isTyping, setIsTyping] = useState(true);

  const handleSendMessage = (message: string) => {
    console.log('Sending message:', message);
    // Handle message sending logic here
  };

  return (
    <Screen className="bg-gray-50">
      {/* Header */}
      <ChatHeader
        title="Sarah Johnson"
        subtitle="Active now"
        avatar=""
        onBackPress={() => console.log('Back pressed')}
        rightActions={
          <View className="flex-row">
            <IconButton
              icon={<PhoneIcon size={20} color="#374151" />}
              accessibilityLabel="Voice call"
              onPress={() => console.log('Call pressed')}
            />
            <IconButton
              icon={<VideoIcon size={20} color="#374151" />}
              accessibilityLabel="Video call"
              onPress={() => console.log('Video call pressed')}
              className="ml-2"
            />
          </View>
        }
      />

      {/* Messages */}
      <ScrollView className="flex-1 px-4 py-4">
        {MESSAGES.map((msg) => (
          <MessageListItem
            key={msg.id}
            message={msg.message}
            isOutgoing={msg.isOutgoing}
            timestamp={msg.timestamp}
            senderName={msg.senderName}
            senderAvatar={msg.senderAvatar}
            showAvatar={!msg.isOutgoing}
          />
        ))}

        {isTyping && (
          <TypingIndicator userName="Sarah" className="mb-4" />
        )}
      </ScrollView>

      {/* Composer */}
      <MessageComposer
        onSend={handleSendMessage}
        placeholder="Type a message..."
      />
    </Screen>
  );
}

import React from 'react';
import { View } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { ChatBubble } from './ChatBubble';
import { Text } from '../ui/Text';

export interface MessageListItemProps {
  message: string;
  isOutgoing?: boolean;
  timestamp?: string;
  senderName?: string;
  senderAvatar?: string;
  showAvatar?: boolean;
  className?: string;
}

export function MessageListItem({
  message,
  isOutgoing = false,
  timestamp,
  senderName,
  senderAvatar,
  showAvatar = true,
  className = '',
}: MessageListItemProps) {
  return (
    <View className={`flex-row mb-3 ${isOutgoing ? 'flex-row-reverse' : ''} ${className}`}>
      {showAvatar && !isOutgoing && (
        <Avatar
          source={senderAvatar}
          fallbackText={senderName}
          size={32}
          className="mr-2"
        />
      )}
      <View className={`flex-1 ${isOutgoing ? 'items-end' : 'items-start'}`}>
        {!isOutgoing && senderName && (
          <Text variant="muted" className="mb-1 ml-1">
            {senderName}
          </Text>
        )}
        <ChatBubble message={message} isOutgoing={isOutgoing} timestamp={timestamp} />
      </View>
    </View>
  );
}

import React from 'react';
import { View, Pressable, Alert } from 'react-native';
import { Avatar } from '../ui/Avatar';
import { ChatBubble } from './ChatBubble';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import type { Message } from '@/types';

export interface MessageListItemProps {
  message: Message;
  isOutgoing?: boolean;
  timestamp?: string;
  senderName?: string;
  senderAvatar?: string;
  showAvatar?: boolean;
  onRetry?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

export function MessageListItem({
  message: messageData,
  isOutgoing = false,
  timestamp,
  senderName,
  senderAvatar,
  showAvatar = true,
  onRetry,
  onDelete,
  className = '',
}: MessageListItemProps) {
  const handleLongPress = () => {
    if (!isOutgoing || messageData.deleted) return;

    Alert.alert('Delete Message', 'Are you sure you want to delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => onDelete?.(messageData.id),
      },
    ]);
  };

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
        {!isOutgoing && senderName && !messageData.deleted && (
          <Text variant="muted" className="mb-1 ml-1">
            {senderName}
          </Text>
        )}
        
        <Pressable onLongPress={handleLongPress} delayLongPress={500}>
          <ChatBubble
            message={messageData.text}
            isOutgoing={isOutgoing}
            timestamp={timestamp}
            attachments={messageData.attachments}
            deleted={messageData.deleted}
          />
        </Pressable>

        {/* Failed message indicator and retry button */}
        {messageData.status === 'failed' && isOutgoing && (
          <View className="mt-1 flex-row items-center">
            <Text className="text-red-500 text-xs mr-2">Failed to send message</Text>
            {onRetry && (
              <Pressable
                onPress={() => onRetry(messageData)}
                className="bg-red-500 px-3 py-1 rounded-full"
              >
                <Text className="text-white text-xs">Retry</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

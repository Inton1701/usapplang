import React from 'react';
import { View } from 'react-native';
import { Text } from '../ui/Text';

export interface ChatBubbleProps {
  message: string;
  isOutgoing?: boolean;
  timestamp?: string;
  className?: string;
}

export function ChatBubble({
  message,
  isOutgoing = false,
  timestamp,
  className = '',
}: ChatBubbleProps) {
  const bubbleStyles = isOutgoing
    ? 'bg-blue-500 self-end rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
    : 'bg-gray-200 self-start rounded-tl-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl';

  const textColor = isOutgoing ? 'text-white' : 'text-gray-900';

  return (
    <View className={`max-w-[75%] px-4 py-2 ${bubbleStyles} ${className}`}>
      <Text className={textColor}>{message}</Text>
      {timestamp && (
        <Text
          className={`text-xs mt-1 ${isOutgoing ? 'text-blue-100' : 'text-gray-500'}`}
        >
          {timestamp}
        </Text>
      )}
    </View>
  );
}

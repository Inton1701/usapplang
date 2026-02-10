import React, { useState } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { SendIcon } from '../icons';

export interface MessageComposerProps {
  onSend?: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function MessageComposer({
  onSend,
  placeholder = 'Type a message...',
  disabled = false,
  className = '',
}: MessageComposerProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && onSend) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <View className={`flex-row items-end bg-white border-t border-gray-200 px-4 py-2 ${className}`}>
      <View className="flex-1 bg-gray-100 rounded-3xl px-4 py-2 mr-2">
         <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          multiline
          className="text-base text-gray-900 max-h-[100px]"
          editable={!disabled}
          accessibilityLabel="Message input"
        />
      </View>
      <Pressable
        onPress={handleSend}
        disabled={disabled || !message.trim()}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        className={`bg-blue-500 rounded-full w-10 h-10 items-center justify-center ${
          disabled || !message.trim() ? 'opacity-50' : 'active:bg-blue-600'
        }`}
      >
        <SendIcon size={18} color="#ffffff" />
      </Pressable>
    </View>
  );
}

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '../ui/Text';
import { IconButton } from '../ui/IconButton';
import { Avatar } from '../ui/Avatar';
import { BackIcon } from '../icons';

export interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: string;
  isOnline?: boolean;
  onBackPress?: () => void;
  onAvatarPress?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
}

export function ChatHeader({
  title,
  subtitle,
  avatar,
  isOnline,
  onBackPress,
  onAvatarPress,
  rightActions,
  className = '',
}: ChatHeaderProps) {
  return (
    <View
      className={`flex-row items-center bg-white border-b border-gray-200 px-4 py-3 ${className}`}
    >
      {onBackPress && (
        <IconButton
          icon={<BackIcon size={24} color="#374151" />}
          onPress={onBackPress}
          accessibilityLabel="Go back"
          className="mr-2"
        />
      )}
      
      <Pressable 
        className="flex-row items-center flex-1" 
        onPress={onAvatarPress}
        disabled={!onAvatarPress}
        accessibilityRole="button"
        accessibilityLabel={onAvatarPress ? `View ${title}'s profile` : undefined}
      >
        <Avatar 
          source={avatar} 
          fallbackText={title} 
          size={40} 
          isOnline={isOnline}
          showPresence={isOnline !== undefined}
          className="mr-3" 
        />
        
        <View className="flex-1">
          <Text variant="title" className="text-base">
            {title}
          </Text>
          {subtitle && (
            <Text variant="muted" className="text-xs">
              {subtitle}
            </Text>
          )}
        </View>
      </Pressable>
      
      {rightActions && <View className="ml-2">{rightActions}</View>}
    </View>
  );
}

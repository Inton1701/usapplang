import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';

export interface BadgeProps {
  count?: number;
  maxCount?: number;
  dot?: boolean;
  className?: string;
}

export function Badge({
  count = 0,
  maxCount = 99,
  dot = false,
  className = '',
}: BadgeProps) {
  if (count === 0 && !dot) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View
      className={`bg-red-500 rounded-full items-center justify-center ${
        dot ? 'w-2 h-2' : 'min-w-[20px] h-5 px-1.5'
      } ${className}`}
      accessibilityRole="text"
      accessibilityLabel={dot ? 'Notification badge' : `${count} notifications`}
    >
      {!dot && (
        <Text className="text-white text-xs font-bold">
          {displayCount}
        </Text>
      )}
    </View>
  );
}

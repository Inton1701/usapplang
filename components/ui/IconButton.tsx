import React from 'react';
import { Pressable, View } from 'react-native';

export interface IconButtonProps {
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  disabled?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

export function IconButton({
  icon,
  onPress,
  size = 40,
  disabled = false,
  accessibilityLabel,
  className = '',
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      className={`rounded-full active:bg-gray-200 items-center justify-center ${disabled ? 'opacity-50' : ''} ${className}`}
      style={{ width: size, height: size }}
    >
      <View className="items-center justify-center">{icon}</View>
    </Pressable>
  );
}

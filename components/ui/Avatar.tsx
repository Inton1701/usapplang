import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { Text } from './Text';

export interface AvatarProps {
  source?: ImageSourcePropType | string;
  fallbackText?: string;
  size?: number;
  className?: string;
}

export function Avatar({
  source,
  fallbackText = '?',
  size = 40,
  className = '',
}: AvatarProps) {
  const getInitials = (text: string) => {
    return text
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const imageSource = typeof source === 'string' ? { uri: source } : source;

  return (
    <View
      style={{ width: size, height: size }}
      className={`rounded-full bg-blue-500 items-center justify-center overflow-hidden ${className}`}
      accessibilityRole="image"
      accessibilityLabel={fallbackText ? `Avatar for ${fallbackText}` : 'Avatar'}
    >
      {imageSource ? (
        <Image
          source={imageSource}
          style={{ width: size, height: size }}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className="text-white font-semibold" style={{ fontSize: size * 0.4 }}>
          {getInitials(fallbackText)}
        </Text>
      )}
    </View>
  );
}

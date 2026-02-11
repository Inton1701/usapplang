import React from 'react';
import { View, Image, ImageSourcePropType } from 'react-native';
import { Text } from './Text';

export interface AvatarProps {
  source?: ImageSourcePropType | string;
  fallbackText?: string;
  size?: number;
  className?: string;
  isOnline?: boolean;
  showPresence?: boolean;
}

export function Avatar({
  source,
  fallbackText = '?',
  size = 40,
  className = '',
  isOnline = false,
  showPresence = false,
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
  const badgeSize = Math.max(size * 0.25, 10);

  return (
    <View
      style={{ width: size, height: size }}
      className="relative"
      accessibilityRole="image"
      accessibilityLabel={fallbackText ? `Avatar for ${fallbackText}` : 'Avatar'}
    >
      <View
        style={{ width: size, height: size }}
        className={`rounded-full bg-blue-500 items-center justify-center overflow-hidden ${className}`}
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
      
      {/* Presence badge overlay */}
      {showPresence && (
        <View
          style={{
            width: badgeSize,
            height: badgeSize,
            position: 'absolute',
            bottom: 0,
            right: 0,
          }}
          className={`rounded-full border-2 border-white ${
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
      )}
    </View>
  );
}

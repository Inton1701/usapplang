import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { Text } from '../ui/Text';

export interface TypingIndicatorProps {
  userName?: string;
  className?: string;
}

export function TypingIndicator({ userName, className = '' }: TypingIndicatorProps) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 200),
      createAnimation(dot3, 400),
    ]);

    animations.start();

    return () => animations.stop();
  }, []);

  return (
    <View className={`flex-row items-center ${className}`}>
      {userName && (
        <Text variant="muted" className="mr-2">
          {userName} is typing
        </Text>
      )}
      <View className="flex-row bg-gray-200 rounded-2xl px-4 py-3 space-x-1">
        <Animated.View
          className="w-2 h-2 bg-gray-500 rounded-full"
          style={{ opacity: dot1 }}
        />
        <Animated.View
          className="w-2 h-2 bg-gray-500 rounded-full ml-1"
          style={{ opacity: dot2 }}
        />
        <Animated.View
          className="w-2 h-2 bg-gray-500 rounded-full ml-1"
          style={{ opacity: dot3 }}
        />
      </View>
    </View>
  );
}

import React from 'react';
import { View } from 'react-native';

export interface SpacerProps {
  size?: number;
  horizontal?: boolean;
  className?: string;
}

export function Spacer({ size = 16, horizontal = false, className = '' }: SpacerProps) {
  return (
    <View
      style={horizontal ? { width: size } : { height: size }}
      className={className}
    />
  );
}

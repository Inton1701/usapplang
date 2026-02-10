import React from 'react';
import { View } from 'react-native';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function Divider({ orientation = 'horizontal', className = '' }: DividerProps) {
  const baseStyles = orientation === 'horizontal' 
    ? 'h-[1px] w-full bg-gray-200' 
    : 'w-[1px] h-full bg-gray-200';

  return <View className={`${baseStyles} ${className}`} />;
}

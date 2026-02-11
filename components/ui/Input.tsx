import React from 'react';
import { View, TextInput, TextInputProps } from 'react-native';

export interface InputProps extends TextInputProps {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}

export function Input({
  leftIcon,
  rightIcon,
  className = '',
  containerClassName = '',
  ...props
}: InputProps) {
  return (
    <View className={`flex-row items-center bg-gray-100 rounded-lg px-3 ${containerClassName}`}>
      {leftIcon && <View className="mr-2">{leftIcon}</View>}
      <TextInput
        className={`flex-1 py-3 text-base text-gray-900 ${className}`}
        placeholderTextColor="#9ca3af"
        accessibilityRole="none"
        {...props}
      />
      {rightIcon && <View className="ml-2">{rightIcon}</View>}
    </View>
  );
}
  
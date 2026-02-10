import React from 'react';
import { Pressable, Text, ActivityIndicator } from 'react-native';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
}: ButtonProps) {
  const baseStyles = 'rounded-lg items-center justify-center flex-row';
  
  const variantStyles = {
    primary: 'bg-blue-500 active:bg-blue-600',
    ghost: 'bg-transparent active:bg-gray-100',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
  };
  
  const textVariantStyles = {
    primary: 'text-white font-semibold',
    ghost: 'text-blue-500 font-semibold',
  };
  
  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
  };
  
  const disabledStyles = disabled || loading ? 'opacity-50' : '';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabledStyles} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? 'white' : '#3b82f6'} />
      ) : (
        <Text className={`${textVariantStyles[variant]} ${textSizeStyles[size]}`}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

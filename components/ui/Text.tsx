import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
  children: React.ReactNode;
  variant?: 'body' | 'muted' | 'title';
  className?: string;
}

export function Text({
  children,
  variant = 'body',
  className = '',
  ...props
}: TextProps) {
  const variantStyles = {
    body: 'text-base text-gray-900',
    muted: 'text-sm text-gray-500',
    title: 'text-xl font-bold text-gray-900',
  };

  return (
    <RNText
      className={`${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </RNText>
  );
}

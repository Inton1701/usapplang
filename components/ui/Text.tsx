import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

export interface TextProps extends RNTextProps {
  children: React.ReactNode;
  variant?: 'body' | 'muted' | 'title' | 'sm';
  weight?: 'normal' | 'semibold' | 'bold';
  className?: string;
}

export function Text({
  children,
  variant = 'body',
  weight = 'normal',
  className = '',
  ...props
}: TextProps) {
  const variantStyles: Record<string, string> = {
    body: 'text-base text-gray-900',
    muted: 'text-sm text-gray-500',
    title: 'text-xl text-gray-900',
    sm: 'text-sm text-gray-900',
  };

  const weightStyles: Record<string, string> = {
    normal: '',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const classes = `${variantStyles[variant] ?? ''} ${weightStyles[weight] ?? ''} ${className}`.trim();

  return (
    <RNText
      className={classes}
      {...props}
    >
      {children}
    </RNText>
  );
}

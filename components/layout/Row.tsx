import React from 'react';
import { View, ViewProps } from 'react-native';

export interface RowProps extends ViewProps {
  children: React.ReactNode;
  gap?: number;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

export function Row({
  children,
  gap,
  align = 'stretch',
  justify = 'start',
  className = '',
  ...props
}: RowProps) {
  const alignMap = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyMap = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  const gapClass = gap ? `gap-${gap}` : '';

  return (
    <View
      className={`flex-row ${alignMap[align]} ${justifyMap[justify]} ${gapClass} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}

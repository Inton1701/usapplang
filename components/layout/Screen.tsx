import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  safe?: boolean;
  className?: string;
}

export function Screen({ children, safe = true, className = '', ...props }: ScreenProps) {
  const Container = safe ? SafeAreaView : View;
  
  return (
    <Container
      className={`flex-1 bg-white ${className}`}
      {...props}
    >
      {children}
    </Container>
  );
}

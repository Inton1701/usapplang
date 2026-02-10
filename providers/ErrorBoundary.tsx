// ──────────────────────────────────────────────
// ErrorBoundary — catches render errors
// ──────────────────────────────────────────────

import React, { Component, type ErrorInfo } from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center bg-white px-6">
          <Text className="text-2xl font-bold text-red-600 mb-2">Something went wrong</Text>
          <Text className="text-gray-500 text-center mb-6">
            {this.state.error?.message ?? 'An unexpected error occurred'}
          </Text>
          <Pressable
            onPress={() => this.setState({ hasError: false, error: null })}
            className="bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Try Again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

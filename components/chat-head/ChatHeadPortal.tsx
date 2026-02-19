// ──────────────────────────────────────────────
// ChatHeadPortal — absolute overlay that sits above
// the entire navigation stack without blocking any
// navigation gestures.
//
// Render Strategy:
//   • <View pointerEvents="box-none"> → the container
//     itself is invisible to touches, so all gestures
//     pass through to the navigator underneath.
//   • Only the actual bubble / mini-window capture
//     touches (default pointerEvents="auto").
//
// Placement:
//   • Rendered as a sibling *after* <Stack> in the
//     root _layout.tsx, within SafeAreaProvider so
//     the safe-area context is already available.
// ──────────────────────────────────────────────

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useChatHead } from '@/providers/ChatHeadProvider';
import { FloatingChatHead } from './FloatingChatHead';
import { MiniChatWindow } from './MiniChatWindow';

export function ChatHeadPortal() {
  const { visibility } = useChatHead();

  // Nothing to render while fully hidden
  if (visibility === 'hidden') return null;

  return (
    // box-none: this View itself does not intercept any touches,
    // but its children can receive events normally.
    <View style={styles.portal} pointerEvents="box-none">
      {/* Mini window renders first (lower z-order) so
          the draggable bubble stays on top */}
      <MiniChatWindow />

      {/* The draggable bubble — appears on top of everything */}
      <FloatingChatHead />
    </View>
  );
}

const styles = StyleSheet.create({
  portal: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9998,
    // Elevate above RN Screens modal stack on Android
    elevation: 9998,
  },
});

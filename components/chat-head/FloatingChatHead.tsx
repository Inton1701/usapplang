// ──────────────────────────────────────────────
// FloatingChatHead
//
// Badge is rendered OUTSIDE the bubble circle,
// positioned on the opposite side from the snapped
// edge (Messenger-style). Snapping right → badge
// slides to the left of the circle; snapping left
// → badge slides to the right.
// ──────────────────────────────────────────────

import React, { useCallback, useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  clamp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChatHead } from '@/providers/ChatHeadProvider';
import { Text } from '@/components/ui/Text';

// ─── Constants ─────────────────────────────────

const BUBBLE_SIZE = 58;
/** Diameter of the outside badge */
const BADGE_SIZE = 22;
const SNAP_PADDING = 8;
const DRAG_SCALE = 1.1;

const SPRING = { damping: 18, stiffness: 200, mass: 0.8 } as const;

// ─── Component ─────────────────────────────────

export function FloatingChatHead() {
  const { width: W, height: H } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    visibility,
    activePeer,
    totalUnread,
    snappedSide,
    expandMiniWindow,
    collapseToBubble,
    setSnappedSide,
  } = useChatHead();

  // ── Bounds ──────────────────────────────────
  const minY = insets.top + 8;
  const maxY = H - insets.bottom - BUBBLE_SIZE - 8;
  const snapLeft = insets.left + SNAP_PADDING;
  const snapRight = W - BUBBLE_SIZE - SNAP_PADDING - insets.right;

  // ── Shared values ────────────────────────────
  const x = useSharedValue(snapRight);
  const y = useSharedValue(H * 0.45);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  // 0 = snapped right, 1 = snapped left  (drives badge X animation)
  const sideValue = useSharedValue<0 | 1>(snappedSide === 'right' ? 0 : 1);

  // ── Re-snap on dimension change ──────────────
  useEffect(() => {
    const target = snappedSide === 'right' ? snapRight : snapLeft;
    x.value = withSpring(target, SPRING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [W, H]);

  // ── Pop-in entrance ──────────────────────────
  useEffect(() => {
    if (visibility === 'bubble' || visibility === 'mini-window') {
      opacity.value = withSequence(
        withTiming(0, { duration: 0 }),
        withDelay(40, withTiming(1, { duration: 160 })),
      );
      scale.value = withSequence(
        withTiming(0.15, { duration: 0 }),
        withDelay(40, withSpring(1, { damping: 14, stiffness: 220 })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibility === 'hidden']);

  // ── Tap handler (JS thread) ──────────────────
  const handleTap = useCallback(() => {
    if (visibility === 'bubble') expandMiniWindow();
    else if (visibility === 'mini-window') collapseToBubble();
  }, [visibility, expandMiniWindow, collapseToBubble]);

  const notifySnapSide = useCallback(
    (side: 'left' | 'right') => setSnappedSide(side),
    [setSnappedSide],
  );

  // ── Gestures ─────────────────────────────────
  const panGesture = Gesture.Pan()
    .minDistance(6)
    .onBegin(() => {
      startX.value = x.value;
      startY.value = y.value;
      scale.value = withSpring(DRAG_SCALE, { damping: 12, stiffness: 240 });
    })
    .onUpdate((e) => {
      x.value = clamp(startX.value + e.translationX, snapLeft, snapRight);
      y.value = clamp(startY.value + e.translationY, minY, maxY);
    })
    .onEnd(() => {
      const midX = x.value + BUBBLE_SIZE / 2;
      const toRight = midX > W / 2;
      sideValue.value = toRight ? 0 : 1;
      x.value = withSpring(toRight ? snapRight : snapLeft, {
        ...SPRING,
        overshootClamping: false,
      });
      scale.value = withSpring(1, SPRING);
      runOnJS(notifySnapSide)(toRight ? 'right' : 'left');
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING);
    });

  const tapGesture = Gesture.Tap()
    .maxDistance(8)
    .onEnd(() => runOnJS(handleTap)());

  const gesture = Gesture.Race(panGesture, tapGesture);

  // ── Animated styles ──────────────────────────
  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const elevationStyle = useAnimatedStyle(() => ({
    shadowOpacity: withTiming(scale.value > 1 ? 0.4 : 0.2, { duration: 120 }),
    elevation: scale.value > 1 ? 20 : 8,
  }));

  /**
   * Badge X offset (relative to wrapper's left=0):
   *   snapped RIGHT → badge sits left of circle (inner left side of wrapper)
   *   snapped LEFT  → badge sits right of circle (inner right side of wrapper)
   */
  const badgeAnimStyle = useAnimatedStyle(() => {
    const badgeX = withSpring(
      sideValue.value === 0
        ? -BADGE_SIZE * 0.45          // left of circle when snapped right
        : BUBBLE_SIZE - BADGE_SIZE * 0.55, // right of circle when snapped left
      SPRING,
    );
    return { transform: [{ translateX: badgeX }] };
  });

  if (visibility === 'hidden' || !activePeer) return null;

  const { user: peer } = activePeer;
  const avatarUri = peer.photoURL ?? peer.photos?.[0];

  return (
    <GestureDetector gesture={gesture}>
      {/*
        Wrapper is intentionally wider than the circle so the outside
        badge has room. No overflow:hidden — badge must be visible.
      */}
      <Animated.View
        style={[styles.wrapper, wrapperStyle, elevationStyle]}
        accessibilityRole="button"
        accessibilityLabel={`Chat with ${peer.name}. ${totalUnread} unread`}
      >
        {/* ── Circle ── */}
        <View style={styles.circle}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <Text style={styles.initials}>
                {peer.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          )}
          {peer.isOnline && <View style={styles.onlineRing} />}
        </View>

        {/* ── Badge — outside the circle ── */}
        {totalUnread > 0 && (
          <Animated.View style={[styles.badge, badgeAnimStyle]}>
            <Text style={styles.badgeText}>
              {totalUnread > 99 ? '99+' : String(totalUnread)}
            </Text>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Styles ────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    // Wider than circle so badge has room outside it
    width: BUBBLE_SIZE + BADGE_SIZE,
    height: BUBBLE_SIZE + BADGE_SIZE * 0.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    zIndex: 9999,
  },
  circle: {
    position: 'absolute',
    left: BADGE_SIZE * 0.3,
    top: BADGE_SIZE * 0.25,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#1877F2',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
  avatar: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
  },
  initials: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  onlineRing: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#31A24C',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: 0,
    left: 0,
    minWidth: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#E41E3F',
    borderWidth: 2.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 10000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
  },
});

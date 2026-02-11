import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Text } from './Text';

export interface ProfileCarouselProps {
  photos: string[];
  size?: number;
  showDots?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function ProfileCarousel({
  photos,
  size = SCREEN_WIDTH,
  showDots = true,
}: ProfileCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / size);
    setActiveIndex(index);
  };

  if (!photos || photos.length === 0) {
    return (
      <View
        style={{ width: size, height: size }}
        className="bg-gray-200 items-center justify-center"
      >
        <Text variant="muted">No photos</Text>
      </View>
    );
  }

  return (
    <View style={{ width: size, height: size }} className="relative">
      <FlatList
        ref={flatListRef}
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        keyExtractor={(item, index) => `photo-${index}`}
        renderItem={({ item }) => (
          <View style={{ width: size, height: size }}>
            <Image
              source={{ uri: item }}
              style={{ width: size, height: size }}
              resizeMode="cover"
            />
          </View>
        )}
      />

      {/* Pagination dots */}
      {showDots && photos.length > 1 && (
        <View className="absolute bottom-4 left-0 right-0 flex-row justify-center items-center">
          {photos.map((_, index) => (
            <View
              key={index}
              className={`w-2 h-2 rounded-full mx-1 ${
                index === activeIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

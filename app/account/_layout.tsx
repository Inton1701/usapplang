// app/account/_layout.tsx

import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { View } from 'react-native';
import { SegmentedTabs, Spacer } from '@/components';

export default function AccountTabsLayout() {
  const router = useRouter();
  const segments = useSegments();

  const activeIndex = segments.includes('contact') ? 1 : 0;

  return (
    <View className="flex-1 bg-white">
      <Spacer size={16} />
      <SegmentedTabs
        tabs={['Personal', 'Contact']}
        activeIndex={activeIndex}
        onChange={(index: number) => {
          if (index === 0) router.push('/account/personal');
          else router.push('/account/contact');
        }}
      />
      <Slot />
    </View>
  );
}

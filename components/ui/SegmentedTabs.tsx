'use client';

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';

interface SegmentedTabsProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function SegmentedTabs({
  tabs,
  activeIndex,
  onChange,
}: SegmentedTabsProps) {
  return (
    <View className="flex-row bg-gray-100 rounded-xl p-1">
      {tabs.map((tab, index) => {
        const active = index === activeIndex;

        return (
          <Pressable
            key={tab}
            onPress={() => onChange(index)}
            className={`flex-1 py-2 rounded-lg ${
              active ? 'bg-white border border-gray-200' : ''
            }`}
          >
            <Text
              className={`text-center ${
                active
                  ? 'text-blue-600 font-semibold'
                  : 'text-gray-500'
              }`}
            >
              {tab}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

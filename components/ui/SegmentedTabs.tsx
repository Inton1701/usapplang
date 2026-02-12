'use client';

import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';

interface TabItem {
  label: string;
  icon?: string;
}

type TabsProp = Array<string | TabItem>;

interface SegmentedTabsProps {
  tabs: TabsProp;
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
        const item: TabItem =
          typeof tab === 'string' ? { label: tab } : (tab as TabItem);

        return (
          <Pressable
            key={item.label}
            onPress={() => onChange(index)}
            className={`flex-1 py-2 rounded-lg ${
              active ? 'bg-white border border-gray-200' : ''
            }`}
          >
            <View className="flex-row items-center justify-center space-x-2">
              {item.icon && (
                <Ionicons
                  name={item.icon as any}
                  size={16}
                  color={active ? '#2563eb' : '#6b7280'}
                />
              )}
              <Text
                className={`text-center ${
                  active ? 'text-blue-600 font-semibold' : 'text-gray-500'
                }`}
              >
                {item.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

'use client';

import { View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text } from './Text';

export interface SelectProps {
  label?: string;
  value?: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}

export function Select({ label, value, onChange, options }: SelectProps) {
  return (
    <View>
      {label && (
        <Text variant="sm" className="mb-1 font-semibold">
          {label}
        </Text>
      )}

      <View className="border border-gray-300 rounded-xl">
        <Picker
          selectedValue={value}
          onValueChange={(v) => onChange(v)}
        >
          {options.map((opt) => (
            <Picker.Item
              key={opt.value}
              label={opt.label}
              value={opt.value}
            />
          ))}
        </Picker>
      </View>
    </View>
  );
}

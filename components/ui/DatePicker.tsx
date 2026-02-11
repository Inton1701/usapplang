'use client';

import { View } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Text } from './Text';

export interface DatePickerProps {
  label?: string;
  value?: string;
  onChange: (date: string) => void;
}

export function DatePicker({ label, value, onChange }: DatePickerProps) {
  return (
    <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {label && (
        <Text className="px-4 pt-4 pb-2 font-semibold text-gray-700">
          {label}
        </Text>
      )}

      <Calendar
        onDayPress={(day) => onChange(day.dateString)}
        markedDates={
          value
            ? {
                [value]: {
                  selected: true,
                  selectedColor: '#3b82f6',
                },
              }
            : undefined
        }
        theme={{
          backgroundColor: '#ffffff',
          calendarBackground: '#ffffff',
          todayTextColor: '#3b82f6',
          selectedDayBackgroundColor: '#3b82f6',
          selectedDayTextColor: '#ffffff',
          arrowColor: '#3b82f6',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
      />
    </View>
  );
}

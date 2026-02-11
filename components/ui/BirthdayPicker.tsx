'use client';

import { useMemo, useState } from 'react';
import { View, Modal, Pressable } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text } from './Text';
import { Button } from './Button';

export interface BirthdayPickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function BirthdayPicker({ value, onChange }: BirthdayPickerProps) {
  const [visible, setVisible] = useState(false);

  const initial = value ? new Date(value) : new Date(2000, 0, 1);

  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());
  const [day, setDay] = useState(initial.getDate());

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= 1900; y--) list.push(y);
    return list;
  }, []);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const formattedDate = value
    ? new Date(value).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleSet = () => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    setVisible(false);
  };

  return (
    <>
      {/* Textbox */}
      <Pressable onPress={() => setVisible(true)}>
        <View pointerEvents="none">
          <Text variant="sm" className="mb-1 font-semibold">
            Birthday
          </Text>
          <View className="border border-gray-300 rounded-xl px-4 py-3">
            <Text className={formattedDate ? 'text-black' : 'text-gray-400'}>
              {formattedDate || 'Select birthday'}
            </Text>
          </View>
        </View>
      </Pressable>

      {/* Modal */}
      <Modal transparent animationType="fade" visible={visible}>
        <View className="flex-1 bg-black/40 justify-center px-6">
          <View className="bg-white rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="flex-row justify-between items-center px-4 py-4 border-b">
              <Text weight="bold">Set date</Text>
              <Pressable onPress={() => setVisible(false)}>
                <Text className="text-gray-500 text-lg">✕</Text>
              </Pressable>
            </View>

            {/* Pickers */}
            <View className="flex-row px-4 py-6">
              {/* Month */}
              <Picker
                selectedValue={month}
                style={{ flex: 1 }}
                onValueChange={(v) => setMonth(v)}
              >
                {MONTHS.map((m, i) => (
                  <Picker.Item key={m} label={m} value={i} />
                ))}
              </Picker>

              {/* Day */}
              <Picker
                selectedValue={day}
                style={{ flex: 1 }}
                onValueChange={(v) => setDay(v)}
              >
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                  <Picker.Item key={d} label={String(d)} value={d} />
                ))}
              </Picker>

              {/* Year */}
              <Picker
                selectedValue={year}
                style={{ flex: 1 }}
                onValueChange={(v) => setYear(v)}
              >
                {years.map((y) => (
                  <Picker.Item key={y} label={String(y)} value={y} />
                ))}
              </Picker>
            </View>

            {/* Actions */}
            <View className="flex-row justify-end gap-4 px-4 py-4 border-t">
              <Button variant="ghost" onPress={() => setVisible(false)}>
                Cancel
              </Button>
              <Button onPress={handleSet}>
                Set
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

import React from 'react';
import { View } from 'react-native';
import { CheckIcon, CheckAllIcon } from '../icons';

export type ReadReceiptStatus = 'sent' | 'delivered' | 'read';

export interface ReadReceiptProps {
  status: ReadReceiptStatus;
  className?: string;
}

export function ReadReceipt({ status, className = '' }: ReadReceiptProps) {
  const getColor = () => {
    return status === 'read' ? '#3b82f6' : '#9ca3af';
  };

  const Icon = status === 'sent' ? CheckIcon : CheckAllIcon;

  return (
    <View className={className} accessibilityLabel={`Message ${status}`}>
      <Icon size={16} color={getColor()} />
    </View>
  );
}

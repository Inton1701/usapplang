import React from 'react';
import { Text } from '../ui/Text';

export interface TimestampProps {
  date: Date | string;
  format?: 'time' | 'date' | 'datetime';
  className?: string;
}

export function Timestamp({ date, format = 'time', className = '' }: TimestampProps) {
  const formatDate = (d: Date | string) => {
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    
    const now = new Date();
    const isToday = dateObj.toDateString() === now.toDateString();
    
    switch (format) {
      case 'time':
        return dateObj.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
      case 'date':
        return isToday
          ? 'Today'
          : dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
      case 'datetime':
        return isToday
          ? dateObj.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : dateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
      default:
        return dateObj.toLocaleString();
    }
  };

  return (
    <Text variant="muted" className={`text-xs ${className}`}>
      {formatDate(date)}
    </Text>
  );
}

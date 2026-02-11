// ──────────────────────────────────────────────
// ToastProvider — simple toast/snackbar wrapper
// ──────────────────────────────────────────────

import React from 'react';
import Toast from 'react-native-toast-message';

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toast position="top" topOffset={60} />
    </>
  );
}

// Helper to show toasts from anywhere
export function showToast(
  type: 'success' | 'error' | 'info',
  title: string,
  message?: string,
) {
  Toast.show({ type, text1: title, text2: message, visibilityTime: 3000 });
}

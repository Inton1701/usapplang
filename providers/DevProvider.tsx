// ──────────────────────────────────────────────
// DevProvider — dev‑only tools wrapper
// ──────────────────────────────────────────────

import React, { createContext, useContext, useState } from 'react';

interface DevState {
  isDevMode: boolean;
  showDevPanel: boolean;
  toggleDevPanel: () => void;
  mockLatency: boolean;
  toggleMockLatency: () => void;
}

const DevContext = createContext<DevState>({
  isDevMode: __DEV__,
  showDevPanel: false,
  toggleDevPanel: () => {},
  mockLatency: false,
  toggleMockLatency: () => {},
});

export function DevProvider({ children }: { children: React.ReactNode }) {
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [mockLatency, setMockLatency] = useState(false);

  return (
    <DevContext.Provider
      value={{
        isDevMode: __DEV__,
        showDevPanel,
        toggleDevPanel: () => setShowDevPanel((p) => !p),
        mockLatency,
        toggleMockLatency: () => setMockLatency((p) => !p),
      }}
    >
      {children}
    </DevContext.Provider>
  );
}

export const useDev = () => useContext(DevContext);

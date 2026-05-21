import React from "react";

export type AppKitConfig = {
  projectId: string;
  metadata: {
    name: string;
    description: string;
    url: string;
    icons: string[];
    redirect: {
      native: string;
      universal: string;
    };
  };
  networks: Array<Record<string, unknown>>;
};

export function initializeAppKit(_config: AppKitConfig) {
  // AppKit is native-only; no-op on web.
}

export const AppKitProvider: React.ComponentType<{ children: React.ReactNode }> = ({ children }) => (
  <>{children}</>
);

export function useAppKitHooks() {
  return {
    useAppKit: () => ({ open: () => {} }),
    useAccount: () => ({ address: undefined, isConnected: false }),
  };
}

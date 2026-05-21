import '@walletconnect/react-native-compat';

import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAppKit, AppKit, useAccount, useAppKit } from "@reown/appkit-react-native";
import { EthersAdapter } from "@reown/appkit-ethers-react-native";

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

let isInitialized = false;

export function initializeAppKit(config: AppKitConfig) {
  if (isInitialized) {
    return;
  }

  createAppKit({
    projectId: config.projectId,
    adapters: [new EthersAdapter()],
    networks: config.networks,
    metadata: config.metadata,
    storage: AsyncStorage,
  });

  isInitialized = true;
}

export const AppKitProvider: React.ComponentType<{ children: React.ReactNode }> = AppKit;

export function useAppKitHooks() {
  return { useAppKit, useAccount };
}

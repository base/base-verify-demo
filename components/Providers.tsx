"use client";

import { AppConfig, OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { PropsWithChildren } from "react";
import { createConfig, http, WagmiProvider, injected } from "wagmi";
import { baseAccount } from 'wagmi/connectors';

const onchainKitConfig: AppConfig = {
  appearance: {
    mode: "auto",
  },
  wallet: {
    display: "classic",
    preference: "all",
  },
} as const;

console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('isproduction:', process.env.NODE_ENV === 'production')

const baseAccountConnector = baseAccount({
  appName: 'Base Verify Demo',
  appLogoUrl: 'https://baseverifydemo.com/icon.png',
});

export const config = createConfig({
  chains: [base],
  connectors: [
    baseAccountConnector,
  ],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

const miniKitConfig = {
  enabled: true,
  autoConnect: true,
  notificationProxyUrl: undefined,
} as const;

type ProvidersProps = PropsWithChildren;

export function Providers({ children }: ProvidersProps) {
  return (
    <WagmiProvider config={config}>
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={onchainKitConfig}
        miniKit={miniKitConfig}
      >
        {children}
      </OnchainKitProvider>
    </WagmiProvider>
  );
}

"use client";

import { AppConfig, OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { PropsWithChildren } from "react";
import { createConfig, http, injected, WagmiProvider } from "wagmi";
import { baseAccount } from 'wagmi/connectors';
import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector'

const onchainKitConfig: AppConfig = {
  appearance: {
    mode: "auto",
  },
  wallet: {
    display: "classic",
    preference: "all",
  },
} as const;

export const config = createConfig({
  chains: [base],
  // connectors: [miniAppConnector(), baseAccount()],
  connectors: [injected()],
  transports: {
    [base.id]: http(),
  },
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

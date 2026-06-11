"use client";

import { AppConfig, OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../lib/wagmi";

const onchainKitConfig: AppConfig = {
  appearance: {
    mode: "auto",
  },
  wallet: {
    display: "classic",
    preference: "all",
  },
} as const;

export function Providers({ children }: PropsWithChildren) {
  return (
    <WagmiProvider config={config}>
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
        config={onchainKitConfig}
      >
        {children}
      </OnchainKitProvider>
    </WagmiProvider>
  );
}

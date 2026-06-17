"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { PropsWithChildren } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../lib/wagmi";
import { onchainKitConfig } from "../lib/onchainkit-config";

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

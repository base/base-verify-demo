"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { PropsWithChildren, useEffect } from "react";
import { base, baseSepolia } from "wagmi/chains";
import { useAccount, useSwitchChain } from "wagmi";
import { onchainKitConfig } from "../lib/onchainkit-config";

function SepoliaChainScope({ children }: PropsWithChildren) {
  const { isConnected } = useAccount();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (!isConnected) return;
    switchChain({ chainId: baseSepolia.id });
    return () => {
      switchChain({ chainId: base.id });
    };
  }, [isConnected, switchChain]);

  return children;
}

export function OnchainSepoliaProviders({ children }: PropsWithChildren) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseSepolia}
      config={onchainKitConfig}
    >
      <SepoliaChainScope>{children}</SepoliaChainScope>
    </OnchainKitProvider>
  );
}

import { createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";

export { baseSepolia };

const baseAccountConnector = baseAccount({
  appName: "Base Verify Demo",
  appLogoUrl: "https://baseverifydemo.com/icon.png",
});

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [baseAccountConnector],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
  ssr: true,
});

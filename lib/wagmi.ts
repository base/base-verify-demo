import { createConfig, http } from "wagmi";
import { base } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";

const baseAccountConnector = baseAccount({
  appName: "Base Verify Demo",
  appLogoUrl: "https://baseverifydemo.com/icon.png",
});

export const config = createConfig({
  chains: [base],
  connectors: [baseAccountConnector],
  transports: {
    [base.id]: http(),
  },
  ssr: true,
});

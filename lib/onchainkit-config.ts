import { AppConfig } from "@coinbase/onchainkit";

export const onchainKitConfig: AppConfig = {
  appearance: {
    mode: "auto",
  },
  wallet: {
    display: "classic",
    preference: "all",
  },
} as const;

// Configuration for Base Verify backend integration
export const config = {
  // Base Verify backend URL (should be set in environment variables)
  baseVerifyApiUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_API_URL || 'https://verify.base.dev/v1',

  // Base Verify web app URL
  baseVerifyWebAppUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_WEBAPP_URL || 'https://verify.base.dev',

  // Secret key for authenticating with Base Verify backend (server-side only)
  baseVerifySecretKey: process.env.BASE_VERIFY_SECRET_KEY,

  // Publisher key for client-side API calls (public, requires origin validation)
  baseVerifyPublicKey: process.env.NEXT_PUBLIC_BASE_VERIFY_PUBLIC_KEY,

  // Current app URL for redirects
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://baseverifydemo.com',

  // Onchain claim contract (SybilResistantAirdrop on Base Sepolia — see PRIV-1964 for mainnet migration)
  claimContractAddress: process.env.NEXT_PUBLIC_CLAIM_CONTRACT_ADDRESS || '0x1Bef27589187431eAfE41F807f0bEF5679134f89',
  claimChainId: parseInt(process.env.NEXT_PUBLIC_CLAIM_CHAIN_ID || '84532', 10),
  registryContractAddress:
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS || '0x422cF0f188F8Bf9d93E2810CA429d1bB5cdd620d',
}

const SEPOLIA_EXPLORER = 'https://sepolia.basescan.org/address'

export function contractExplorerUrl(address: string): string {
  return `${SEPOLIA_EXPLORER}/${address}`
}

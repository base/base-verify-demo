// Configuration for Base Verify backend integration
export const config = {
  // Base Verify backend URL (should be set in environment variables)
  baseVerifyApiUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_API_URL || 'https://verify.base.dev/v1',

  // Base Verify web app URL
  baseVerifyWebAppUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_WEBAPP_URL || 'https://verify.base.dev',

  // Secret key for authenticating with Base Verify backend (server-side only)
  baseVerifySecretKey: process.env.BASE_VERIFY_SECRET_KEY,

  // Publisher key for client-side API calls (public, requires origin validation)
  baseVerifyPublisherKey: process.env.NEXT_PUBLIC_BASE_VERIFY_PUBLISHER_KEY,

  // Current app URL for redirects
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://baseverifydemo.com',

  // Onchain claim contract (SybilResistantAirdrop on Base Sepolia — see PRIV-1964 for mainnet migration)
  claimContractAddress: process.env.NEXT_PUBLIC_CLAIM_CONTRACT_ADDRESS || '0xc34001f2d8cc30f1fdd9de549440b72fdbffbebc',
  claimChainId: parseInt(process.env.NEXT_PUBLIC_CLAIM_CHAIN_ID || '84532', 10),
  registryContractAddress:
    process.env.NEXT_PUBLIC_REGISTRY_CONTRACT_ADDRESS || '0xF94b087F8410a116255b8041E3928d4e01b2a2fF',
}

const SEPOLIA_EXPLORER = 'https://sepolia.basescan.org/address'

export function contractExplorerUrl(address: string): string {
  return `${SEPOLIA_EXPLORER}/${address}`
}

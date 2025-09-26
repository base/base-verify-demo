// Configuration for Base Verify backend integration
export const config = {
  // Base Verify backend URL (should be set in environment variables)
  baseVerifyUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_URL || 'https://your-base-verify.ngrok-free.app',

  // base verify mini app url
  baseVerifyMiniAppUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_MINI_APP_URL || 'https://verify.base.dev',
  
  // Secret key for authenticating with Base Verify backend (server-side only)
  baseVerifySecretKey: process.env.BASE_VERIFY_SECRET_KEY,
  
  // Publisher key for app identification  
  baseVerifyPublisherKey: process.env.BASE_VERIFY_PUBLISHER_KEY,
  
  // Current app URL for redirects
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'cbwallet://miniapp?url=https://verified-x-users.vercel.app',
}

// Configuration for Base Verify backend integration
export const config = {
  // Base Verify backend URL (should be set in environment variables)
  baseVerifyApiUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_API_URL || 'https://verify.base.dev/v1',

  // base verify mini app url
  baseVerifyMiniAppUrl: process.env.NEXT_PUBLIC_BASE_VERIFY_MINI_APP_URL || 'https://verify.base.dev',
  
  // Secret key for authenticating with Base Verify backend (server-side only)
  baseVerifySecretKey: process.env.BASE_VERIFY_SECRET_KEY,
  
  // Current app URL for redirects
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://baseverifydemo.com',
}

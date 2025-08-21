/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: [
    '@farcaster/miniapp-sdk',
    '@farcaster/miniapp-core',
    '@farcaster/miniapp-wagmi-connector',
    '@farcaster/quick-auth'
  ],
  experimental: {
    esmExternals: 'loose',
  },
}

module.exports = nextConfig

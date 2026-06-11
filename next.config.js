/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@coinbase/onchainkit',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        '@react-native-async-storage/async-storage': false,
      }
    }
    return config
  },
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        'node_modules/@prisma/engines/**/*',
        '.git/**/*',
      ],
    },
    outputFileTracingIgnores: ['**/.git/**/*'],
  },
  outputFileTracing: true,
}

module.exports = nextConfig

import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import '@coinbase/onchainkit/styles.css'

import { ToastProvider } from '../components/ToastProvider'

// Load Providers client-only: OnchainKit + wagmi + farcaster SDK are
// browser-only packages whose ESM dist cannot be require()'d by
// Node.js in Vercel's serverless SSR runtime.
const Providers = dynamic(
  () => import('../components/Providers').then((mod) => mod.Providers),
  { ssr: false }
)

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        html,
        body {
          background-color: white;
          margin: 0;
          padding: 0;
        }
      `}</style>
      <Providers>
        <ToastProvider>
          <Component {...pageProps} />
        </ToastProvider>
      </Providers>
    </>
  )
}

import type { AppProps } from 'next/app'
import '@coinbase/onchainkit/styles.css'

import { Providers } from '../components/Providers'
import { MiniAppGuard } from '../components/MiniAppGuard'
import { ToastProvider } from '../components/ToastProvider'

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
        <MiniAppGuard>
          <ToastProvider>
            <Component {...pageProps} />
          </ToastProvider>
        </MiniAppGuard>
      </Providers>
    </>
  )
}

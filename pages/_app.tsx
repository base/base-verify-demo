import type { AppProps } from 'next/app'
import { Providers } from '../components/Providers'
import '@coinbase/onchainkit/styles.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Providers>
      <Component {...pageProps} />
    </Providers>
  )
}

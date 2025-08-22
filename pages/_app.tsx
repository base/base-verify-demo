import type { AppProps } from 'next/app'
import dynamic from 'next/dynamic'
import '@coinbase/onchainkit/styles.css'

const Providers = dynamic(() => import('../components/Providers').then(m => m.Providers), { ssr: false })

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
        <Component {...pageProps} />
      </Providers>
    </>
  )
}

import { Html, Head, Main, NextScript } from 'next/document'
import { ErudaProvider } from '../components/ErudaProvider'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <ErudaProvider />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

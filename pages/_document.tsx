import { Html, Head, Main, NextScript } from 'next/document'
import { ErudaProvider } from '../components/ErudaProvider'

export default function Document() {
  const URL = "https://base-camp-verify-demo.vercel.app";
  
  // Mini App embed configuration for sharing
  const miniAppEmbed = {
    version: "1",
    imageUrl: `${URL}/hero.png`,
    button: {
      title: "Verify Your Identity",
      action: {
        type: "launch_miniapp",
        url: URL,
        name: "Airdrop Demo",
        splashImageUrl: `${URL}/logo.png`,
        splashBackgroundColor: "#000000"
      }
    }
  };

  // For backward compatibility
  const frameEmbed = {
    ...miniAppEmbed,
    button: {
      ...miniAppEmbed.button,
      action: {
        ...miniAppEmbed.button.action,
        type: "launch_frame"
      }
    }
  };

  return (
    <Html lang="en">
      <Head>
        <ErudaProvider />
        {/* Mini App sharing meta tags */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />
        {/* For backward compatibility */}
        <meta name="fc:frame" content={JSON.stringify(frameEmbed)} />
        
        {/* Open Graph meta tags for better sharing */}
        <meta property="og:title" content="Airdrop Demo" />
        <meta property="og:description" content="Verify your identity with Base Verify to claim your airdrop" />
        <meta property="og:image" content={`${URL}/hero.png`} />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Airdrop Demo" />
        <meta name="twitter:description" content="Verify your identity with Base Verify to claim your airdrop" />
        <meta name="twitter:image" content={`${URL}/hero.png`} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

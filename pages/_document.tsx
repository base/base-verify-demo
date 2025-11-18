import { Html, Head, Main, NextScript } from 'next/document'
import { ErudaProvider } from '../components/ErudaProvider'
import { config } from '../lib/config'

export default function Document() {
  const appUrl = config.appUrl;
  
  // Mini App embed configuration for sharing
  const miniAppEmbed = {
    version: "1",
    imageUrl: `${appUrl}/hero.png`,
    button: {
      title: "Verify Your Identity",
      action: {
        type: "launch_miniapp",
        url: appUrl,
        name: "Airdrop Demo",
        splashImageUrl: `${appUrl}/splash.png`,
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
        
        {/* Favicon */}
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="shortcut icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
        
        {/* Mini App sharing meta tags */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />
        {/* For backward compatibility */}
        <meta name="fc:frame" content={JSON.stringify(frameEmbed)} />
        
        {/* Open Graph meta tags for better sharing */}
        <meta property="og:title" content="Airdrop Demo" />
        <meta property="og:description" content="Verify your identity with Base Verify to claim your airdrop" />
        <meta property="og:image" content={`${appUrl}/hero.png`} />
        <meta property="og:url" content={appUrl} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Airdrop Demo" />
        <meta name="twitter:description" content="Verify your identity with Base Verify to claim your airdrop" />
        <meta name="twitter:image" content={`${appUrl}/hero.png`} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

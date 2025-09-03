import { Html, Head, Main, NextScript } from 'next/document'
import { ErudaProvider } from '../components/ErudaProvider'

export default function Document() {
  const URL = "https://verify-demo-mini-app.vercel.app";
  
  // Mini App embed configuration for sharing
  const miniAppEmbed = {
    version: "1",
    imageUrl: `${URL}/api/embed-image`,
    button: {
      title: "🔐 Verify Your X Account",
      action: {
        type: "launch_miniapp",
        url: URL,
        name: "Verified X Users",
        splashImageUrl: `${URL}/splash.svg`,
        splashBackgroundColor: "#0052FF"
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
        <meta name="fc:miniapp" content='{"version":"1","imageUrl":"https://verify-demo-mini-app.vercel.app/hero.svg","button":{"title":"🔐 Verify Your X Account","action":{"type":"launch_miniapp","url":"https://verify-demo-mini-app.vercel.app","name":"Verified X Users","splashImageUrl":"https://verify-demo-mini-app.vercel.app/splash.svg","splashBackgroundColor":"#0052FF"}}}' />
        {/* For backward compatibility */}
        <meta name="fc:frame" content='{"version":"1","imageUrl":"https://verify-demo-mini-app.vercel.app/hero.svg","button":{"title":"🔐 Verify Your X Account","action":{"type":"launch_frame","url":"https://verify-demo-mini-app.vercel.app","name":"Verified X Users","splashImageUrl":"https://verify-demo-mini-app.vercel.app/splash.svg","splashBackgroundColor":"#0052FF"}}}' />
        
        {/* Open Graph meta tags for better sharing */}
        <meta property="og:title" content="Verified X Users - Farcaster Mini App" />
        <meta property="og:description" content="Verify your X (Twitter) account and join the verified users list using Base Verify" />
        <meta property="og:image" content={`${URL}/hero.svg`} />
        <meta property="og:url" content={URL} />
        <meta property="og:type" content="website" />
        
        {/* Twitter Card meta tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verified X Users - Farcaster Mini App" />
        <meta name="twitter:description" content="Verify your X (Twitter) account and join the verified users list using Base Verify" />
        <meta name="twitter:image" content={`${URL}/hero.svg`} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

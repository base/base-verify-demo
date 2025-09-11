import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const URL = "https://base-camp-verify-demo.vercel.app";

  const config = {
    accountAssociation: {
      "header": "eyJmaWQiOjEzOTEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyMmM5M0I2Q0JGMTlGQmExMGVmOWRlQjFkNGIyYWFiNzJBRTliMkI5In0",
      "payload": "eyJkb21haW4iOiJ2ZXJpZnktZGVtby1taW5pLWFwcC52ZXJjZWwuYXBwIn0",
      "signature": "MHhhNWY3NmEwNDE4ODhmMmE2ZGE3MDYxZmRhZTlmMWE5OGM0OTJjNDFiMGZlNzYxY2YxNTU3OTI3MWM5Y2E5YTQwNDYzZGFjZTljOGJkNzY5MWUwN2QwOWFkYjExZjAxMDE5MWRhZjQ0MmJiMDM1Yzg1MjQ1MzlhNTEzOTM2NjRhMzFj"
    },
    baseBuilder: {
      allowedAddresses: [
        "0xd76798784d9A4635e30A10C48CD267d7d33E182E",
      ],
    },
    frame: {
      version: "1",
      name: "Airdrop Demo",
      subtitle: "Base Verify Identity Verification Demo",
      tagline: "Base Verify Identity Verification Demo",
      description: "Verify your identity with Base Verify to claim your airdrop",
      iconUrl: `${URL}/icon.png`,
      splashImageUrl: `${URL}/logo.png`,
      splashBackgroundColor: '#000000',
      requiredChains: ['eip155:8453'],
      homeUrl: URL,
      noindex: true,
      primaryCategory: "utility" as const,
      tags: ['verification', 'identity'],
      heroImageUrl: `${URL}/hero.png`,
      ogImageUrl: `${URL}/hero.png`,
      ogTitle: "Airdrop Demo",
      ogDescription: "Verify your identity with Base Verify to claim your airdrop",
    },
  } as const;

  if (req.method === 'GET') {
    res.status(200).json(config);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

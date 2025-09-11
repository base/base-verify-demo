import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const URL = "https://base-camp-verify-demo.vercel.app";

  const config = {
    accountAssociation: {
      header: "eyJmaWQiOjEzOTEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyMmM5M0I2Q0JGMTlGQmExMGVmOWRlQjFkNGIyYWFiNzJBRTliMkI5In0",
      payload: "eyJkb21haW4iOiJiYXNlLWNhbXAtdmVyaWZ5LWRlbW8udmVyY2VsLmFwcCJ9",
      signature: "MHg0ZTg2MWM3NjA2ZGRhNzk4OTI4YjNlMzZlZmI0ZWFiZWY2MzY5NGFjNzkzNWI3ZTJjOTBhZjczY2UxMDYxOGE4Mzc0NWQxMTdlYTA1MDAwMzA2MDQzNzUxY2RkZWUxNTUyZDdjNDRhZmEwZTU1YjYzMjczOWFlNTY1MDk3MmE0NTFj"
    },
    baseBuilder: {
      allowedAddresses: [
        "0xd76798784d9A4635e30A10C48CD267d7d33E182E",
      ],
    },
    frame: {
      version: "1",
      name: "Airdrop Demo",
      subtitle: "powered by Base Verify",
      tagline: "powered by Base Verify",
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

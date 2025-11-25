import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const URL = "https://baseverifydemo.com";

  const config = {
    accountAssociation: {
      "header": "eyJmaWQiOjEzOTEsInR5cGUiOiJhdXRoIiwia2V5IjoiMHgzMjA3OUM0ZjVFMjNjOGNlMENhZWQwODljQzUzRDExQjc0QjA2ZkIxIn0",
      "payload": "eyJkb21haW4iOiJiYXNldmVyaWZ5ZGVtby5jb20ifQ",
      "signature": "KojotounqAB415NaY2AzhC4IXw51wSa7rdt/7BlL40s0ndxUyu9LZdTq8cgr2d0ecQpbPo6Ziu52dLHaTn9DMRw="
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
      splashImageUrl: `${URL}/splash.png`,
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

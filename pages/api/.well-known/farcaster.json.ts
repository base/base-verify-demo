import { NextApiRequest, NextApiResponse } from 'next';

const ROOT_URL = "https://verify-demo-mini-app.vercel.app";

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
    version: '1',
    name: 'Demo BVMA',
    subtitle: 'Demo of Base Verify Mini App',
    description: 'A demo of using the Base Verify Mini App to obtain a verification.',
    iconUrl: `${ROOT_URL}/icon.svg`,
    imageUrl: `${ROOT_URL}/icon.svg`,
    heroImageUrl: `${ROOT_URL}/icon.svg`,
    splashImageBackgroundColor: '#000000',
    ogImageUrl: `${ROOT_URL}/icon.svg`,
    splashBackgroundColor: '#000000',
    homeUrl: ROOT_URL,
    primaryCategory: 'utility' as const,
    tags: ['verification', 'identity', 'base', 'blockchain'],
    tagline: 'Demo of Base Verify Mini App',
    ogTitle: 'Demo - BVMA',
    ogDescription:
      'A demo of using the Base Verify Mini App to obtain a verification.',
  },
} as const;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    res.status(200).json(config);
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

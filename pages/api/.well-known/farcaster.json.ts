import { withValidManifest } from '@coinbase/onchainkit/minikit';
import { NextApiRequest, NextApiResponse } from 'next';

const ROOT_URL = "https://verify-demo-mini-app.vercel.app";

const config = {
  accountAssociation: {
    header: '',
    payload: '',
    signature: '',
  },
  frame: {
    version: '1',
    name: 'Demo - BVMA',
    subtitle: 'Demo of Base Verify Mini App',
    description: 'A demo of using the Base Verify Mini App to obtain a verification.',
    iconUrl: `${ROOT_URL}/icon.svg`,
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
    res.status(200).json(withValidManifest(config));
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

{
  "name": "verify-demo-mini-app",
  "version": "1.0.0",
  "description": "Simple Next.js app with Postgres for verified X users",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3003",
    "build": "next build",
    "vercel-build": "npx prisma generate && next build && npx prisma migrate deploy",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@coinbase/onchainkit": "1.1.2",
    "@farcaster/miniapp-sdk": "0.1.9",
    "@prisma/client": "^5.20.0",
    "ethers": "6.12.1",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-markdown": "^10.1.0",
    "react-syntax-highlighter": "^16.1.0",
    "rehype-raw": "^7.0.0",
    "rehype-sanitize": "^6.0.0",
    "remark-gfm": "^4.0.1",
    "siwe": "^3.0.0",
    "viem": "^2.27.2",
    "wagmi": "^2.14.11"
  },
  "devDependencies": {
    "@types/node": "^20.12.7",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/react-syntax-highlighter": "^15.5.13",
    "eruda": "^3.4.3",
    "eslint": "^8.57.0",
    "eslint-config-next": "15.0.3",
    "prisma": "^5.20.0",
    "typescript": "^5.4.5"
  }
}

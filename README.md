# Verify Demo Mini App

A simple Next.js application with Postgres database to store verified X (Twitter) user data.

## Features

- **Wallet Integration**: Connect Coinbase wallet or other Web3 wallets
- **Auto-fill Address**: Connected wallet address automatically populates in the form
- **Simple Next.js frontend** to view and add verified X users
- **Postgres database** with Prisma ORM
- **Base network support** via OnchainKit
- **Ready for Vercel deployment**

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file with your database URLs and OnchainKit API key:

```env
# Database URLs - These will be provided by Vercel when you create a Postgres database
POSTGRES_PRISMA_URL="postgres://username:password@hostname:port/database?schema=public&pgbouncer=true&connect_timeout=15"
POSTGRES_URL_NON_POOLING="postgres://username:password@hostname:port/database?schema=public"

# OnchainKit API Key - Get this from Coinbase Developer Platform
NEXT_PUBLIC_ONCHAINKIT_API_KEY="your_onchainkit_api_key_here"
```

To get an OnchainKit API key:
1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
2. Create an account or sign in
3. Create a new project and get your API key

### 3. Set up database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment to Vercel

1. Push your code to GitHub
2. Connect your GitHub repo to Vercel
3. In Vercel dashboard, go to Storage → Create Database → Postgres
4. The environment variables will be automatically added to your project
5. Deploy!

## Database Schema

The app uses a single `verified_users` table with the following fields:

- `id` - Unique identifier
- `address` - Wallet address
- `x_user_id` - X (Twitter) user ID (unique)
- `x_username` - X username
- `x_followers` - Follower count
- `created_at` - When the record was created
- `updated_at` - When the record was last updated

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push Prisma schema to database
- `npm run db:studio` - Open Prisma Studio
- `npm run db:generate` - Generate Prisma client

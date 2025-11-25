# Base Verify Airdrop Demo

A Next.js mini app demonstrating Base Verify integration for X (Twitter) verification and airdrop claiming. Users connect their wallet, verify their X account through Base Verify, and claim an airdrop.

## Features

- **🔐 Wallet Integration**: Connect via Coinbase Wallet or other Web3 wallets using OnchainKit
- **✅ X (Twitter) Verification**: Verify X accounts using Base Verify API

## Architecture

### Authentication Flow

1. **Wallet Connection**: User connects wallet via OnchainKit
2. **Signature Generation**: App generates SIWE message with verification traits
3. **Base Verify Redirect**: User redirects to Base Verify mini app with PKCE challenge
4. **X Verification**: User verifies X account on Base Verify
5. **Callback**: Base Verify redirects back with authorization code
6. **Token Exchange**: App exchanges code for verification token
7. **Database Storage**: Store wallet address + verification token (prevents reuse)
8. **Airdrop Claimed**: Success confirmation

### Database Schema

```prisma
model VerifiedUser {
  id              String    @id @default(cuid())
  address         String    @unique           // Wallet address
  baseVerifyToken String?   @unique          // Verification token from Base Verify
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@map("verified_users")
}
```

**Key Constraints:**
- `address` is unique (one claim per wallet)
- `baseVerifyToken` is unique (prevents verification token reuse)

### API Routes

- **POST `/api/verify-token`**: Verifies signature with Base Verify API and stores user
- **GET `/api/users`**: Fetches all verified users
- **POST `/api/delete-airdrop`**: Allows users to delete their claim (requires signature)

## Setup

### Prerequisites

- Node.js 20+ and npm
- PostgreSQL database
- Coinbase Developer Platform account
- Base Verify API access (secret key)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

Create a `.env.local` file in the root directory (see .env.example)

### 3. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (for development)
npm run db:push

# Or run migrations (for production)
npx prisma migrate deploy
```

### 4. Run Development Server

```bash
npm run dev
```

The app will start on [http://localhost:3003](http://localhost:3003)

### 5. Open Prisma Studio (Optional)

To view/edit database records:

```bash
npm run db:studio
```

### SIWE Signature with Base Verify

The app uses Sign-In with Ethereum (SIWE) messages with custom resources to communicate verification requirements:

```typescript
// Example SIWE message structure
{
  domain: "your-app.vercel.app",
  address: "0x123...",
  statement: "Sign in with X verification",
  uri: "cbwallet://miniapp?url=https://your-app.vercel.app",
  chainId: 8453, // Base mainnet
  resources: [
    "urn:verify:action:base_verify_token",
    "urn:verify:provider:x",
    "urn:verify:provider:x:verified:true"
  ]
}
```

### Signature Caching

To improve UX, signatures are cached in localStorage for 5 minutes:
- Prevents repeated signature requests during verification flow
- Automatically cleared on address change or error
- Validates address and action match before reuse

### PKCE Flow

The app implements PKCE (Proof Key for Code Exchange) for secure OAuth-like flow:
1. Generate code verifier and challenge
2. Store verifier in sessionStorage
3. Redirect to Base Verify with challenge
4. Exchange authorization code + verifier for token

### Delete Functionality

Users can delete their own airdrop claim:
- Signs message: `"Delete airdrop for {address}"`
- Backend verifies signature using Viem (supports EOA & EIP-1271)
- Removes user from database


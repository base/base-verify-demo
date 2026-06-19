# Base Verify Airdrop Demo

A Next.js mini app demonstrating Base Verify integration for social account verification and airdrop claiming. This demo shows how to verify users' social accounts (X/Twitter, Coinbase, Instagram, TikTok) without requiring them to share credentials, while preventing Sybil attacks through deterministic tokens.

## What is Base Verify?

Base Verify allows users to prove ownership of verified accounts on major platforms without sharing credentials. Your app receives a deterministic token that enables Sybil resistance—one verified account = one token = one claim, regardless of how many wallets a user connects.

**Why This Matters:**
Even if a wallet has few transactions, Base Verify reveals if the user is high-value through their verified social accounts (X Blue, Instagram followers, TikTok engagement) or Coinbase One subscription. This lets you identify quality users regardless of on-chain activity.

### Supported Providers

- **X (Twitter)**: Verify accounts, check verification status (blue checkmark), follower counts
- **Coinbase**: Check Coinbase One subscriptions
- **Instagram**: Verify accounts, check follower counts
- **TikTok**: Verify accounts, check followers, likes, video counts

### Key Benefits

- **🛡️ Sybil Resistance**: Deterministic tokens prevent duplicate claims across different wallets
- **🔐 Privacy-First**: Users never share credentials; OAuth handled by Base Verify
- **✅ Trait-Based Access**: Set requirements like "1000+ followers" or "verified account"
- **🌐 Multi-Platform**: Single integration supports multiple identity providers

## Features

- **🔐 Wallet Integration**: Connect via Coinbase Wallet or other Web3 wallets using OnchainKit
- **✅ Social Verification**: Verify X, Coinbase, Instagram, or TikTok accounts using Base Verify API
- **🎯 Trait Requirements**: Require specific account attributes (verified status, follower counts, etc.)
- **🛡️ Anti-Sybil Protection**: Prevent duplicate claims using verification tokens
- **🔒 Secure Flow**: SIWE signatures with backend validation

## Architecture

### Complete Verification Flow

1. **Wallet Connection**: User connects wallet via OnchainKit
2. **Signature Generation**: Frontend generates SIWE message with:
   - Wallet address
   - Provider (x, coinbase, instagram, tiktok)
   - Trait requirements (verified:true, followers:gte:1000, etc.)
   - Action (base_verify_token)
3. **User Signs**: User signs SIWE message with their wallet
4. **Backend Validation**: Your backend validates trait requirements match expectations
5. **Check Verification**: Backend calls Base Verify API with signature
6. **Response Handling**:
   - **200 OK**: User verified and meets traits → Store token and grant access ✅
   - **404 Not Found**: User hasn't verified → Redirect to Base Verify Mini App
   - **400 Bad Request**: User verified but doesn't meet traits → Show requirements not met
7. **OAuth Flow** (if 404): User completes OAuth in Base Verify Mini App
8. **Return & Verify**: User returns to your app → Check again (now 200 OK)
9. **Token Storage**: Store verification token to prevent duplicate claims
10. **Access Granted**: User gains access to airdrop/feature

### How Sybil Resistance Works

The verification token is the key to preventing duplicate claims:

- Wallet A verifies an X account → Base Verify returns `Token: abc123`
- Same X account tries with Wallet B → Base Verify returns `Token: abc123` (same token!)
- Your database sees the token already exists → Block duplicate claim

**Token Properties:**
- **Deterministic**: Same provider account always produces same token
- **Unique per provider**: X token ≠ Instagram token
- **Unique per app**: Your tokens are different from other apps (privacy)
- **Action-specific**: Different actions produce different tokens (e.g., `claim_airdrop` vs `join_allowlist`)
- **Persistent**: Don't expire unless user deletes verification

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

**Why These Constraints Matter:**

1. **`address` is unique**: Prevents the same wallet from claiming multiple times
2. **`baseVerifyToken` is unique**: **This is the anti-sybil protection**
   - Even if a user connects 10 different wallets
   - The same X/Instagram/TikTok account produces the same token
   - Database rejects duplicate tokens → prevents multi-wallet abuse

**Example Sybil Attack Prevention:**
```
User connects Wallet A → verifies X account → gets Token: abc123 → Claims airdrop ✅
User connects Wallet B → verifies SAME X account → gets Token: abc123 → Database rejects (duplicate token) ❌
```

### Trait-Based Verification

Traits are specific attributes of provider accounts you can verify. Examples:

**X (Twitter):**
- `verified:eq:true` - Has blue checkmark
- `verified_type:eq:blue` - Specific verification type
- `followers:gte:1000` - 1000+ followers

**Coinbase:**
- `coinbase_one_active:eq:true` - Active Coinbase One subscription
- `coinbase_one_billed:eq:true` - User has been billed for Coinbase One

**Instagram:**
- `followers_count:gte:5000` - 5000+ followers
- `username:eq:john_doe` - Specific username

**TikTok:**
- `follower_count:gte:1000` - 1000+ followers
- `video_count:gte:50` - 50+ videos
- `likes_count:gte:10000` - 10000+ likes

**Combining Traits (AND logic):**
```typescript
resources: [
  'urn:verify:provider:x',
  'urn:verify:provider:x:verified:eq:true',
  'urn:verify:provider:x:followers:gte:10000'
]
// User must have verified X account AND 10k+ followers
```

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

The app uses Sign-In with Ethereum (SIWE) messages to communicate verification requirements. SIWE provides:

1. **Privacy Protection**: Only the wallet owner can check their verification status
2. **Security**: Proves the request comes from the actual wallet owner
3. **Trait Enforcement**: Encodes verification requirements in the signature

**Example SIWE Message:**
```typescript
{
  domain: "your-app.vercel.app",
  address: "0x123...",
  statement: "Verify your X account",
  uri: "https://your-app.vercel.app",
  chainId: 8453, // Base mainnet
  resources: [
    "urn:verify:provider:x",                     // Which provider to check
    "urn:verify:provider:x:verified:eq:true",    // Must be verified
    "urn:verify:provider:x:followers:gte:1000",  // Must have 1000+ followers
    "urn:verify:action:claim_airdrop"            // Your custom action name
  ]
}
```

**Resource URN Format:**
```
urn:verify:provider:{provider}:{trait_name}:{operation}:{value}
```

Examples:
- `urn:verify:provider:x:followers:gte:1000` - X account with 1000+ followers
- `urn:verify:provider:coinbase:coinbase_one_active:eq:true` - Active Coinbase One
- `urn:verify:provider:instagram:followers_count:gt:5000` - Instagram 5000+ followers

### Security Best Practices

**🔴 Critical: Backend Trait Validation**

Your backend MUST validate that trait requirements in the SIWE message match what your backend expects. This prevents users from modifying trait requirements on the frontend to bypass access controls.

```typescript
// Backend validation before calling Base Verify
import { validateTraits } from './lib/trait-validator';

const expectedTraits = {
  'verified': 'true',
  'followers': 'gte:1000'
};

const validation = validateTraits(message, 'x', expectedTraits);

if (!validation.valid) {
  return res.status(400).json({ error: 'Invalid trait requirements' });
}

// Now safe to forward to Base Verify API
```

**Example Attack Without Validation:**
1. App requires 1000 followers
2. User modifies frontend to only require 10 followers
3. User signs the modified message
4. Without validation, backend forwards to Base Verify
5. User gains access with only 10 followers ❌

**Secret Key Security:**
- ❌ Never expose secret key in frontend code
- ❌ Never use `NEXT_PUBLIC_*` environment variables for secrets
- ❌ Never commit secret keys to version control
- ✅ Always call Base Verify API from your backend
- ✅ Store secret key in backend-only environment variables

### Signature Caching

To improve UX, signatures are cached in localStorage for 5 minutes:
- Prevents repeated signature requests during verification flow
- Automatically cleared on address change or error
- Validates address and action match before reuse

### Base Verify Web App Redirect

When a user hasn't verified yet (404 response), redirect them to the Base Verify web app:

```typescript
function redirectToVerifyWebApp(provider: string) {
  const params = new URLSearchParams({
    redirect_uri: 'https://your-app.com',
    providers: provider, // 'x', 'coinbase', 'instagram', or 'tiktok'
  });
  
  const webAppUrl = `https://verify.base.dev?${params}`;
  window.location.href = webAppUrl;
}
```

User returns with `?success=true`, then check verification again (now returns 200 OK).

### API Response Codes

Understanding Base Verify API responses:

| Code | Meaning | Action |
|------|---------|--------|
| **200 OK** | User verified and meets all trait requirements | ✅ Store token, grant access |
| **404 Not Found** | User hasn't verified this provider yet | 🔄 Redirect to Base Verify Mini App |
| **400 Bad Request** | User verified but doesn't meet trait requirements | ⚠️ Show "Requirements not met" (don't redirect) |
| **401 Unauthorized** | Invalid or missing API key | 🔑 Check your secret key |

**Important:** Don't retry 400 errors. The user has the account but doesn't meet your requirements (e.g., not enough followers). Retrying won't help unless their account metrics change.

### Delete Functionality

Users can delete their own airdrop claim:
- Signs message: `"Delete airdrop for {address}"`
- Backend verifies signature using Viem (supports EOA & EIP-1271)
- Removes user from database
- Note: If user re-verifies the same account, they get the same token (can't claim again)

---

## Documentation

For more detailed information, see the `/docs` folder:

- **[Getting Started](docs/index.md)** - Quick overview and contact information
- **[Core Concepts](docs/core-concepts.md)** - Understanding providers, traits, tokens, and Sybil resistance
- **[Integration Guide](docs/integration.md)** - Complete implementation walkthrough with code examples
- **[Trait Catalog](docs/traits.md)** - All available traits for X, Coinbase, Instagram, and TikTok
- **[API Reference](docs/api.md)** - Complete API endpoint documentation
- **[Security & Privacy](docs/security.md)** - Security best practices and data handling

---

## Get Started

**Want to integrate Base Verify?** Fill out the [interest form](https://forms.gle/6L4hWAHkojYcefz27) and we'll reach out with API access.


# Base Verify Integration Guide

## What is Base Verify?

Base Verify is for mini-app builders to allow their users to prove they have verified accounts (X Blue, Coinbase One) without sharing credentials.

**How it works:**

1. Your app checks if user has verification → backend returns yes/no  
2. If no verification → redirect user to Base Verify Mini App  
3. User completes OAuth in mini app → returns to your app  
4. Check again → user now verified

**Why This Matters:**

Even if a wallet has few transactions, Base Verify reveals if the user is high-value through their verified social accounts (X Blue, Instagram, TikTok) or Coinbase One subscription. 

This lets you identify quality users regardless of on-chain activity.

**Example Use Cases:**

- Token-gated airdrops or daily rewards  
- Exclusive content access (e.g. creator coins)  
- Identity-based rewards and loyalty programs

## Key Concepts

### Provider

An identity platform that Base Verify integrates with. Currently supports **X (Twitter)**, **Coinbase**, **Instagram**, and **TikTok**.

### Verification

Cryptographic proof that a wallet owns an account with a specific Provider.

### Trait

A specific attribute of the Provider account that can be verified.

**Examples:**

- `verified: true` \- X account has blue checkmark  
- `coinbase_one_active: true` \- Active Coinbase One subscription  
- `followers: gt:1000` \- X account has over 1000 followers
- `followers_count: gte:5000` \- Instagram account with 5000+ followers
- `video_count: gte:50` \- TikTok account with 50+ videos

### Token - Sybil Resistance

A deterministic identifier tied to the Provider account, not the wallet. **This is the key anti-sybil mechanism.**

It is unique per "user" per provider.

**How it works:**

A user verifies their X account with Wallet A:

- Base Verify returns `Token: abc123`  
- You've never seen this token → Grant airdrop

The same user tries to claim again with Wallet B:

- Base Verify returns `Token: abc123` (same token\!)  
- You've seen this token → Reject duplicate claim

**Why this matters:** Without Base Verify, users could claim multiple times with different wallets. With Base Verify, one verified account \= one token \= one claim, regardless of how many wallets they use.

This means the same X account will always produce the same token across all wallets.

---

## Two Simple Actions

### Action 1: Check Verification

Call the backend to see if the user has the verification you need.  
Backend url: [https://verify.base.dev/v1](https://verify.base.dev/v1)

### Action 2: Redirect to Mini App

If not verified, send user to Base Verify Mini App to complete OAuth.  
Mini app url: [https://verify.base.dev](https://verify.base.dev)

---

## Integration Example Steps

### Step 1: Set Up Configuration

Create `lib/config.ts`:

```ts
export const config = {
  appUrl: 'https://your-app.com',
  baseVerifySecretKey: process.env.BASE_VERIFY_SECRET_KEY,
  baseVerifyPublisherKey: process.env.BASE_VERIFY_PUBLISHER_KEY,
  baseVerifyApiUrl: 'https://verify.base.dev/v1',
  baseVerifyMiniAppUrl: 'https://verify.base.dev',
}
```

Create `.env.local`:

```shell
BASE_VERIFY_SECRET_KEY=your_secret_key_here
BASE_VERIFY_PUBLISHER_KEY=your_publisher_key_here
```

Contact [rahul.patni@coinbase.com](mailto:rahul.patni@coinbase.com) to get your secret key and publisher key.

**Key Types:**

You will be provided both a **publisher key** or a **secret key**.

- **Publisher Key**
  - Public identifier, safe to expose in client-side code
  - Used to identify your app
  - Can be included in frontend bundles

- **Secret Key**
  - Private credential, never expose to clients
  - Used only on the server for privileged operations (auth, writes, webhooks)

### Step 2: Create SIWE Signature Generator

Why? To prove that the user has ownership of the wallet. This is key because we don’t want to leak information about users. We use SIWE to verify this signature on the backend. 

Create `lib/signature-generator.ts`:

```ts
import { SiweMessage, generateNonce } from 'siwe'
import { config } from './config'

export async function generateSignature(
  signMessageFunction: (message: string) => Promise<string>,
  address: string
) {
  // Build resources array for SIWE
  const resources = [
    'urn:verify:provider:x',
    'urn:verify:provider:x:verified:eq:true',
    'urn:verify:provider:x:followers:gte:100',
    'urn:verify:action:base_verify_token'
  ]
  
  // Create SIWE message
  const siweMessage = new SiweMessage({
    domain: new URL(config.appUrl).hostname,
    address,
    statement: 'Verify your X account',
    uri: config.appUrl,
    version: '1',
    chainId: 8453, // Base
    nonce: generateNonce(),
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    resources,
  })
  
  const message = siweMessage.prepareMessage()
  const signature = await signMessageFunction(message)
  
  return { message, signature, address }
}
```

### Step 3: Check Verification Status

```ts
async function checkVerification(address: string) {
  // Generate SIWE signature
  const signature = await generateSignature(
    async (msg) => {
      return new Promise((resolve, reject) => {
        signMessage(
          { message: msg },
          { onSuccess: resolve, onError: reject }
        )
      })
    },
    address
  )
  
  // Check with backend
  const response = await fetch(`${config.baseVerifyApiUrl}/base_verify_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.baseVerifySecretKey}`,
    },
    body: JSON.stringify({
      signature: signature.signature,
      message: signature.message,
    })
  })
  
  if (response.ok) {
    return { 
      verified: true, 
      data: await response.json() 
    }
  } else if (response.status === 404) {
    // Redirect to mini app 
    return { 
      verified: false, 
      message: 'Verification not found. Redirecting to mini app...' 
    }
  } else if (response.status === 412) {
    return { 
      verified: false, 
      message: 'User does not meet trait requirements' 
    }
  }
  
  throw new Error('Verification check failed')
}
```

### Step 4: Redirect to Mini App (If Not Verified)

```ts
function redirectToVerifyMiniApp(provider: string) {
  // Build mini app URL with your app as the redirect
  const params = new URLSearchParams({
    redirect_uri: config.appUrl,
    providers: provider,
  })
  
  const miniAppUrl = `${config.baseVerifyMiniAppUrl}?${params.toString()}`
  
  // Open in Base App
  const deepLink = `cbwallet://miniapp?url=${encodeURIComponent(miniAppUrl)}`
  window.open(deepLink, '_blank')
}
```

That's it. When the user completes verification in the mini app, they'll return to your `redirect_uri`. Check verification again and proceed.

---

## API Reference

### POST /v1/base\_verify\_token

Check if a wallet has a specific verification.

**Request:**

```ts
{
  signature: string    // SIWE signature
  message: string      // SIWE message (includes provider/traits in resources)
}
```

**Response (200 OK):**

```ts
{
  token: string        // Base verify token
}
```

See definition of token [above](#token-\(sybil-resistance\)).

**Response (404 Not Found):** User doesn't have this verification. Redirect to mini app.

**Response (412 Precondition Failed):** User has provider account but doesn't meet trait requirements (e.g., not Coinbase One subscriber).

### Mini App Redirect

When redirecting to Base Verify Mini App:

```ts
https://verify.base.dev?redirect_uri={your_app_url}&providers={provider}
```

| Parameter | Required | Description |
| :---- | :---- | :---- |
| `redirect_uri` | Yes | Where to send user after verification |
| `providers` | Yes | Provider to verify: `coinbase`, `x`, `instagram`, or `tiktok` |

The user completes verification in the mini app, then returns to your `redirect_uri`.

---

## Supported Providers & Traits

### Coinbase

**Provider:** `coinbase`

**Available Traits:**

| Trait | Type | Operations | Description | Example Values |
| :---- | :---- | :---- | :---- | :---- |
| `coinbase_one_active` | Boolean | `eq` | Active Coinbase One subscription | `"true"`, `"false"` |
| `coinbase_one_billed` | Boolean | `eq` | User has been billed for Coinbase One | `"true"`, `"false"` |
| `country` | String | `eq`, `in` | User's country code (ISO 3166-1 alpha-2) | `"US"`, `"CA,US,MX"` |

**Examples:**

```ts
// Check for Coinbase One subscribers
{
  provider: 'coinbase',
  traits: { 'coinbase_one_active': 'true' }
}

// Check for billed Coinbase One subscribers
{
  provider: 'coinbase',
  traits: { 'coinbase_one_billed': 'true' }
}

// Check for specific country
{
  provider: 'coinbase',
  traits: { 'country': 'US' }
}

// Check for multiple countries (comma-separated)
{
  provider: 'coinbase',
  traits: { 'country': 'CA,US,MX' }
}
```

### X (Twitter)

**Provider:** `x`

**Available Traits:**

| Trait | Type | Operations | Description | Example Values |
| :---- | :---- | :---- | :---- | :---- |
| `verified` | Boolean | `eq` | Has any type of verification | `"true"`, `"false"` |
| `verified_type` | String | `eq` | Type of verification | `"blue"`, `"government"`, `"business"`, `"none"` |
| `followers` | Integer | `eq`, `gt`, `gte`, `lt`, `lte` | Number of followers | `"1000"`, `"50000"` |

**Examples:**

```ts
// Check for any verified account
{
  provider: 'x',
  traits: { 'verified': 'true' }
}

// Check for specific verification type
{
  provider: 'x',
  traits: { 'verified_type': 'blue' }
}

// Check for follower count (greater than or equal to)
{
  provider: 'x',
  traits: { 'followers': 'gte:1000' }
}

// Check for follower count (exact)
{
  provider: 'x',
  traits: { 'followers': 'eq:50000' }
}

// Combine multiple traits
{
  provider: 'x',
  traits: { 
    'verified': 'true',
    'followers': 'gte:10000'
  }
}
```

### Instagram

**Provider:** `instagram`

**Available Traits:**

| Trait | Type | Operations | Description | Example Values |
| :---- | :---- | :---- | :---- | :---- |
| `username` | String | `eq` | Instagram username | `"john_doe"` |
| `followers_count` | Integer | `eq`, `gt`, `gte`, `lt`, `lte` | Number of followers | `"1000"`, `"50000"` |
| `instagram_id` | String | `eq` | Unique Instagram user ID | `"1234567890"` |

**Examples:**

```ts
// Check for specific username
{
  provider: 'instagram',
  traits: { 'username': 'john_doe' }
}

// Check for follower count (greater than)
{
  provider: 'instagram',
  traits: { 'followers_count': 'gt:1000' }
}

// Check for follower count (greater than or equal to)
{
  provider: 'instagram',
  traits: { 'followers_count': 'gte:5000' }
}

// Combine multiple traits
{
  provider: 'instagram',
  traits: { 
    'username': 'john_doe',
    'followers_count': 'gte:10000'
  }
}
```

### TikTok

**Provider:** `tiktok`

**Available Traits:**

| Trait | Type | Operations | Description | Example Values |
| :---- | :---- | :---- | :---- | :---- |
| `open_id` | String | `eq` | TikTok Open ID (unique per app) | `"abc123..."` |
| `union_id` | String | `eq` | TikTok Union ID (unique across apps) | `"def456..."` |
| `display_name` | String | `eq` | TikTok display name | `"John Doe"` |
| `follower_count` | Integer | `eq`, `gt`, `gte`, `lt`, `lte` | Number of followers | `"1000"`, `"50000"` |
| `following_count` | Integer | `eq`, `gt`, `gte`, `lt`, `lte` | Number of accounts following | `"500"`, `"2000"` |
| `likes_count` | Integer | `eq`, `gt`, `gte`, `lt`, `lte` | Total likes received | `"10000"`, `"100000"` |
| `video_count` | Integer | `eq`, `gt`, `gte`, `lt`, `lte` | Number of videos posted | `"50"`, `"200"` |

**Examples:**

```ts
// Check for follower count
{
  provider: 'tiktok',
  traits: { 'follower_count': 'gt:1000' }
}

// Check for likes count
{
  provider: 'tiktok',
  traits: { 'likes_count': 'gte:10000' }
}

// Check for video count
{
  provider: 'tiktok',
  traits: { 'video_count': 'gte:50' }
}

// Combine multiple traits (e.g., active creator)
{
  provider: 'tiktok',
  traits: { 
    'follower_count': 'gte:5000',
    'likes_count': 'gte:100000',
    'video_count': 'gte:100'
  }
}

// Check for specific display name
{
  provider: 'tiktok',
  traits: { 'display_name': 'John Doe' }
}
```

---

## Try Base Verify

Try the Base Verify Mini App: [cbwallet://miniapp?url=https://verify.base.dev](cbwallet://miniapp?url=https://verify.base.dev)

Try an example demo here: [cbwallet://miniapp?url=https://baseverifydemo.com](cbwallet://miniapp?url=https://baseverifydemo.com)

Please contact [rahul.patni@coinbase.com](mailto:rahul.patni@coinbase.com) with any feedback/ tips/ requests/ etc. You will be one of the first external users of Base Verify and we appreciate your role in shaping the future of this product.

## Getting Help

**Need Keys? Questions or Issues?**  
Email: [rahul.patni@coinbase.com](mailto:rahul.patni@coinbase.com)
Telegram: @patnir
Farcaster: @patni

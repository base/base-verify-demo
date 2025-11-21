# Base Verify Integration Guide

## What is Base Verify?

Base Verify is for mini-app builders to allow their users to prove they have verified accounts (X Blue, Coinbase One) without sharing credentials.

**How it works:**

1. Your app checks if user has verification → backend returns yes/no
2. If no verification → redirect user to Base Verify Mini App
3. User completes OAuth in mini app → returns to your app
4. Check again → user now verified

**Why This Matters:**

Even if a wallet has few transactions, Base Verify reveals if the user is high-value through their verified social accounts (X Blue, Instagram, TikTok) or Coinbase One subscription. This lets you identify quality users regardless of on-chain activity.

**Example Use Cases:**

- Token-gated airdrops or daily rewards  
- Exclusive content access (e.g. creator coins)  
- Identity-based rewards and loyalty programs

---

## How It Works: Architecture & Flow

### The Complete Flow

```ts
                    ┌─────────────┐                                                     
                    │             │  1. User connects wallet                            
                    │   Your      │                       
                    │   Mini App  │                                                     
                    │             │                                                     
                    └──────┬──────┘                                                     
                           │                                                            
                           │ 2. App generates SIWE message (frontend)
                           │    • Includes wallet address
                           │    • Includes provider (x, coinbase, instagram, tiktok)
                           │    • Includes traits (verified:true, followers:gt:1000)
                           │    • Includes action (base_verify_token)
                           │
                           │ 3. User signs SIWE message with wallet
                           │
                           │ 4. Send signed message to Base Verify API
                           │    (from frontend or via backend)
                           │
                           ▼
       
   200 OK ←───────┌──────────────────┐───────→ 400
   Verified!      │                  │         User has account
   (DONE)         │  Base Verify API │         However, traits not met 
                  │  verify.base.dev │         (DONE)
                  └────────┬─────────┘
                           │
                           │ 404 Not Found
                           ▼
                          
    5. Redirect to Base Verify Mini App
                           │
                           ▼
                    ┌──────────────────────┐
                    │  Base Verify         │  6. User completes OAuth
                    │  Mini App            │     (X, Coinbase, Instagram, TikTok)
                    │  verify.base.dev     │  7. Base Verify stores verification
                    └──────────┬───────────┘
                               │
                               │ 8. Redirects back to your app
                               ▼
                        ┌─────────────┐
                        │  Your       │  9. Check again (step 4)
                        │  Mini App   │     → Now returns 200 ✅ or 400
                        └─────────────┘                                                    
```

### What is SIWE and Why Do We Use It?

**SIWE (Sign-In with Ethereum)** is a standard way for users to prove they control a wallet address by signing a message.

**Why Base Verify requires SIWE:**

1. **Privacy Protection**: We don't want to leak information about which wallets have verifications. By requiring a signature, only the wallet owner can check their own verification status.

2. **Security**: The signature proves the request is coming from the actual wallet owner, not someone else looking up verification data.

3. **Trait Requirements**: The SIWE message includes the specific traits you're checking (e.g., "X account with >1000 followers"). Base Verify validates the signature and checks if those traits match.

**What goes in the SIWE message:**

```typescript
{
  domain: "your-app.com",
  address: "0x1234...",  // User's wallet
  chainId: 8453,         // Base
  resources: [
    "urn:verify:provider:x",                    // Which provider
    "urn:verify:provider:x:verified:eq:true",   // Trait requirements
    "urn:verify:action:base_verify_token"       // What action
  ]
}
```

The user signs this message with their wallet, proving they own the address and agree to check these specific traits.

### The Contract: What Your App Does vs What Base Verify Does

**Your App's Responsibilities:**
- Generate SIWE messages with trait requirements
- Handle user wallet connection
- Redirect to Base Verify Mini App when verification not found
- Store the returned verification token to prevent reuse

**Base Verify's Responsibilities:**
- Validate SIWE signatures
- Store provider verifications (X, Coinbase, Instagram, TikTok)
- Check if verification meets trait requirements
- Facilitate OAuth flow with providers
- Return deterministic tokens for Sybil resistance

### Response Codes Explained

- **200 OK**: Wallet has verified the provider account AND meets all trait requirements. Returns a unique token.
- **404 Not Found**: Wallet has never verified this provider. Redirect user to Base Verify Mini App.
- **400 Bad Request** (with message `"verification_traits_not_satisfied"`): Wallet has verified the provider, but doesn't meet the trait requirements (e.g., has X account but not enough followers).

---

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

**How it works:**

A user verifies their X account with Wallet A:

- Base Verify returns `Token: abc123`  
- You've never seen this token → Grant airdrop

The same user tries to claim again with Wallet B:

- Base Verify returns `Token: abc123` (same token!)  
- You've seen this token → Reject duplicate claim

**Why this matters:** Without Base Verify, users could claim multiple times with different wallets. With Base Verify, one verified account = one token = one claim, regardless of how many wallets they use.

**Token Properties:**

- **Deterministic**: The same provider account always produces the same token
- **Unique per provider**: A user's X token is different from their Instagram token
- **Unique per app**: Your app receives different tokens than other apps (for privacy)
- **Action-specific**: Tokens can vary based on the action in your SIWE message
- **Persistent**: Tokens don't expire or rotate (unless the user deletes their verification)
- **Trait-independent**: Token stays the same even if traits change (e.g., follower count increases)

**How to Store Tokens:**

```typescript
// In your database
{
  token: "abc123...",           // The verification token from Base Verify
  walletAddress: "0x1234...",   // The wallet that claimed (for your records)
  provider: "x",                // Which provider was verified
  claimedAt: "2024-01-15",      // When they claimed
  // Store whatever else you need for your use case
}
```

**Example: Preventing Double Claims**

```typescript
async function claimAirdrop(verificationToken: string, walletAddress: string) {
  // Check if this token was already used
  const existingClaim = await db.findClaimByToken(verificationToken);
  
  if (existingClaim) {
    return { error: "This X account already claimed" };
  }
  
  // Store the token
  await db.createClaim({
    token: verificationToken,
    wallet: walletAddress,
    claimedAt: new Date()
  });
  
  return { success: true };
}
```

**Important:** The token is the anti-sybil primitive. Even if a user connects with 100 different wallets, they'll get the same token each time because they verified with the same X/Instagram/TikTok/Coinbase account.

---

## Quick Start: Minimal Example

Before diving into the full integration, here's the absolute minimal example showing the core flow. This example checks if a wallet has verified an X account (no trait requirements).

**Note:** This uses the simple redirect flow. For production apps, consider the [PKCE flow](#option-b-pkce-flow-more-secure-recommended-for-production) for additional security.

### Step 1: Check Verification (Backend)

```typescript
// Your backend endpoint
async function checkVerification(walletAddress: string, signature: string, message: string) {
  const response = await fetch('https://verify.base.dev/v1/base_verify_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${YOUR_SECRET_KEY}`,  // Get from Base Verify team
    },
    body: JSON.stringify({
      signature: signature,
      message: message  // SIWE message signed by user
    })
  });

  if (response.status === 200) {
    const { token } = await response.json();
    return { verified: true, token };
  } else if (response.status === 404) {
    return { verified: false, needsVerification: true };
  } else if (response.status === 400) {
    const data = await response.json();
    if (data.message === 'verification_traits_not_satisfied') {
      return { verified: false, traitsNotMet: true };
    }
  }
}
```

### Step 2: Generate SIWE Message (Frontend)

```typescript
import { SiweMessage, generateNonce } from 'siwe';

// User clicks "Check Verification"
async function handleCheck() {
  // Build SIWE message
  const siweMessage = new SiweMessage({
    domain: window.location.hostname,
    address: userWalletAddress,
    statement: 'Check X verification',
    uri: window.location.origin,
    version: '1',
    chainId: 8453,
    nonce: generateNonce(),
    resources: [
      'urn:verify:provider:x',  // Checking for X provider
      'urn:verify:action:base_verify_token'
    ],
  });

  // User signs with wallet
  const message = siweMessage.prepareMessage();
  const signature = await walletSignMessage(message);

  // Send to your backend
  const result = await fetch('/api/check-verification', {
    method: 'POST',
    body: JSON.stringify({ address: userWalletAddress, signature, message })
  });

  return result.json();
}
```

### Step 3: Redirect to Base Verify (Frontend)

```typescript
// If check returns 404 (not verified)
function redirectToBaseVerify() {
  const params = new URLSearchParams({
    redirect_uri: window.location.origin,  // Where to return after verification
    providers: 'x'  // Which provider to verify
  });

  const miniAppUrl = `https://verify.base.dev?${params}`;
  const deepLink = `cbwallet://miniapp?url=${encodeURIComponent(miniAppUrl)}`;
  
  window.open(deepLink, '_blank');
}
```

### Step 4: Handle Return (Frontend)

```typescript
// User completes verification and returns to your app
// URL will have ?success=true

if (window.location.search.includes('success=true')) {
  // Check verification again - should now return 200
  const result = await handleCheck();
  
  if (result.verified) {
    console.log('Verification successful!', result.token);
    // Store token to prevent reuse
    await saveToken(result.token);
  }
}
```

### That's It!

This is the complete minimal flow:
1. Check → 404
2. Redirect to Base Verify
3. User verifies with provider
4. Return to your app
5. Check again → 200

Now let's explore the full integration with configuration, traits, and error handling.

---

## Getting Started

### Prerequisites

Before integrating Base Verify, you need:

1. **API Keys** - Contact [rahul.patni@coinbase.com](mailto:rahul.patni@coinbase.com) to get your keys
2. **A mini app** - Your app should run in Coinbase Wallet or Base ecosystem
3. **Wallet integration** - Users must be able to connect and sign messages

### Key Types

You'll receive two types of keys:

**Publisher Key** (Public)
- Safe to expose in client-side code
- Used for client-to-API calls
- Requires origin validation (your app domain must be allowlisted)
- Format: `pub_...`

**Secret Key** (Private)
- NEVER expose to clients
- Used only on your backend server
- For privileged operations (verification checks, token generation)
- Format: `sec_...`

### Registering Your App

When you receive your keys, you'll also need to register:

1. **Redirect URIs** - Where users return after verification (e.g., `https://yourapp.com`)
2. **Allowed Origins** - Domains that can make client-side API calls (if using publisher key)
3. **App Name** - How your app appears in the Base Verify flow

Contact the Base Verify team to register these settings.

---

## Integration Steps

The integration involves several components working together:

1. **SIWE Message Generation** - Create signed messages proving wallet ownership
2. **Verification Check** - Call Base Verify API to check status
3. **Redirect Handling** - Send users to Base Verify when needed
4. **Token Storage** - Store verification tokens to prevent reuse

Let's walk through each component:

---

### Full Integration Example

### Step 1: Set Up Configuration (Backend + Frontend)

This configuration is shared between your backend and frontend.

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

### Step 2: Create SIWE Signature Generator (Frontend)

**Purpose:** Generate SIWE messages that users sign with their wallet. This proves wallet ownership and includes the traits you want to verify.

**Runs on:** Frontend (client-side)

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

### Step 3: Check Verification Status (Frontend → Backend)

**Purpose:** Check if the user has the required verification by calling Base Verify API.

**Runs on:** Can run on frontend (with publisher key) or backend (with secret key, recommended)

**Frontend code:**

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
    return { 
      verified: false, 
      message: 'Verification not found. Redirecting to mini app...' 
    }
  } else if (response.status === 400) {
    const data = await response.json();
    if (data.message === 'verification_traits_not_satisfied') {
      return { 
        verified: false, 
        message: 'User does not meet trait requirements' 
      }
    }
  }
  
  throw new Error('Verification check failed')
}
```

### Step 4: Redirect to Mini App (Frontend)

**Purpose:** If verification not found (404), redirect user to Base Verify Mini App to complete OAuth.

**Runs on:** Frontend

#### Option A: Simple Redirect (Easier)

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

After verification, user returns to your `redirect_uri` with `?success=true`. Just check verification again.

#### Option B: PKCE Flow (More Secure, Recommended for Production)

**PKCE (Proof Key for Code Exchange)** provides additional security by preventing authorization code interception.

**Step 4a: Generate PKCE Challenge**

```ts
// Generate random code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Generate code challenge from verifier
async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

**Step 4b: Redirect with PKCE**

```ts
async function redirectToVerifyMiniAppPKCE(provider: string) {
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = `verify-${Date.now()}`;

  // Store verifier for later (when user returns)
  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  sessionStorage.setItem('pkce_state', state);

  // Build redirect with PKCE parameters
  const params = new URLSearchParams({
    redirect_uri: config.appUrl,
    providers: provider,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const miniAppUrl = `${config.baseVerifyMiniAppUrl}?${params.toString()}`;
  const deepLink = `cbwallet://miniapp?url=${encodeURIComponent(miniAppUrl)}`;
  window.open(deepLink, '_blank');
}
```

**Step 4c: Handle Return & Exchange Code**

When user returns, the URL will contain `?code=...&state=...`:

```ts
// On page load, check for OAuth callback
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code && state) {
  // Verify state matches
  const storedState = sessionStorage.getItem('pkce_state');
  if (state !== storedState) {
    throw new Error('State mismatch - possible CSRF attack');
  }

  // Get stored code verifier
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');
  
  // Exchange code for verification token
  const response = await fetch('https://verify.base.dev/v1/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${YOUR_SECRET_KEY}`,
    },
    body: JSON.stringify({
      code: code,
      code_verifier: codeVerifier
    })
  });

  if (response.ok) {
    const { token } = await response.json();
    console.log('Verification token:', token);
    
    // Clean up
    sessionStorage.removeItem('pkce_code_verifier');
    sessionStorage.removeItem('pkce_state');
    
    // Store token and proceed with your app logic
    await saveVerificationToken(token);
  }
}
```

**Which Should You Use?**

- **Simple Redirect**: Good for testing, demos, low-security use cases
- **PKCE Flow**: Recommended for production, especially for high-value operations (token gates, airdrops)

The main difference: Simple redirect relies on re-checking with SIWE signature. PKCE provides an authorization code exchange for more robust security.

---

## API Reference

### POST /v1/base_verify_token

Check if a wallet has a specific verification and retrieve the verification token.

**Authentication:** Requires `Authorization: Bearer {SECRET_KEY}` or `Authorization: Bearer {PUBLISHER_KEY}`

**Request:**

```ts
{
  signature: string,   // SIWE signature from wallet
  message: string      // SIWE message (includes provider/traits in resources)
}
```

**Example Request:**

```bash
curl -X POST https://verify.base.dev/v1/base_verify_token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{
    "signature": "0x1234...",
    "message": "verify.base.dev wants you to sign in..."
  }'
```

**Response (200 OK):**

```ts
{
  token: string,        // Deterministic verification token (for Sybil resistance)
  signature: string,    // Signature from Base Verify
  action: string,       // Action from SIWE message
  wallet: string        // User's wallet address
}
```

**Response (404 Not Found):**

User doesn't have this verification. Redirect to mini app.

```ts
{
  error: "verification_not_found"
}
```

**Response (400 Bad Request):**

User has provider account but doesn't meet trait requirements.

```ts
{
  code: 9,
  message: "verification_traits_not_satisfied",
  details: []
}
```

**Response (401 Unauthorized):**

Invalid or missing API key.

```ts
{
  error: "unauthorized"
}
```

---

### POST /v1/token

Exchange authorization code for verification token (PKCE flow only).

**Authentication:** Requires `Authorization: Bearer {SECRET_KEY}`

**Request:**

```ts
{
  code: string,           // Authorization code from redirect
  code_verifier: string   // PKCE code verifier you generated
}
```

**Example Request:**

```bash
curl -X POST https://verify.base.dev/v1/token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{
    "code": "abc123...",
    "code_verifier": "def456..."
  }'
```

**Response (200 OK):**

```ts
{
  token: string,        // Verification token
  signature: string,    // Signature from Base Verify
  action: string,       // Action that was verified
  wallet: string        // User's wallet address
}
```

**Response (400 Bad Request):**

Invalid code or verifier.

```ts
{
  error: "invalid_grant"
}
```

---

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

## Trait System Reference

Traits are specific attributes of a provider account that you can verify. Before looking at provider-specific traits, understand the global trait system rules.

### Trait Syntax

Traits are specified in SIWE message resources using this format:

```
urn:verify:provider:{provider}:{trait_name}:{operation}:{value}
```

**Example:**
```
urn:verify:provider:x:followers:gte:1000
```
This checks if an X account has greater than or equal to 1000 followers.

### Operations

| Operation | Symbol | Applies To | Description | Example |
| :---- | :---- | :---- | :---- | :---- |
| Equals | `eq` | All types | Exact match | `verified:eq:true` |
| Greater Than | `gt` | Integers | Strictly greater | `followers:gt:1000` |
| Greater/Equal | `gte` | Integers | Greater or equal | `followers:gte:1000` |
| Less Than | `lt` | Integers | Strictly less | `followers:lt:5000` |
| Less/Equal | `lte` | Integers | Less or equal | `followers:lte:5000` |
| In (list) | `in` | Strings | Value in comma-separated list | `country:in:US,CA,MX` |

### Type System

**Boolean Traits**
- Values: `"true"` or `"false"` (as strings)
- Only supports `eq` operation
- Example: `verified:eq:true`

**Integer Traits**
- Values: Numbers as strings
- Supports: `eq`, `gt`, `gte`, `lt`, `lte`
- Example: `followers:gte:1000`

**String Traits**
- Values: Text strings
- Supports: `eq`, `in`
- Example: `country:eq:US` or `country:in:US,CA,MX`

### Combining Traits

**Within One Provider (AND logic):**

When you specify multiple traits for the same provider, ALL must be satisfied:

```typescript
resources: [
  'urn:verify:provider:x',
  'urn:verify:provider:x:verified:eq:true',
  'urn:verify:provider:x:followers:gte:10000'
]
// User must have verified X account AND 10k+ followers
```

**Multiple Providers:**

Currently, you can only check one provider per request. To check multiple providers, make separate API calls.

### Code Examples

**Using traits in signature generation:**

```typescript
// Simple boolean check
const signature = await generateSignature({
  provider: 'x',
  traits: { 'verified': 'true' },
  action: 'base_verify_token'
});

// Integer comparison
const signature = await generateSignature({
  provider: 'instagram',
  traits: { 'followers_count': 'gte:5000' },
  action: 'base_verify_token'
});

// Multiple traits (AND logic)
const signature = await generateSignature({
  provider: 'tiktok',
  traits: { 
    'follower_count': 'gte:1000',
    'likes_count': 'gte:10000',
    'video_count': 'gte:50'
  },
  action: 'base_verify_token'
});

// String with IN operation
const signature = await generateSignature({
  provider: 'coinbase',
  traits: { 
    'country': 'in:US,CA,MX'  // North America
  },
  action: 'base_verify_token'
});
```

### Common Patterns

**Geographic Restrictions:**
```typescript
// Europe only
traits: { 'country': 'in:AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE' }
```

**Tiered Access:**
```typescript
// Bronze tier: any verified account
traits: { 'verified': 'true' }

// Silver tier: 1k+ followers
traits: { 'followers': 'gte:1000' }

// Gold tier: 10k+ followers
traits: { 'followers': 'gte:10000' }
```

**Content Creator Verification:**
```typescript
// Active TikTok creator
traits: {
  'follower_count': 'gte:5000',
  'video_count': 'gte:100',
  'likes_count': 'gte:50000'
}
```

---

## Supported Providers & Traits

Each provider section below includes:
- **Trait Table**: All available traits and their types
- **Code Examples**: How to use traits in your integration
- **Try It Live**: Interactive examples you can test with your connected wallet

### About "Try It Live" Examples

The interactive examples let you test real API calls to Base Verify:

**What happens when you click "Try It":**
1. Your wallet signs a SIWE message with the specified traits
2. The request is sent to `https://verify.base.dev/v1/base_verify_token`
3. You see the full request (headers, body) and response (status, data)

**Response Codes:**
- **200 OK**: You have verified this provider and meet the trait requirements
- **404 Not Found**: You haven't verified this provider yet (need to visit Base Verify Mini App)
- **400 Bad Request** (message: `verification_traits_not_satisfied`): You have the provider account but don't meet traits (e.g., not enough followers)

**Why test this:**
- See exactly how the API works
- Understand request/response formats
- Test your own verification status
- Debug trait requirements before implementing

**Note:** These examples use a publisher key (safe for client-side), so they work directly from your browser.

---

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

## Security & Privacy

### Data Storage

**What Base Verify Stores:**
- Wallet addresses associated with verified provider accounts
- Provider account metadata (username, follower counts, verification status)
- OAuth tokens (encrypted, never shared with apps)
- Verification timestamps

**What Base Verify Does NOT Store:**
- Your users' private keys
- Provider account passwords
- User activity or browsing history
- Any data beyond what's needed for verification

### What Data Your App Receives

When you call `/v1/base_verify_token`, you receive:

**Standard Response (200 OK):**
```json
{
  "token": "abc123...",      // Deterministic verification token
  "signature": "def456...",  // Signature from Base Verify
  "action": "base_verify_token",
  "wallet": "0x1234..."      // User's wallet address
}
```

**No PII is returned** unless you explicitly request disclosures (requires special permission):

```json
{
  "token": "abc123...",
  "disclosures": {
    "x_username": "johndoe",           // Only if can_request_disclosures = true
    "x_followers": 5000,
    "x_verified_type": "blue"
  }
}
```

### Privacy Protections

**1. SIWE Signature Requirement**

Every API call requires a valid SIWE signature from the wallet owner. This prevents:
- Arbitrary lookup of verification status
- Third parties checking if a wallet is verified
- Enumeration attacks

**2. Origin Validation**

Publisher keys (client-side) are locked to specific origins:
- Only your registered domains can use your publisher key
- Prevents key theft and misuse
- Enforced at the API level

**3. OAuth Token Security**

- OAuth access tokens are encrypted at rest
- Never exposed to your application
- Used only by Base Verify to refresh provider data
- Can be revoked by user at any time

**4. User Control**

Users can delete their verifications at any time:
- Removes all stored provider data
- Invalidates future token generation
- Your app's stored tokens become meaningless (user can't re-verify with same account)

### Rate Limits

To prevent abuse, Base Verify enforces rate limits:

| Endpoint | Rate Limit | Per |
| :---- | :---- | :---- |
| `/v1/base_verify_token` | 100 requests | per minute per API key |
| `/v1/verification_url` | 50 requests | per minute per API key |
| `/v1/verifications` | 100 requests | per minute per API key |

If you exceed rate limits, you'll receive a `429 Too Many Requests` response.

**Best Practices:**
- Cache verification results client-side (for the session)
- Don't check verification on every page load
- Implement exponential backoff on retries

### OAuth Security Model

**How Base Verify validates provider accounts:**

1. **User initiates OAuth** in Base Verify Mini App
2. **Provider (X, Instagram, etc.) authenticates** the user
3. **Provider returns OAuth token** to Base Verify
4. **Base Verify fetches account data** using OAuth token
5. **Base Verify stores verification** linked to user's wallet
6. **OAuth token is encrypted** and stored securely

**Your app never handles OAuth tokens or redirects.** This is all handled within the Base Verify Mini App.

### Compliance

- **GDPR**: Users can request deletion of their verification data
- **CCPA**: Users have right to know what data is stored and can delete it
- **Data Minimization**: Only essential provider data is stored

### Reporting Security Issues

If you discover a security vulnerability, please email:
**security@base.org**

Do not file public issues for security concerns.

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

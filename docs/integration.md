# Integration Guide

This guide covers everything you need to integrate Base Verify into your mini app.

---

## What is Base Verify?

Base Verify is for mini-app builders to allow their users to prove they have verified accounts (X Blue, Coinbase One) without sharing credentials.

**Why This Matters:**

Even if a wallet has few transactions, Base Verify reveals if the user is high-value through their verified social accounts (X Blue, Instagram, TikTok) or Coinbase One subscription. This lets you identify quality users regardless of on-chain activity.

**Example Use Cases:**
- Token-gated airdrops or daily rewards
- Exclusive content access (e.g. creator coins)
- Identity-based rewards and loyalty programs

---

## Architecture & Flow

### The Complete Flow

```ts
                    ┌─────────────┐                                                     
                    │             │  1. User connects wallet                            
                    │   Your      │                       
                    │   Mini App  │                                                     
                    │  (Frontend) │                                                     
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
                           │ 4. Send signature + message to YOUR backend
                           │
                           ▼
                    ┌──────────────┐
                    │  Mini App    │  • Validates trait requirements
                    │  Backend     │  • Verifies signature with Base Verify API
                    │  (Your API)  │
                    └──────┬───────┘
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

### The Contract: What Your App Does vs What Base Verify Does

**Your App's Responsibilities:**
- Generate SIWE messages with trait requirements
- Handle user wallet connection
- Redirect to Base Verify Mini App when verification not found
- Store the returned verification token to prevent reuse
- Keep your secret key secure on the backend

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

Need the full rationale for SIWE and the exact message template? See the [Security](./security.md#siwe-signature-requirement) section for the complete explanation.

## Core Concepts

See [Core Concepts](./core-concepts.md) for the full glossary, examples, and storage guidance.

---

## Getting Started

### Prerequisites

1. **API Key** - Contact [rahul.patni@coinbase.com](mailto:rahul.patni@coinbase.com)
2. **Wallet integration** - Users must connect and sign messages
3. **Backend server** - To securely call Base Verify API

### Get Your API Key

Contact the Base Verify team for your **Secret Key**.

**Security:** Never expose your secret key in frontend code or version control.

### Register Your App

Provide the Base Verify team:
1. **Mini App Domain**
2. **Redirect URI** - Where users return after verification (e.g., `https://yourapp.com`)

---

## Implementation

> **Security Warning:** Your secret key must NEVER be exposed in frontend code. All Base Verify API calls must go through your backend.

### Step 1: Configuration

Create `lib/config.ts`:

```ts
export const config = {
  appUrl: 'https://your-app.com',
  baseVerifySecretKey: process.env.BASE_VERIFY_SECRET_KEY,  // Backend only!
  baseVerifyApiUrl: 'https://verify.base.dev/v1',
  baseVerifyMiniAppUrl: 'https://verify.base.dev',
}
```

Add to `.env.local`:

```shell
BASE_VERIFY_SECRET_KEY=your_secret_key_here
```

### Step 2: SIWE Signature Generator (Frontend)

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

### Step 3: Check Verification (Frontend → Backend)

**Frontend** generates signature, sends to **YOUR backend**, backend calls Base Verify API.

**Frontend:**

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
  
  // Send to YOUR backend (not directly to Base Verify)
  const response = await fetch('/api/check-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signature: signature.signature,
      message: signature.message,
      address: address
    })
  })
  
  const data = await response.json();
  return data;  // Your backend returns the result
}
```

**Backend code (YOUR API endpoint):**

```ts
// pages/api/check-verification.ts
import { validateTraits } from '../../lib/trait-validator';

export default async function handler(req, res) {
  const { signature, message, address } = req.body;

  // CRITICAL: Validate trait requirements match what YOUR backend expects
  // This prevents users from modifying trait requirements on the frontend
  const expectedTraits = {
    'verified': 'true',
    'followers': 'gte:100'
  };

  const validation = validateTraits(message, 'x', expectedTraits);
  
  if (!validation.valid) {
    return res.status(400).json({
      error: 'Invalid trait requirements in message',
      details: validation.error
    });
  }

  // Now safe to verify signature with Base Verify API
  const response = await fetch('https://verify.base.dev/v1/base_verify_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.BASE_VERIFY_SECRET_KEY}`,  // Secret key stays on backend
    },
    body: JSON.stringify({
      signature: signature,
      message: message,
    })
  });

  if (response.ok) {
    const data = await response.json();
    return res.status(200).json({ verified: true, token: data.token });
  } else if (response.status === 404) {
    return res.status(404).json({ verified: false, needsVerification: true });
  } else if (response.status === 400) {
    const data = await response.json();
    if (data.message === 'verification_traits_not_satisfied') {
      return res.status(400).json({ verified: false, traitsNotMet: true });
    }
  }
  
  return res.status(500).json({ error: 'Verification check failed' });
}
```

### Step 4: Redirect to Base Verify (Frontend)

If you get 404, redirect user to complete OAuth:

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

User returns with `?success=true`. Check again (step 3) → now returns 200 with token.

---

## Error Handling

**404** → User hasn't verified. Redirect to Base Verify Mini App.  
**400** (with `verification_traits_not_satisfied`) → User has account but doesn't meet traits. Don't redirect.  
**200** → Success! Store the token.

---

## Next Steps

- Learn about available traits for each provider → [Trait Catalog](/docs/traits)
- See complete API documentation → [API Reference](/docs/api)
- Understand security model → [Security Overview](/docs/security)


# Security & Privacy

How Base Verify protects user data and ensures secure verification.

---

## Data Storage

### What Base Verify Stores

- Wallet addresses associated with verified provider accounts
- Provider account metadata (username, follower counts, verification status)
- OAuth tokens (encrypted, never shared with apps)
- Verification timestamps

### What Base Verify Does NOT Store

- Your users' private keys
- Provider account passwords
- User activity or browsing history
- Any data beyond what's needed for verification

---

## What Your App Receives

When you call `/v1/base_verify_token`, you receive:

**Standard Response (200 OK):**
```json
{
  "token": "abc123...",
  "signature": "def456...",
  "action": "base_verify_token",
  "wallet": "0x1234..."
}
```

**No PII is returned** 

---

## Privacy Protections

### 1. SIWE Signature Requirement

Every API call requires a valid SIWE signature from the wallet owner. This prevents:
- Arbitrary lookup of verification status
- Third parties checking if a wallet is verified
- Enumeration attacks

**What is SIWE?**

Sign-In with Ethereum lets the wallet owner prove control over their address by signing a structured message. Base Verify relies on it to ensure:

1. **Privacy protection** – Only the wallet owner can ask about their verification status.
2. **Security** – Requests come from the actual wallet, not a third party.
3. **Trait enforcement** – The SIWE message encodes the trait requirements you set; Base Verify validates that the signed traits match what your backend expects.

**Example SIWE payload**

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

The user signs this message, proving they control the wallet and agree to check those specific traits.

### 2. OAuth Token Security

- OAuth access tokens are encrypted at rest
- Never exposed to your application
- Used only by Base Verify to refresh provider data
- Can be revoked by user at any time

### 3. User Control

Users can delete their verifications at any time:
- Removes all stored provider data
- Invalidates future token generation
- Your app's stored tokens become meaningless (user can't re-verify with same account)

---

## OAuth Security Model

**How Base Verify validates provider accounts:**

1. **User initiates OAuth** in Base Verify Mini App
2. **Provider (X, Instagram, etc.) authenticates** the user
3. **Provider returns OAuth token** to Base Verify
4. **Base Verify fetches account data** using OAuth token
5. **Base Verify stores verification** linked to user's wallet
6. **OAuth token is encrypted** and stored securely

**Your app never handles OAuth tokens or redirects.** This is all handled within the Base Verify Mini App.

---

## Best Practices

### Validate Trait Requirements

**Critical Security Requirement:**

When your backend receives a SIWE message from the frontend, you **MUST** validate that the trait requirements in the message match what your backend expects. This prevents users from modifying trait requirements on the frontend to bypass your access controls.

**Example Attack Without Validation:**
1. Your app requires users to have 100 followers
2. User modifies the frontend to request only 10 followers
3. User signs the modified message
4. Without validation, your backend forwards the request to Base Verify
5. User gains access with less than 100 followers ❌

**Implementation:**

```typescript
import { validateTraits } from './lib/trait-validator';

// Define what traits your app requires
const expectedTraits = {
  'followers': 'gte:100'
};

// Validate before forwarding to Base Verify
const validation = validateTraits(message, 'x', expectedTraits);

if (!validation.valid) {
  return res.status(400).json({
    error: 'Invalid trait requirements in message',
    details: validation.error
  });
}

// Now safe to forward to Base Verify API
```

**Key Points:**
- Trait requirements in SIWE message are embedded as URNs (e.g., `urn:verify:provider:x:followers:gte:100`)
- Users can modify these before signing
- Backend must validate they match expected requirements
- Validation must happen **before** calling Base Verify API

### Protect Your Secret Key

**Never:**
- Include secret key in frontend code
- Use `NEXT_PUBLIC_*` or similar environment variables that expose to browser
- Commit secret keys to version control
- Share secret keys in chat, email, or documentation

**Always:**
- Store secret key in backend environment variables only
- Use `.env` files that are gitignored
- Rotate keys immediately if accidentally exposed
- Call Base Verify API only from your backend

### Token Storage

Store verification tokens securely:

```typescript
// In your database
{
  token: "abc123...",           // Unique per provider account
  walletAddress: "0x1234...",   // The wallet (for your records)
  provider: "x",                // Which provider
  claimedAt: "2024-01-15"       // When they verified
}
```

Index by `token` to prevent duplicate claims across different wallets.

### Caching

Cache verification results to reduce API calls:
- Cache for the user's session (not permanently)
- Clear cache when user disconnects wallet
- Don't check verification on every page load

### Error Handling

Handle each response code appropriately:
- **200** → Grant access
- **404** → Redirect to Base Verify Mini App
- **400 (traits_not_satisfied)** → Show user they don't meet requirements (don't retry)

---

## Related Documentation

- [Integration Guide](/docs/integration) - Full implementation guide
- [API Reference](/docs/api) - Endpoint documentation
- [Trait Catalog](/docs/traits) - Available traits


# Base Verify Platform Integration Guide

Base Verify is a sybil resistance platform that helps protect crypto applications from common attacks by tying wallet addresses to verified social media credentials. Instead of allowing users to create unlimited wallets, Base Verify requires users to link their wallet to harder-to-obtain credentials like verified Twitter accounts.

## Overview

Base Verify solves the fundamental problem in crypto where users can create unlimited wallets to exploit airdrops, governance systems, and other applications. By requiring users to prove ownership of verified social media accounts, applications can ensure one-person-one-wallet access patterns.

**Key Benefits:**
- **Sybil Attack Prevention**: Stop users from creating multiple wallets to game your system
- **Identity Verification**: Link wallet addresses to real social media identities
- **Easy Integration**: Simple API calls to verify user credentials
- **User-Friendly**: Seamless verification flow through Base Verify Mini App

## Platform URLs

- **Base Verify Mini App**: Contact Base team for Mini App URL and credentials
- **Base Verify API**: Contact Base team for API endpoint and credentials

## How It Works

1. **Your app checks** if the wallet has a valid Base Verify token
2. **If not verified**, redirect user to Base Verify Mini App for verification
3. **User verifies** their Twitter account in the Mini App
4. **User returns** to your app with verification complete
5. **Your app re-checks** and grants access to verified users

## Integration Flow

### Step 1: Check Verification Status

Generate a SIWE message and have the user sign it, then check with Base Verify API:

```typescript
// Generate SIWE message (see Appendix for implementation)
const message = generateSIWEMessage(walletAddress);

// Have user sign the message
const signature = await userWallet.signMessage(message);

// Check verification with Base Verify API
const response = await fetch(`${BASE_VERIFY_URL}/base_verify_token`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${BASE_VERIFY_SECRET_KEY}`
  },
  body: JSON.stringify({
    signature,
    message
  })
});

if (response.ok) {
  const data = await response.json();
  const verificationToken = data.token;
  
  // User is verified - grant access
  grantUserAccess(walletAddress, verificationToken);
} else {
  // User needs verification - proceed to Step 3
  redirectToVerification();
}
```

### Step 2: Redirect to Base Verify Mini App

If the user doesn't have a valid verification, redirect them to complete verification:

```typescript
function redirectToVerification() {
  const params = new URLSearchParams({
    redirect_uri: `${YOUR_APP_URL}?verification=complete`,
    providers: 'x', // Twitter verification
    state: `verify-${Date.now()}`
  });

  const verificationUrl = `${BASE_VERIFY_MINI_APP_URL}?${params.toString()}`;
  window.location.href = verificationUrl;
}
```

### Step 3: User Verifies Twitter Account

The user will be taken to the Base Verify Mini App where they:
1. Connect their Twitter account
2. Prove ownership of a verified Twitter account
3. Complete the verification process
4. Get redirected back to your app

### Step 4: Handle Return from Verification

After completing verification, the user returns to your app:

```typescript
// Check URL parameters on app load
const urlParams = new URLSearchParams(window.location.search);
const verificationComplete = urlParams.get('success') === 'true';

if (verificationComplete && walletAddress) {
  // Re-run verification check from Step 2
  await checkVerificationStatus(walletAddress);
}
```

Note: This step is not necessary, you can just always re-verify directly when a user connects their wallet to your app.

### Step 5: Grant Access to Verified Users

Once verified, store the verification token and grant access:

```typescript
function grantUserAccess(walletAddress: string, verificationToken: string) {
  // Store verification token in your database
  // Grant user access to protected features
  // Show success message
  
  console.log(`User ${walletAddress} verified with token: ${verificationToken}`);
}
```

## API Reference

### POST /base_verify_token

Verifies a user's signature and returns verification status.

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_SECRET_KEY
```

**Request:**
```json
{
  "signature": "0x...",
  "message": "Sign in with X verification\n\nURI: https://your-app.com\n..."
}
```

**Success Response (200):**
```json
{
  "token": "base_verify_token_here",
  "data": {
    "verified": true,
    "provider": "x",
    "traits": {
      "verified": true
    }
  }
}
```

**Error Responses:**
- `400` - `verification_traits_not_satisfied`: User's Twitter account isn't verified
- `401` - Invalid API credentials
- `404` - No verification found for this wallet

## Error Handling

### Common Response Codes

```typescript
if (response.status === 400) {
  const errorData = await response.json();
  if (errorData.message === 'verification_traits_not_satisfied') {
    showMessage("Your Twitter account needs to be verified to continue");
    redirectToVerification();
  }
} else if (response.status === 404) {
  // No verification found - redirect to verify
  redirectToVerification();
} else if (response.status === 401) {
  console.error("Invalid Base Verify API credentials");
}
```

### Handle User Signature Rejection

```typescript
try {
  const signature = await userWallet.signMessage(message);
  // ... proceed with verification
} catch (error) {
  const errorMessage = error.message.toLowerCase();
  
  // Don't show errors when users cancel wallet signatures
  if (!errorMessage.includes('user rejected') && 
      !errorMessage.includes('user denied') &&
      !errorMessage.includes('rejected')) {
    showError("Verification failed: " + error.message);
  }
}
```

## Environment Configuration

```bash
# Base Verify API endpoint (provided by Base team)
BASE_VERIFY_URL="${BASE_VERIFY_URL}"

# Base Verify Mini App URL (provided by Base team)
BASE_VERIFY_MINI_APP_URL="${BASE_VERIFY_MINI_APP_URL}"

# API credentials (provided by Base team)
BASE_VERIFY_SECRET_KEY="${BASE_VERIFY_SECRET_KEY}"
BASE_VERIFY_PUBLISHER_KEY="${BASE_VERIFY_PUBLISHER_KEY}"

# Your app configuration
YOUR_APP_URL="${YOUR_APP_URL}"
YOUR_APP_DOMAIN="${YOUR_APP_DOMAIN}"
```

## Security Best Practices

1. **Server-Side Verification**: Always verify signatures on your backend, never trust client-side verification
2. **Store Tokens Securely**: Treat Base Verify tokens as sensitive credentials
3. **Unique Token Usage**: Ensure each verification token can only be used once
4. **Rate Limiting**: Implement rate limiting on verification endpoints
5. **HTTPS Only**: All API communication must use HTTPS

## Integration Checklist

- [ ] Obtain Base Verify API credentials and Mini App URL from Base team
- [ ] Set up environment variables
- [ ] Implement wallet connection in your app
- [ ] Add verification check after wallet connection
- [ ] Handle redirect to Base Verify Mini App
- [ ] Process return from verification flow
- [ ] Store verification tokens securely
- [ ] Test with verified and unverified Twitter accounts

## Appendix: SIWE Message Generation

Base Verify uses Sign-In with Ethereum (SIWE) messages with specific resource URNs to indicate verification requirements:

```typescript
import { SiweMessage, generateNonce } from 'siwe';

function generateSIWEMessage(walletAddress: string): string {
  const siweMessage = new SiweMessage({
    domain: '${YOUR_APP_DOMAIN}',
    address: walletAddress,
    statement: 'Sign in with X verification',
    uri: '${YOUR_APP_URL}',
    version: '1',
    chainId: 8453, // Base chain
    nonce: generateNonce(),
    issuedAt: new Date().toISOString(),
    expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
    resources: [
      'urn:verify:provider:x',
      'urn:verify:provider:x:verified:true',
      'urn:verify:action:base_verify_token'
    ]
  });

  return siweMessage.prepareMessage();
}
```

**Required Resource URNs:**
- `urn:verify:provider:x` - Indicates Twitter provider
- `urn:verify:provider:x:verified:true` - Requires verified Twitter account
- `urn:verify:action:base_verify_token` - Action type for verification

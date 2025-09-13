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

// Store signature for potential reuse (optional optimization)
storeSignatureForReuse(walletAddress, message, signature);

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
  // User needs verification - proceed to Step 2
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
  await recheckVerificationAfterReturn(walletAddress);
}
```

Note: This step is not necessary, you can just always re-verify directly when a user connects their wallet to your app.

### Step 5: Grant Access to Verified Users (Optimized)

After the user returns from verification, you can reuse the signature from Step 1 to avoid prompting the user to sign again:

```typescript
async function recheckVerificationAfterReturn(walletAddress: string) {
  // Try to reuse cached signature first
  const cachedSignature = getCachedSignature(walletAddress);
  
  if (cachedSignature && !isSignatureExpired(cachedSignature)) {
    console.log('Reusing cached signature for verification check');
    
    // Reuse the same signature and message from Step 1
    const response = await fetch(`${BASE_VERIFY_URL}/base_verify_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BASE_VERIFY_SECRET_KEY}`
      },
      body: JSON.stringify({
        signature: cachedSignature.signature,
        message: cachedSignature.message
      })
    });

    if (response.ok) {
      const data = await response.json();
      const verificationToken = data.token;
      grantUserAccess(walletAddress, verificationToken);
      return;
    }
  }
  
  // Fallback: generate new signature if cache miss or expired
  await checkVerificationStatus(walletAddress);
}

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

## Easy to Miss Details

⚠️ **Critical implementation details that developers commonly overlook:**

### 1. Success Parameter Detection
When users return from Base Verify Mini App, check for `success=true` in the URL:
```typescript
const urlParams = new URLSearchParams(window.location.search);
const verificationComplete = urlParams.get('success') === 'true';
```

### 2. Signature Reuse Optimization
The SIWE signature from Step 1 can be reused in Step 5 - don't make users sign twice:
```typescript
async function recheckAfterVerification(address: string) {
  const cached = getCachedSignature(address);
  if (cached && !isExpired(cached)) {
    return verifyWithAPI(cached); // No wallet prompt needed
  }
  // Only generate new signature if cache miss
  const newSignature = await generateNewSignature(address);
  return verifyWithAPI(newSignature);
}
```

### 3. Resource URN Requirements
All three resource URNs are required in the SIWE message:
```typescript
resources: [
  'urn:verify:provider:x',
  'urn:verify:provider:x:verified:true',  // Requires verified Twitter
  'urn:verify:action:base_verify_token'   // Specifies the action
]
```

### 4. Error Message Handling
Check for specific error messages, not just status codes:
```typescript
if (response.status === 400) {
  const errorData = await response.json();
  if (errorData.message === 'verification_traits_not_satisfied') {
    showMessage("Your Twitter account needs to be verified");
    redirectToVerification();
  }
}
```

### 5. Wallet Signature Rejection Handling
Don't show error messages when users cancel wallet signatures:
```typescript
try {
  const signature = await wallet.signMessage(message);
} catch (error) {
  const errorMessage = error.message.toLowerCase();
  if (!errorMessage.includes('user rejected') && 
      !errorMessage.includes('user denied') &&
      !errorMessage.includes('rejected')) {
    showError("Verification failed: " + error.message);
  }
  // Silent for user cancellations
}
```

### 6. Token Uniqueness Enforcement
Ensure each Base Verify token can only be used once:
```typescript
const existingByToken = await db.user.findUnique({
  where: { baseVerifyToken: token }
});
if (existingByToken) {
  throw new Error('This verification token has already been used');
}
// Then proceed with upsert...
```

### 7. Cache Invalidation on Address Change
Clear signature cache when wallet address changes:
```typescript
useEffect(() => {
  if (address) {
    const cached = getCachedSignature();
    if (cached && cached.address.toLowerCase() !== address.toLowerCase()) {
      clearSignatureCache(); // Clear stale cache
    }
    checkVerification(address);
  }
}, [address]);
```

### 8. Redirect URI Configuration
Include query parameters in your redirect URI for proper flow handling:
```typescript
const params = new URLSearchParams({
  redirect_uri: `${YOUR_APP_URL}?verification=complete`,
  providers: 'x',
  state: `verify-${Date.now()}` // Optional: for CSRF protection
});
```

### 9. Server-Side Verification
Always verify signatures on your backend:
```typescript
const response = await fetch('/api/verify-token', {
  method: 'POST',
  body: JSON.stringify({ signature, message })
});
if (response.ok) {
  grantAccess(); // Trust server verification
}
```

### 10. SIWE Message Expiration
Set reasonable expiration times (1 hour recommended):
```typescript
const siweMessage = new SiweMessage({
  // ... other fields
  expirationTime: new Date(Date.now() + 60 * 60 * 1000).toISOString()
});
```

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

## Signature Caching Implementation (Optional Optimization)

To improve user experience by avoiding repeated wallet signatures, implement signature caching:

```typescript
interface CachedSignature {
  address: string;
  message: string;
  signature: string;
  expiresAt: number;
}

const SIGNATURE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function storeSignatureForReuse(address: string, message: string, signature: string) {
  const cachedData: CachedSignature = {
    address,
    message,
    signature,
    expiresAt: Date.now() + SIGNATURE_CACHE_DURATION
  };
  
  // Store in localStorage, sessionStorage, or memory
  localStorage.setItem('base_verify_signature', JSON.stringify(cachedData));
}

function getCachedSignature(address: string): CachedSignature | null {
  try {
    const cached = localStorage.getItem('base_verify_signature');
    if (!cached) return null;
    
    const cachedData = JSON.parse(cached) as CachedSignature;
    
    // Validate address matches and signature hasn't expired
    if (cachedData.address.toLowerCase() !== address.toLowerCase()) {
      return null;
    }
    
    if (Date.now() > cachedData.expiresAt) {
      localStorage.removeItem('base_verify_signature');
      return null;
    }
    
    return cachedData;
  } catch (error) {
    console.error('Error reading signature cache:', error);
    return null;
  }
}

function isSignatureExpired(cachedSignature: CachedSignature): boolean {
  return Date.now() > cachedSignature.expiresAt;
}
```

**Benefits of Signature Caching:**
- Eliminates redundant wallet signature prompts
- Improves user experience during verification flow
- Reduces friction when users return from Base Verify Mini App
- Maintains security with time-based expiration

**Important Notes:**
- Cache signatures for a short duration (5-10 minutes maximum)
- Always validate cached signatures match the current wallet address
- Clear cache when wallet address changes
- Implement fallback to generate new signatures if cache is invalid

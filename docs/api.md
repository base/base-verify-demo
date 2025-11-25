# API Reference

Complete API documentation for Base Verify endpoints.

---

## Authentication

All API requests require authentication using your secret key in the `Authorization` header:

```typescript
Authorization: Bearer YOUR_SECRET_KEY
```

**Security:** Your secret key must NEVER be exposed in frontend code. All Base Verify API calls should be proxied through your backend.

---

## POST /v1/base_verify_token

Check if a wallet has a specific verification and retrieve the verification token.

**Authentication:** Requires `Authorization: Bearer {SECRET_KEY}`

**Important:** This endpoint must only be called from your backend. Never expose your secret key in frontend code.

**Security Requirement:** Before calling this endpoint, your backend **MUST** validate that the trait requirements in the SIWE message match what your backend expects. See [Security Best Practices](/docs/security#validate-trait-requirements) for details.

### Request

```ts
{
  signature: string,   // SIWE signature from wallet
  message: string      // SIWE message (includes provider/traits in resources)
}
```

### Backend Validation Required

Before forwarding the request to Base Verify, validate trait requirements:

```typescript
import { validateTraits } from './lib/trait-validator';

// Define expected traits (must match frontend)
const expectedTraits = {
  'verified': 'true',
  'followers': 'gte:1000'
};

// Validate message contains expected traits
const validation = validateTraits(message, 'x', expectedTraits);

if (!validation.valid) {
  return res.status(400).json({
    error: 'Invalid trait requirements in message'
  });
}

// Safe to forward to Base Verify API
```

This prevents users from modifying trait requirements on the frontend to bypass your access controls.

### Example Request

```bash
curl -X POST https://verify.base.dev/v1/base_verify_token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET_KEY" \
  -d '{
    "signature": "0x1234...",
    "message": "verify.base.dev wants you to sign in..."
  }'
```

### Responses

#### 200 OK - Verified

Wallet has verified the provider account AND meets all trait requirements.

```json
{
  "token": "abc123...",
  "signature": "def456...",
  "action": "base_verify_token",
  "wallet": "0x1234..."
}
```

| Field | Type | Description |
| :---- | :---- | :---- |
| `token` | string | Deterministic verification token (for Sybil resistance) |
| `signature` | string | Signature from Base Verify |
| `action` | string | Action from SIWE message |
| `wallet` | string | User's wallet address |

#### 404 Not Found - Verification Not Found

User doesn't have this verification. Redirect to mini app.

```json
{
  "error": "verification_not_found"
}
```

**What to do:** Redirect user to Base Verify Mini App to complete verification.

#### 400 Bad Request - Traits Not Satisfied

User has provider account but doesn't meet trait requirements.

```json
{
  "code": 9,
  "message": "verification_traits_not_satisfied",
  "details": []
}
```

**What to do:** Show user they don't meet requirements. Do not redirect (they already have the account, just don't meet your thresholds).

#### 401 Unauthorized - Invalid Key

Invalid or missing API key.

```json
{
  "error": "unauthorized"
}
```

**What to do:** Check your secret key is correct and included in Authorization header.

---

## Mini App Redirect

To redirect users to Base Verify for verification:

```typescript
https://verify.base.dev?redirect_uri={your_app_url}&providers={provider}
```

### Parameters

| Parameter | Required | Description | Example |
| :---- | :---- | :---- | :---- |
| `redirect_uri` | Yes | Where to send user after verification | `https://yourapp.com` |
| `providers` | Yes | Provider to verify | `x`, `coinbase`, `instagram`, `tiktok` |

### Example

```typescript
const params = new URLSearchParams({
  redirect_uri: 'https://yourapp.com',
  providers: 'x'
});

const miniAppUrl = `https://verify.base.dev?${params}`;
const deepLink = `cbwallet://miniapp?url=${encodeURIComponent(miniAppUrl)}`;

window.open(deepLink, '_blank');
```

After verification, user returns to your `redirect_uri` with `?success=true`.

---

## Error Handling Best Practices

### Do Not Retry 404

If you get 404, the user simply hasn't verified yet. Redirect them to Base Verify Mini App.

### Do Not Retry 400 (Traits Not Satisfied)

If you get 400 with `verification_traits_not_satisfied`, the user won't pass your requirements. Retrying won't help unless their account metrics change (e.g., they gain more followers).

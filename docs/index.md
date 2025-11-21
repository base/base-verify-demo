# Base Verify Documentation

Base Verify allows users to prove ownership of verified accounts (X, Coinbase, Instagram, TikTok) without sharing credentials. Your app receives a deterministic token for Sybil resistance.

**How it works:**
1. Check if wallet has verification → API returns yes/no
2. If no → redirect to Base Verify Mini App for OAuth
3. User verifies → returns to your app
4. Check again → now verified

---

## Get Started

### Integration Guide
Complete guide including architecture, core concepts, and step-by-step implementation.

→ [Read Integration Guide](/docs/integration)

### API Reference
Endpoints, authentication, request/response schemas, and error codes.

→ [Read API Reference](/docs/api)

### Trait Catalog
Available traits for all providers with interactive examples you can test.

→ [Read Trait Catalog](/docs/traits)

### Security & Privacy
How Base Verify protects user data and handles OAuth.

→ [Read Security Overview](/docs/security)

---

## Quick Example

Here's the simplest flow for checking X verification:

```typescript
// 1. Frontend: Generate SIWE signature
const signature = await generateSignature({
  provider: 'x',
  traits: { 'verified': 'true' },
  action: 'base_verify_token'
});

// 2. Send to your backend
const result = await fetch('/api/check-verification', {
  method: 'POST',
  body: JSON.stringify({ signature, message })
});

// 3. Backend calls Base Verify
// 4. If 404 → redirect to Base Verify Mini App
// 5. User verifies → returns to your app
// 6. Check again → 200 with token
```

---

## Support & Feedback

**Need API keys?** Contact: [rahul.patni@coinbase.com](mailto:rahul.patni@coinbase.com)

**Questions or issues?**  
Email: rahul.patni@coinbase.com  
Telegram: @patnir  
Farcaster: @patni


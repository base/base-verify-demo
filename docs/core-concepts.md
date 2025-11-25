# Core Concepts

Base Verify relies on a few shared primitives. Refer back to this glossary whenever you build new flows or explain the system to partners.

## Provider

An identity platform that Base Verify integrates with. Currently supports **X (Twitter)**, **Coinbase**, **Instagram**, and **TikTok**.

## Verification

Cryptographic proof that a wallet owns an account with a specific provider.

## Trait

A specific attribute of the provider account that can be verified.

**Examples:**
- `verified: true` – X account has blue checkmark
- `coinbase_one_active: true` – Active Coinbase One subscription
- `followers: gt:1000` – X account has over 1000 followers
- `followers_count: gte:5000` – Instagram account with 5000+ followers
- `video_count: gte:50` – TikTok account with 50+ videos

## Token – Sybil Resistance

A deterministic identifier tied to the provider account, not the wallet. **This is the key anti-sybil mechanism.**

### How It Works

- Wallet A verifies an X account → Base Verify returns `Token: abc123` → You have never seen it, so grant the airdrop.
- The same X account tries again with Wallet B → Base Verify returns `Token: abc123` → You have seen it, so block the duplicate claim.

Without Base Verify, users could claim multiple times with different wallets. With Base Verify, one verified account = one token = one claim.

### Token Properties

- **Deterministic**: The same provider account always produces the same token.
- **Unique per provider**: A user's X token is different from their Instagram token.
- **Unique per app**: Your app receives different tokens than other apps (privacy).
- **Action-specific**: Tokens can vary based on the action in your SIWE message.
- **Persistent**: Tokens don't expire or rotate (unless the user deletes their verification).
- **Trait-independent**: Tokens stay the same even if traits change (e.g., follower count increases).

### How to Store Tokens

```typescript
// In your database
{
  token: "abc123...",           // The verification token from Base Verify
  walletAddress: "0x1234...",   // The wallet that claimed (for your records)
  provider: "x",                // Which provider was verified
  claimedAt: "2024-01-15",      // When they claimed
}
```

### Example: Prevent Double Claims

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


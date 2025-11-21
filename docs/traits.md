# Trait Catalog

Complete reference for all available traits across providers.

---

## Trait System Reference

Traits are specific attributes of a provider account that you can verify.

### Trait Syntax

Traits are specified in SIWE message resources using this format:

```typescript
urn:verify:provider:{provider}:{trait_name}:{operation}:{value}
```

**Example:**
```typescript
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

**Multiple Requirements:**
```typescript
// Active TikTok creator
traits: {
  'follower_count': 'gte:5000',
  'video_count': 'gte:100',
  'likes_count': 'gte:50000'
}
```

---

## Provider Traits

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

---

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

---

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

---

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

## Related Documentation

- [Integration Guide](/docs/integration) - Complete implementation guide
- [API Reference](/docs/api) - Endpoint documentation
- [Security Overview](/docs/security) - Security and privacy


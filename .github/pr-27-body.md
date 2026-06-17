## Summary
- One-click demo reset fetches `uniqueHash` then calls `resetClaim`
- OnchainKit / wagmi default to Base Sepolia
- Gated by `NEXT_PUBLIC_ENABLE_DEMO_RESET`

## Base Sepolia contracts (local dev)
Deployed for testing this PR against verify PR #338:

| Contract | Address |
|----------|---------|
| VerifyRegistry | `0x422cF0f188F8Bf9d93E2810CA429d1bB5cdd620d` |
| SybilResistantAirdrop | `0x1Bef27589187431eAfE41F807f0bEF5679134f89` |

- Chain ID: `84532`
- Action: `my_app_airdrop_2026`
- Registered signer: `0xC2551BD4CB9c9fc78F4cCC8eF2C8f33E9Ea044a7`

Demo `.env.local`:
```env
NEXT_PUBLIC_CLAIM_CONTRACT_ADDRESS="0x1Bef27589187431eAfE41F807f0bEF5679134f89"
NEXT_PUBLIC_CLAIM_CHAIN_ID="84532"
NEXT_PUBLIC_ENABLE_DEMO_RESET="true"
```

Verify `config/local.yaml`:
```yaml
onchain:
  registry_address: "0x422cF0f188F8Bf9d93E2810CA429d1bB5cdd620d"
  chain_id: 84532
```

## Test plan
- [ ] Connect wallet on `/onchain` (Base Sepolia), claim with a verified Coinbase credential
- [ ] Claim again with same identity → `AlreadyClaimed`
- [ ] With `NEXT_PUBLIC_ENABLE_DEMO_RESET=true`, reset and reclaim successfully

type=routine
risk=low
impact=sev5

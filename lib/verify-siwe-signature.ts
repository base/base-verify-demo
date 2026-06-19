/**
 * SIWE signature pinning for third-party integrators.
 *
 * Base Verify authenticates the *caller* (the app's secret key) and verifies the
 * user's signature, but the eligibility rules live inside the user-signed SIWE
 * message. A malicious user can edit that message before signing (drop a trait,
 * swap the action) and still produce a valid signature. So a third-party app must
 * bind the signed message back to what it actually intended before trusting the
 * resulting token.
 *
 * This helper shows that discipline:
 *  1. Confirm the signature really comes from the wallet named in the message.
 *  2. Pin the action to exactly the one this app gates on.
 *
 * Trait pinning is handled separately by validateTraits().
 */
import { SiweMessage } from "siwe";
import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "viem/chains";

export interface SiweVerificationResult {
  valid: boolean;
  address?: string;
  action?: string;
  error?: string;
}

// verifyMessage handles EOA, ERC-1271 and ERC-6492 (undeployed smart wallets),
// matching how the Base Verify backend verifies signatures.
function publicClientForChain(chainId: number) {
  if (chainId === base.id) {
    return createPublicClient({ chain: base, transport: http() });
  }
  if (chainId === baseSepolia.id) {
    return createPublicClient({ chain: baseSepolia, transport: http() });
  }
  return undefined;
}

function extractAction(resources: string[] | null | undefined): string | undefined {
  if (!resources) return undefined;
  for (const resource of resources) {
    const match = resource.match(/^urn:verify:action:(.+)$/);
    if (match) return match[1];
  }
  return undefined;
}

export async function verifySiweSignature(
  message: string,
  signature: string,
  expectedAction: string
): Promise<SiweVerificationResult> {
  let parsed: SiweMessage;
  try {
    parsed = new SiweMessage(message);
  } catch {
    return { valid: false, error: "Malformed SIWE message" };
  }

  const address = parsed.address;
  const action = extractAction(parsed.resources);

  // Pin the action. Without this, a user can swap the action to mint a different
  // token for the same identity and bypass the one-claim-per-identity dedup.
  if (action !== expectedAction) {
    return {
      valid: false,
      address,
      action,
      error: `Action mismatch: expected '${expectedAction}', found '${action ?? "none"}'`,
    };
  }

  const client = publicClientForChain(parsed.chainId);
  if (!client) {
    return { valid: false, address, action, error: `Unsupported chainId: ${parsed.chainId}` };
  }

  let signatureValid = false;
  try {
    signatureValid = await client.verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
  } catch {
    return { valid: false, address, action, error: "Signature verification call failed" };
  }

  if (!signatureValid) {
    return {
      valid: false,
      address,
      action,
      error: "Signature does not match the wallet named in the message",
    };
  }

  return { valid: true, address, action };
}

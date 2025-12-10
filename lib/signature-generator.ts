import { ethers } from 'ethers';
import { SiweMessage, generateNonce } from 'siwe';
import { config } from './config';

export interface SIWEOptions {
  address: string;
  action?: string;
  provider?: string;
  traits?: Record<string, any>;
  verificationID?: string;
  domain?: string;
  uri?: string;
  chainId?: number;
  statement?: string;
}

// Build SIWE message using the official SIWE library
function buildSIWEMessage(options: SIWEOptions): { message: string; nonce: string } {
  const {
    domain = new URL(config.appUrl).hostname,
    address,
    uri = config.appUrl,
    chainId = 8453, // Base chain
    statement = 'Claim airdrop with X Blue Checkmark',
    action,
    provider,
    traits = {},
    verificationID,
  } = options;

  const nonce = generateNonce();
  const issuedAt = new Date();
  
  // Set expiration time to 6 hours from now (better for testing)
  const expirationTime = new Date(Date.now() + 6 * 60 * 60 * 1000);

  // Build resources array as valid RFC3986 URIs (SIWE requires URIs)
  const resources: string[] = [];

  if (provider) {
    // Add base provider URN
    resources.push(`urn:verify:provider:${provider}`);
    
    // Add traits as embedded provider URNs: urn:verify:provider:provider:trait_type:operation:value
    Object.entries(traits).forEach(([key, value]) => {
      const safeKey = key;
      const safeValue = String(value);
      
      // Parse operation from value if present (e.g., "gt:100" -> operation: "gt", value: "100")
      // Supported operations: eq, gt, gte, lt, lte, in
      const operationMatch = safeValue.match(/^(eq|gt|gte|lt|lte|in):(.+)$/);
      
      if (operationMatch) {
        // Value contains operation prefix
        const operation = operationMatch[1];
        const actualValue = operationMatch[2];
        resources.push(`urn:verify:provider:${provider}:${safeKey}:${operation}:${actualValue}`);
      } else {
        // No operation prefix, default to 'eq'
        resources.push(`urn:verify:provider:${provider}:${safeKey}:eq:${safeValue}`);
      }
    });
  }

  if (action) {
    resources.push(`urn:verify:action:${action}`);
  }

  // Add verification ID if provided
  if (verificationID) {
    resources.push(`urn:verify:verificationid:${verificationID}`);
  }

  // Create SIWE message using the official library
  const siweMessage = new SiweMessage({
    domain,
    address,
    statement,
    uri,
    version: '1',
    chainId,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expirationTime.toISOString(),
    resources: resources.length > 0 ? resources : undefined,
  });

  return { message: siweMessage.prepareMessage(), nonce };
}

export interface GenerateSignatureOptions {
  privateKey?: string;
  action?: string;
  provider?: string;
  traits?: Record<string, any>;
  verificationID?: string;
  domain?: string;
  uri?: string;
  chainId?: number;
  statement?: string;
  signMessageFunction?: (message: string) => Promise<string>;
  address?: string;
}

export interface GeneratedSignature {
  address: string;
  message: string;
  signature: string;
  nonce: string;
}

export async function generateSignature(options: GenerateSignatureOptions): Promise<GeneratedSignature> {
  const {
    privateKey,
    action,
    provider = 'x',
    traits = {},
    verificationID,
    domain,
    uri,
    chainId,
    statement,
    signMessageFunction,
    address: providedAddress,
  } = options;

  try {
    let address: string;
    let signMessage: (message: string) => Promise<string>;

    if (signMessageFunction && providedAddress) {
      // Use provided sign function and address (wallet integration)
      address = providedAddress;
      signMessage = signMessageFunction;
    } else if (privateKey) {
      // Use private key (for testing/scripts)
      const wallet = new ethers.Wallet(privateKey);
      address = wallet.address;
      signMessage = (message: string) => wallet.signMessage(message);
    } else {
      throw new Error('Either privateKey or both signMessageFunction and address must be provided');
    }

    const siweOptions: SIWEOptions = {
      address,
      action,
      provider,
      traits,
      verificationID,
      domain,
      uri,
      chainId,
      statement,
    };

    const { message, nonce } = buildSIWEMessage(siweOptions);
    const signature = await signMessage(message);

    return {
      address,
      message,
      signature,
      nonce,
    };
  } catch (error) {
    console.error('Error generating signature:', error);
    throw new Error(`Failed to generate signature: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
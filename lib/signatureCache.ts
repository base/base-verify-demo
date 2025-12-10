import type { GeneratedSignature } from './signature-generator';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const CACHE_KEY = 'verify-signature-cache';

// TODO: Include the expiration in the SIWE message
type CachedSignatureData = GeneratedSignature & {
  expiresAt: number;
};

export const verifySignatureCache = {
  set(signatureData: GeneratedSignature): void {
    const cachedData: CachedSignatureData = {
      ...signatureData,
      expiresAt: Date.now() + CACHE_DURATION,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedData));
  },

  get(): GeneratedSignature | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const cachedData = JSON.parse(cached) as CachedSignatureData;

      // Check if cache is expired
      if (Date.now() > cachedData.expiresAt) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return {
        address: cachedData.address,
        message: cachedData.message,
        signature: cachedData.signature,
        nonce: cachedData.nonce,
      };
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error reading signature cache:', error);
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  },

  clear(): void {
    localStorage.removeItem(CACHE_KEY);
  },

  isExpired(): boolean {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return true;

      const cachedData = JSON.parse(cached) as CachedSignatureData;
      return Date.now() > cachedData.expiresAt;
    } catch (error) {
      return true;
    }
  },

  // Helper method to check if cached signature matches current address, action, and provider
  isValidForAddress(address: string, action: string, provider?: string): boolean {
    const cached = this.get();
    if (!cached) return false;
    
    // Check if address matches
    if (cached.address.toLowerCase() !== address.toLowerCase()) {
      return false;
    }
    
    // Check if action matches by looking for it in the message
    if (!cached.message.includes(`urn:verify:action:${action}`)) {
      return false;
    }
    
    // Check if provider matches by looking for it in the message
    if (provider && !cached.message.includes(`urn:verify:provider:${provider}`)) {
      return false;
    }
    
    return true;
  },
};

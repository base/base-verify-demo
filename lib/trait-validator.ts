/**
 * Trait Validation Utility
 * 
 * Validates that SIWE message trait requirements match backend expectations.
 * This prevents users from modifying trait requirements on the frontend.
 */

export interface TraitRequirement {
  [traitName: string]: string; // e.g., { 'verified': 'true', 'followers': 'gte:1000' }
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  provider?: string;
  foundTraits?: TraitRequirement;
  expectedTraits?: TraitRequirement;
}

/**
 * Parse trait URNs from SIWE message resources
 * Format: urn:verify:provider:{provider}:{trait_name}:{operation}:{value}
 * 
 * @param message - The SIWE message string
 * @returns Object with provider and traits, or null if no provider found
 */
function parseTraitsFromMessage(message: string): { provider: string; traits: TraitRequirement } | null {
  // Extract resources section from SIWE message
  const resourcesMatch = message.match(/Resources:\s*\n((?:- .+\n)+)/);
  if (!resourcesMatch) {
    return null;
  }

  const resources = resourcesMatch[1]
    .split('\n')
    .map(line => line.replace(/^- /, '').trim())
    .filter(line => line.length > 0);

  // Find provider URN
  const providerUrn = resources.find(r => r.match(/^urn:verify:provider:[^:]+$/));
  if (!providerUrn) {
    return null;
  }

  const providerMatch = providerUrn.match(/^urn:verify:provider:([^:]+)$/);
  if (!providerMatch) {
    return null;
  }

  const provider = providerMatch[1];
  const traits: TraitRequirement = {};

  // Parse trait URNs for this provider
  const traitPattern = new RegExp(`^urn:verify:provider:${provider}:([^:]+):([^:]+):(.+)$`);
  
  resources.forEach(resource => {
    const traitMatch = resource.match(traitPattern);
    if (traitMatch) {
      const [, traitName, operation, value] = traitMatch;
      
      // Reconstruct the trait value with operation prefix
      // (except for 'eq' which is the default and can be omitted)
      if (operation === 'eq') {
        traits[traitName] = value;
      } else {
        traits[traitName] = `${operation}:${value}`;
      }
    }
  });

  return { provider, traits };
}

/**
 * Normalize trait requirement for comparison
 * Handles the 'eq' operation being implicit
 * 
 * @param value - The trait value (e.g., 'true', 'gte:1000')
 * @returns Normalized value with explicit operation
 */
function normalizeTraitValue(value: string): string {
  // If value doesn't have an operation prefix, it's implicitly 'eq'
  if (!value.match(/^(eq|gt|gte|lt|lte|in):/)) {
    return `eq:${value}`;
  }
  return value;
}

/**
 * Validate that message traits match expected requirements
 * 
 * @param message - The SIWE message string
 * @param expectedProvider - Expected provider name (e.g., 'x', 'coinbase')
 * @param expectedTraits - Expected trait requirements
 * @returns ValidationResult with validation status and details
 */
export function validateTraits(
  message: string,
  expectedProvider: string,
  expectedTraits: TraitRequirement
): ValidationResult {
  // Parse traits from message
  const parsed = parseTraitsFromMessage(message);
  
  if (!parsed) {
    return {
      valid: false,
      error: `No provider found in SIWE message`,
      expectedTraits
    };
  }

  const { provider, traits: foundTraits } = parsed;

  // Check provider matches
  if (provider !== expectedProvider) {
    return {
      valid: false,
      error: `Provider mismatch: expected '${expectedProvider}', found '${provider}'`,
      provider,
      foundTraits,
      expectedTraits
    };
  }

  // Normalize all trait values for comparison
  const normalizedExpected: Record<string, string> = {};
  Object.entries(expectedTraits).forEach(([key, value]) => {
    normalizedExpected[key] = normalizeTraitValue(value);
  });

  const normalizedFound: Record<string, string> = {};
  Object.entries(foundTraits).forEach(([key, value]) => {
    normalizedFound[key] = normalizeTraitValue(value);
  });

  // Check all expected traits are present with correct values
  const missingTraits: string[] = [];
  const mismatchedTraits: Array<{ trait: string; expected: string; found: string }> = [];

  Object.entries(normalizedExpected).forEach(([traitName, expectedValue]) => {
    if (!(traitName in normalizedFound)) {
      missingTraits.push(traitName);
    } else if (normalizedFound[traitName] !== expectedValue) {
      mismatchedTraits.push({
        trait: traitName,
        expected: expectedValue,
        found: normalizedFound[traitName]
      });
    }
  });

  // Check for unexpected traits (traits in message but not in expected)
  const unexpectedTraits = Object.keys(normalizedFound).filter(
    key => !(key in normalizedExpected)
  );

  // Build error message if validation fails
  if (missingTraits.length > 0 || mismatchedTraits.length > 0 || unexpectedTraits.length > 0) {
    const errors: string[] = [];
    
    if (missingTraits.length > 0) {
      errors.push(`Missing required traits: ${missingTraits.join(', ')}`);
    }
    
    if (mismatchedTraits.length > 0) {
      const details = mismatchedTraits
        .map(({ trait, expected, found }) => `${trait} (expected: ${expected}, found: ${found})`)
        .join('; ');
      errors.push(`Trait value mismatch: ${details}`);
    }
    
    if (unexpectedTraits.length > 0) {
      errors.push(`Unexpected traits: ${unexpectedTraits.join(', ')}`);
    }

    return {
      valid: false,
      error: errors.join('. '),
      provider,
      foundTraits,
      expectedTraits
    };
  }

  // All checks passed
  return {
    valid: true,
    provider,
    foundTraits,
    expectedTraits
  };
}


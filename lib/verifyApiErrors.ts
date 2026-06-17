const BACKEND_MESSAGE_COPY: Record<string, string> = {
  verification_not_found:
    'No Coinbase verification for this wallet. Complete verify first.',
  verification_traits_not_satisfied:
    'Verification does not meet the required traits.',
  credential_not_found:
    'No verified account found for this wallet. Complete verification first.',
  no_valid_credential:
    'No verified account found for this wallet. Complete verification first.',
  invalid_signature:
    'SIWE signature invalid. Sign in again and retry.',
  server_error:
    'Verify backend failed to sign the token. Check verify/.env ONCHAIN_SIGNING_KEY (64-char hex, no 0x prefix) and restart the backend.',
}

function readBackendCode(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string }
    return parsed.message || parsed.error
  } catch {
    return undefined
  }
}

export function parseVerifyBackendError(status: number, body: string): string {
  const code = readBackendCode(body)
  if (code && BACKEND_MESSAGE_COPY[code]) {
    return BACKEND_MESSAGE_COPY[code]
  }
  if (code) {
    return code.replace(/_/g, ' ')
  }

  switch (status) {
    case 400:
      return 'The verification request was invalid. Sign in again and retry.'
    case 401:
      return 'This app is not authorized to call Base Verify. Check your API keys.'
    case 404:
      return 'No Coinbase verification for this wallet. Complete verify first.'
    case 412:
      return 'Verification does not meet the required traits.'
    case 429:
      return 'Too many requests. Wait a moment and try again.'
    case 500:
      return 'Verify backend error. Check backend logs and ONCHAIN_SIGNING_KEY config.'
    default:
      return `Failed to get onchain verify token (${status})`
  }
}

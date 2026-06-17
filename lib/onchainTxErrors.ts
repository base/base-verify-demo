const REVERT_MESSAGES: Record<string, string> = {
  '0x646cf558': 'This identity has already claimed.',
  '0x0455eeee': 'Nothing to reset — this identity has not claimed yet.',
  '0x3c091c33': 'Token expired. Sign in again and retry the claim.',
  '0x8baa579f':
    'Onchain signature rejected. Ensure verify/.env ONCHAIN_SIGNING_KEY is 64 hex chars (no 0x), matches the registered signer, and restart the verify backend.',
  '0xd0b145db': 'Verify signer is not registered on the deployed VerifyRegistry.',
}

const TEXT_MATCHES: Array<{ match: string; message: string }> = [
  { match: 'AlreadyClaimed', message: REVERT_MESSAGES['0x646cf558'] },
  { match: 'ClaimNotFound', message: REVERT_MESSAGES['0x0455eeee'] },
  { match: 'TokenExpired', message: REVERT_MESSAGES['0x3c091c33'] },
  { match: 'InvalidSignature', message: REVERT_MESSAGES['0x8baa579f'] },
  { match: 'UntrustedSigner', message: REVERT_MESSAGES['0xd0b145db'] },
  {
    match: 'ConnectorChainMismatch',
    message:
      'Wallet chain does not match the connection. Disconnect, reconnect, and switch your wallet to the correct network before retrying.',
  },
  {
    match: 'insufficient funds',
    message: 'Insufficient Base Sepolia ETH to pay for this transaction.',
  },
]

function collectErrorText(error: unknown): string {
  let str = ''
  let e: unknown = error
  while (e instanceof Error) {
    str += `${e.message} `
    e = (e as Error & { cause?: unknown }).cause
  }
  if (typeof error === 'string') str += error
  return str
}

export function isUserRejectedWalletError(error: unknown): boolean {
  const message = collectErrorText(error).toLowerCase()
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('rejected the request')
  )
}

export function parseOnchainTxError(error: unknown): string {
  if (isUserRejectedWalletError(error)) {
    return ''
  }

  const str = collectErrorText(error)

  for (const [selector, message] of Object.entries(REVERT_MESSAGES)) {
    if (str.includes(selector) || str.includes(selector.slice(2))) {
      return message
    }
  }

  for (const { match, message } of TEXT_MATCHES) {
    if (str.includes(match)) {
      return message
    }
  }

  return 'Transaction failed. Please try again.'
}

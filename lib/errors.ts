type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const BACKEND_MESSAGE_COPY: Record<string, string> = {
  verification_traits_not_satisfied:
    "Your account does not meet the verification requirements for this action.",
  credential_not_found:
    "No verified account found for this wallet. Complete verification first.",
  no_valid_credential:
    "No verified account found for this wallet. Complete verification first.",
};

export function mapVerifyApiError(status: number, body: unknown): string {
  if (isRecord(body)) {
    const message = readString(body.message);
    if (message && BACKEND_MESSAGE_COPY[message]) {
      return BACKEND_MESSAGE_COPY[message];
    }
    if (message) {
      return message;
    }
    const error = readString(body.error);
    if (error) {
      return error;
    }
  }

  switch (status) {
    case 400:
      return "The verification request was invalid. Sign in again and retry.";
    case 401:
      return "This app is not authorized to call Base Verify. Check your API keys.";
    case 404:
      return "No verified Coinbase account found for this wallet. Verify your account first.";
    case 412:
      return "Your account does not meet the verification requirements for this action.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    case 500:
      return "Base Verify is temporarily unavailable. Try again shortly.";
    default:
      return "Could not complete verification. Please try again.";
  }
}

export function isUserRejectedWalletError(error: unknown): boolean {
  const message = collectErrorText(error).toLowerCase();
  return (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("rejected the request")
  );
}

function collectErrorText(error: unknown): string {
  let text = "";
  let current: unknown = error;
  while (current instanceof Error) {
    text += `${current.name} ${current.message} `;
    current = (current as Error & { cause?: unknown }).cause;
  }
  if (typeof current === "string") {
    text += current;
  }
  return text;
}

const CONTRACT_ERROR_COPY: Array<{ match: string; message: string }> = [
  {
    match: "AlreadyClaimed",
    message:
      "This identity has already claimed. Each verified account can only claim once.",
  },
  {
    match: "ClaimNotFound",
    message: "Nothing to reset — this identity has not claimed yet.",
  },
  {
    match: "TokenExpired",
    message: "Your verify token expired. Request a new one and try again.",
  },
  {
    match: "InvalidVerification",
    message:
      "Verification failed. Your token may be expired, signed by an unregistered signer, or bound to a different contract.",
  },
  {
    match: "UntrustedSigner",
    message:
      "The onchain signer is not registered on this registry. Check your local deploy and backend signing key.",
  },
  {
    match: "InvalidSignature",
    message:
      "The verify token signature is invalid. Confirm the airdrop contract address and registry match your backend config.",
  },
  {
    match: "insufficient funds",
    message: "Insufficient Base Sepolia ETH to pay for this transaction.",
  },
  {
    match: "wrong chain",
    message: "Switch your wallet to Base Sepolia and try again.",
  },
  {
    match: "chain mismatch",
    message: "Switch your wallet to Base Sepolia and try again.",
  },
];

export function mapContractRevertError(error: unknown): string {
  if (isUserRejectedWalletError(error)) {
    return "";
  }

  const text = collectErrorText(error);
  for (const { match, message } of CONTRACT_ERROR_COPY) {
    if (text.includes(match)) {
      return message;
    }
  }

  return "Transaction failed. Please try again.";
}

export function mapWalletError(error: unknown): string {
  const mapped = mapContractRevertError(error);
  if (mapped) {
    return mapped;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

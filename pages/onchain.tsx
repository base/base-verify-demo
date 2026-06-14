import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAccount, useSignMessage, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { generateSignature } from '../lib/signature-generator'
import { verifySignatureCache } from '../lib/signatureCache'
import { config } from '../lib/config'
import { useToast } from '../components/ToastProvider'

// Minimal ABI — only the functions and errors this page uses.
const AIRDROP_ABI = [
  {
    name: 'claim',
    type: 'function',
    inputs: [
      { name: 'uniqueHash', type: 'bytes32' },
      { name: 'expiration', type: 'uint256' },
      { name: 'delegate', type: 'address' },
      { name: 'signature', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  { name: 'AlreadyClaimed', type: 'error', inputs: [] },
  { name: 'InvalidVerification', type: 'error', inputs: [] },
] as const

type OnchainToken = {
  owner: string
  target: string
  action: string
  uniqueHash: string
  expiration: string
  delegate: string
  signature: string
}

const ACTION = 'my_app_airdrop_2026'

function parseTxError(error: Error): string {
  // Walk the full error + cause chain as strings — viem nests custom error names in cause.
  let str = ''
  let e: unknown = error
  while (e instanceof Error) {
    str += e.message + ' '
    e = (e as any).cause
  }
  if (str.includes('AlreadyClaimed')) return 'This identity has already claimed. Each Coinbase account can only claim once.'
  if (str.includes('InvalidVerification')) return 'Token expired or invalid. Please try again.'
  if (str.includes('User rejected') || str.includes('user rejected') || str.includes('denied')) return ''
  return 'Transaction failed. Please try again.'
}

export default function OnchainPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const { showToast } = useToast()

  const [isClaiming, setIsClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string>('')
  const [isAutoVerification, setIsAutoVerification] = useState(false)
  const [showVerifyModal, setShowVerifyModal] = useState(false)

  const { writeContract, data: txHash, isPending: isTxPending, error: writeError } = useWriteContract()
  const { isSuccess: isTxSuccess, isError: isTxError } = useWaitForTransactionReceipt({ hash: txHash })

  // Clear cache when address changes or if cached signature is for wrong provider/action
  useEffect(() => {
    if (address) {
      const cachedSignature = verifySignatureCache.get()
      if (cachedSignature) {
        if (cachedSignature.address.toLowerCase() !== address.toLowerCase()) {
          verifySignatureCache.clear()
        } else if (!cachedSignature.message.includes('urn:verify:provider:coinbase') ||
                   !cachedSignature.message.includes(`urn:verify:action:${ACTION}`)) {
          verifySignatureCache.clear()
        }
      }
    }
  }, [address])

  // Auto-verify when returning from the verification detour with success=true
  useEffect(() => {
    const { success } = router.query
    if (success === 'true' && address && isConnected && !isClaiming && !txHash) {
      setIsAutoVerification(true)
      handleClaim(true)
      const { success: _, ...cleanQuery } = router.query
      router.replace({ pathname: router.pathname, query: cleanQuery }, undefined, { shallow: true })
    }
  }, [router.query, address, isConnected])

  const generateCodeVerifier = () => {
    const array = new Uint8Array(32)
    window.crypto.getRandomValues(array)
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder()
    const digest = await window.crypto.subtle.digest('SHA-256', encoder.encode(verifier))
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const executeRedirectToVerifyWebApp = async () => {
    const codeVerifier = generateCodeVerifier()
    const codeChallenge = await generateCodeChallenge(codeVerifier)
    const state = `verify-${Date.now()}`
    sessionStorage.setItem('pkce_code_verifier', codeVerifier)
    sessionStorage.setItem('pkce_state', state)
    const params = new URLSearchParams({
      redirect_uri: `${config.appUrl}/onchain?success=true`,
      providers: 'coinbase',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })
    window.location.href = `${config.baseVerifyWebAppUrl}?${params.toString()}`
  }

  const handleClaim = async (isAutoVerifyFromSuccess = false) => {
    if (!address || !signMessage) {
      setClaimError('Please connect your wallet to claim')
      return
    }

    setIsClaiming(true)
    setClaimError('')

    try {
      // Step 1: get or reuse a cached SIWE signature.
      // Onchain tab: coinbase provider, no eligibility conditions (account only).
      let signature
      const cachedSignature = verifySignatureCache.get()
      if (cachedSignature && verifySignatureCache.isValidForAddress(address, ACTION, 'coinbase')) {
        signature = cachedSignature
      } else {
        signature = await generateSignature({
          action: ACTION,
          provider: 'coinbase',
          traits: {},
          signMessageFunction: async (message: string) =>
            new Promise<string>((resolve, reject) =>
              signMessage({ message }, { onSuccess: resolve, onError: reject })
            ),
          address,
        })
        verifySignatureCache.set(signature)
      }

      // Step 2: fetch the EIP-712 signed token from the backend (server-side route).
      const response = await fetch('/api/onchain/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signature.signature, message: signature.message }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 404) {
          if (isAutoVerifyFromSuccess) {
            setClaimError('Coinbase account not found. Please verify your account first.')
            setIsAutoVerification(false)
          } else {
            setIsAutoVerification(false)
            setShowVerifyModal(true)
          }
          return
        }
        verifySignatureCache.clear()
        setClaimError(errorData.error || 'Failed to get onchain verify token')
        return
      }

      const { token }: { token: OnchainToken } = await response.json()
      setIsAutoVerification(false)

      // Step 3: submit the claim tx to the consumer contract on Base Sepolia.
      writeContract({
        address: config.claimContractAddress as `0x${string}`,
        abi: AIRDROP_ABI,
        functionName: 'claim',
        args: [
          token.uniqueHash as `0x${string}`,
          BigInt(token.expiration),
          token.delegate as `0x${string}`,
          token.signature as `0x${string}`,
        ],
        chainId: config.claimChainId,
      })
    } catch (err) {
      verifySignatureCache.clear()
      const errorMessage = err instanceof Error ? err.message : 'Claim failed'
      if (!errorMessage.toLowerCase().includes('user rejected') &&
          !errorMessage.toLowerCase().includes('user denied') &&
          !errorMessage.toLowerCase().includes('rejected')) {
        setClaimError(errorMessage)
      }
      setIsAutoVerification(false)
    } finally {
      setIsClaiming(false)
    }
  }

  // Parse onchain errors into user-friendly messages
  const claimTxError = isTxError
    ? 'Transaction failed. If you have already claimed, this identity cannot claim again.'
    : writeError
    ? parseTxError(writeError)
    : ''

  // Notify on tx success
  useEffect(() => {
    if (isTxSuccess) {
      showToast('Airdrop claimed onchain!', 'success')
    }
  }, [isTxSuccess])

  const isLoading = isClaiming || isTxPending

  return (
    <Layout title="Onchain Airdrop (Base Sepolia)">
      <Head>
        <title>Claim Your Onchain Airdrop</title>
        <meta name="description" content="Claim an onchain airdrop gated by Base Verify — deduplication enforced by smart contract." />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div>
        {/* Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 7vw, 2.5rem)', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem 0', lineHeight: '1.1' }}>
            claim your onchain airdrop
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 1.25rem 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', lineHeight: '1.3' }}>
            Requires a Coinbase account. One claim per identity — enforced by smart contract on Base Sepolia.
          </p>

          {(claimError || claimTxError) && (
            <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #fecaca', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: '500', color: '#991b1b', textAlign: 'center', lineHeight: '1.4' }}>
                {claimError || claimTxError}
              </span>
            </div>
          )}

          {/* Success state */}
          {isTxSuccess && txHash && (
            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1rem 1.25rem', border: '1px solid #bbf7d0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto', marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: '600', color: '#15803d', margin: '0 0 0.5rem 0' }}>
                Claimed onchain!
              </p>
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '0.75rem', color: '#16a34a', fontFamily: 'monospace' }}
              >
                {txHash.slice(0, 10)}…{txHash.slice(-8)} ↗
              </a>
            </div>
          )}
        </div>

        {/* Claim Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
          {isConnected && address && !isTxSuccess ? (
            <button
              onClick={() => { setIsAutoVerification(false); handleClaim(false) }}
              disabled={isLoading}
              style={{
                padding: '0.875rem 1.5rem',
                background: isLoading ? '#f3f4f6' : 'white',
                color: isLoading ? '#9ca3af' : '#1a1a1a',
                border: 'none',
                borderRadius: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                fontWeight: '600',
                boxShadow: isLoading ? '0 2px 8px rgba(0,0,0,0.05)' : '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)' } }}
              onMouseLeave={(e) => { if (!isLoading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' } }}
            >
              {isTxPending ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '18px', height: '18px', border: '2px solid #e5e7eb', borderTop: '2px solid #9ca3af', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Waiting for confirmation...
                </div>
              ) : isClaiming ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '18px', height: '18px', border: '2px solid #e5e7eb', borderTop: '2px solid #9ca3af', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  Claiming...
                </div>
              ) : (
                'Claim Onchain Airdrop'
              )}
            </button>
          ) : (
            <></>
          )}
        </div>
      </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            style={{ background: 'white', borderRadius: '20px', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', position: 'relative' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowVerifyModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#9ca3af', padding: '0.25rem', lineHeight: 1 }}>×</button>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <img src="/base-verify-icon.png" alt="Base Verify" style={{ width: '80px', height: '80px' }} />
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 1rem 0', textAlign: 'center' }}>
              Verify Your Coinbase Account
            </h3>
            <p style={{ fontSize: '1rem', color: '#666', margin: '0 0 1.5rem 0', textAlign: 'center', lineHeight: '1.5' }}>
              To claim this airdrop, you need a verified Coinbase account.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={async () => { setShowVerifyModal(false); await executeRedirectToVerifyWebApp() }}
                style={{ width: '100%', padding: '0.875rem 1.5rem', background: '#0052FF', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', boxShadow: '0 4px 12px rgba(0,82,255,0.3)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#0045DD' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#0052FF' }}
              >
                Continue to Base Verify
              </button>
              <button
                onClick={() => setShowVerifyModal(false)}
                style={{ width: '100%', padding: '0.875rem 1.5rem', background: 'transparent', color: '#666', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </Layout>
  )
}

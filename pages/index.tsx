import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useAccount, useSignMessage } from 'wagmi'
import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import prisma from '../lib/prisma'
import { WalletComponent } from '../components/Wallet'
import { generateSignature } from '../lib/signature-generator'
import { verifySignatureCache } from '../lib/signatureCache'
import { config } from '../lib/config'
import { useMiniKit } from "@coinbase/onchainkit/minikit";

type VerifiedUser = {
  id: string
  address: string
  xUserId: string
  xUsername: string
  xFollowers: number
  createdAt: string
  updatedAt: string
}

type Props = {
  users: VerifiedUser[]
  error?: string
}

// Function to handle URL redirects in mini app and regular browser contexts
async function openUrl(url: string, isInMiniApp: boolean) {
  if (isInMiniApp) {
    await sdk.actions.openUrl({ url });
  } else {
    window.location.href = url;
  }
}

export default function Home({ users: initialUsers, error }: Props) {
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const [users, setUsers] = useState<VerifiedUser[]>(initialUsers)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [verificationError, setVerificationError] = useState<string>('')
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const { setFrameReady, isFrameReady } = useMiniKit();

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Clear cache when address changes
  useEffect(() => {
    if (address) {
      // Check if cached signature is for a different address
      const cachedSignature = verifySignatureCache.get();
      if (cachedSignature && cachedSignature.address.toLowerCase() !== address.toLowerCase()) {
        verifySignatureCache.clear();
      }
    }
  }, [address])

  // Update users state when props change
  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  // Initialize SDK and detect mini app context
  useEffect(() => {
    sdk
      .isInMiniApp()
      .then((isInMiniAppResult) => {
        setIsInMiniApp(isInMiniAppResult);
        console.log('Mini app context detected:', isInMiniAppResult);
      })
      .catch((error) => {
        console.log('Not running in mini app context:', error);
        setIsInMiniApp(false);
      });
  }, [])

  // Function to fetch updated users from API
  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const updatedUsers = await response.json()
        setUsers(updatedUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const redirectToVerifyMiniApp = async () => {
    // Build URL with query parameters for GET redirect
    const params = new URLSearchParams({
      redirect_uri: config.appUrl,
      providers: 'x',
      state: `verify-${Date.now()}`
    });

    // Redirect to base verify mini app with GET request using the appropriate method
    const url = `${config.baseVerifyMiniAppUrl}?${params.toString()}`;
    await openUrl(url, isInMiniApp);
  }

  const handleVerify = async () => {
    if (!address || !signMessage) {
      setVerificationError('Please connect your wallet first')
      return
    }

    setIsVerifying(true)
    setVerificationError('')
    setVerificationResult(null)

    try {
      let signature;
      
      // Check for cached signature first
      const cachedSignature = verifySignatureCache.get();
      if (cachedSignature && verifySignatureCache.isValidForAddress(address, 'base_verify_token')) {
        console.log('Using cached signature');
        signature = cachedSignature;
      } else {
        console.log('Generating new signature');
        console.log('sdk.isInMiniApp()', sdk.isInMiniApp())
        // Generate SIWE signature for base_verify_token
        signature = await generateSignature({
          action: 'base_verify_token',
          provider: 'x',
          traits: { 'x': 'true' },
          signMessageFunction: async (message: string) => {
            return new Promise<string>((resolve, reject) => {
              signMessage(
                { message },
                {
                  onSuccess: (signature) => resolve(signature),
                  onError: (error) => reject(error)
                }
              )
            })
          },
          address: address,
          disclosures: true
        });
        
        // Cache the newly generated signature
        verifySignatureCache.set(signature);
      }

      // Call our API endpoint to verify with base_verify_token
      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signature.signature,
          message: signature.message
        })
      })

      if (response.ok) {
        const data = await response.json()
        setVerificationResult(data.verification)
        console.log('Verification successful:', data)
        
        // Fetch updated users list from API
        await fetchUsers()
      } else {
        const errorData = await response.json()
        
        // If verification not found (404), redirect to base verify mini app
        if (response.status === 404) {
          console.log('Verification not found, redirecting to base verify mini app...')
          await redirectToVerifyMiniApp()
        } else {
          // Clear cache on verification failure (might be invalid signature)
          verifySignatureCache.clear();
          setVerificationError(errorData.error || 'Verification failed')
        }
      }
    } catch (err) {
      console.error('Verification error:', err)
      // Clear cache on error (might be signature issue)
      verifySignatureCache.clear();
      setVerificationError(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <>
      <Head>
        <title>Verified X Users</title>
        <meta name="description" content="Simple app to track verified X users" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Verified X Users</h1>
            <p>Total verified users: {users.length}</p>
          </div>
          <WalletComponent />
        </div>
        
        {isConnected && address && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #0070f3' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0070f3' }}>Connected Wallet</h3>
            <p style={{ margin: '0 0 1rem 0', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: isVerifying ? '#ccc' : '#0070f3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isVerifying ? 'not-allowed' : 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {isVerifying ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        )}

        {verificationResult && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0fff0', borderRadius: '8px', border: '1px solid #00aa00' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#00aa00' }}>Verification Success</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Token: {verificationResult.token?.substring(0, 20)}...
            </p>
            {verificationResult.traits && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
                <strong>Traits:</strong> {JSON.stringify(verificationResult.traits, null, 2)}
              </div>
            )}
          </div>
        )}

        {verificationError && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff0f0', borderRadius: '8px', border: '1px solid #ff4444' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff4444' }}>Verification Error</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              {verificationError}
            </p>
          </div>
        )}
        
        {error && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#fff0f0', borderRadius: '8px', border: '1px solid #ff4444' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#ff4444' }}>Database Error</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              {error}
            </p>
            <small style={{ color: '#888' }}>
              Please check your database configuration and environment variables.
            </small>
          </div>
        )}
        
        {users.length === 0 && !error ? (
          <p>No verified users found.</p>
        ) : (
          <div>
            {users.map((user) => (
              <div 
                key={user.id} 
                style={{ 
                  border: '1px solid #ccc', 
                  padding: '1rem', 
                  margin: '1rem 0',
                  borderRadius: '8px'
                }}
              >
                <h3>@{user.xUsername}</h3>
                <p>Wallet: {user.address.slice(0, 6)}...{user.address.slice(-4)}</p>
                <p>X User ID: {user.xUserId}</p>
                <p>Followers: {user.xFollowers.toLocaleString()}</p>
                <small>Added: {new Date(user.createdAt).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // Check if database connection works
    await prisma.$connect()
    
    const users = await prisma.verifiedUser.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return {
      props: {
        users: JSON.parse(JSON.stringify(users))
      }
    }
  } catch (error) {
    console.error('Database error:', error)
    
    // Return props with error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Database connection failed'
    return {
      props: {
        users: [],
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Database connection failed'
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

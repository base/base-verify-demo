import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
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
    await sdk.actions.openMiniApp({ url });
  } else {
    window.location.href = url;
  }
}

export default function Home({ users: initialUsers, error }: Props) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const [users, setUsers] = useState<VerifiedUser[]>(initialUsers)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [verificationError, setVerificationError] = useState<string>('')
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const [isAutoVerification, setIsAutoVerification] = useState(false)
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

  // Auto-verify when returning from verification with success=true
  useEffect(() => {
    const { success } = router.query;
    
    if (success === 'true' && address && isConnected && !isVerifying && !verificationResult) {
      console.log('Auto-verifying after successful redirect...');
      setIsAutoVerification(true);
      handleVerify(true);
      
      // Clean up the URL to remove the success parameter
      const { success: _, ...cleanQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: cleanQuery
      }, undefined, { shallow: true });
    }
  }, [router.query, address, isConnected, isVerifying, verificationResult])

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
      redirect_uri: `${config.appUrl}?success=true`,
      providers: 'x',
      state: `verify-${Date.now()}`
    });

    // Redirect to base verify mini app with GET request using the appropriate method
    const url = `${config.baseVerifyMiniAppUrl}?${params.toString()}`;
    await openUrl(url, isInMiniApp);
  }

  const handleVerify = async (isAutoVerifyFromSuccess = false) => {
    if (!address || !signMessage) {
      setVerificationError('Please connect your wallet to claim')
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
        setVerificationResult(data)
        console.log('Verification successful:', data)
        
        // Reset auto-verification flag on success
        setIsAutoVerification(false)
        
        // Fetch updated users list from API
        await fetchUsers()
      } else {
        const errorData = await response.json()
        
        // If verification not found (404), handle based on context
        if (response.status === 404) {
          if (isAutoVerifyFromSuccess) {
            // Show error message for auto-verification from success URL
            setVerificationError('Sorry, your X account isn\'t verified. You are not eligible for this airdrop.')
            setIsAutoVerification(false); // Reset the flag
          } else {
            // Normal 404 handling - redirect to base verify mini app
            console.log('Verification not found, redirecting to base verify mini app...')
            setIsAutoVerification(false) // Reset flag
            await redirectToVerifyMiniApp()
          }
        } else {
          // Clear cache on verification failure (might be invalid signature)
          verifySignatureCache.clear();
          setVerificationError(errorData.error || 'Verification failed')
          setIsAutoVerification(false) // Reset flag
        }
      }
    } catch (err) {
      console.error('Verification error:', err)
      // Clear cache on error (might be signature issue)
      verifySignatureCache.clear();
      setVerificationError(err instanceof Error ? err.message : 'Verification failed')
      setIsAutoVerification(false) // Reset flag on error
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <>
      <Head>
        <title>Claim Your Airdrop</title>
        <meta name="description" content="Claim your exclusive airdrop tokens" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        {/* Header */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          padding: '0.75rem 0',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '28px',
                height: '28px',
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1rem'
              }}>
                🎁
              </div>
              <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 4vw, 1.3rem)', fontWeight: '600', color: '#1a1a1a' }}>Airdrop Portal</h1>
            </div>
            <WalletComponent />
          </div>
        </div>

        {/* Main Content */}
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
          {/* Hero Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{
              fontSize: 'clamp(2rem, 8vw, 2.8rem)',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 0.75rem 0',
              textShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              lineHeight: '1.1'
            }}>
              Claim Your Exclusive Airdrop
            </h2>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '0 0 1.5rem 0',
              maxWidth: '400px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: '1.4'
            }}>
              Limited to X verified users only.
            </p>

            {verificationResult && (
              <div style={{
                background: 'rgba(34, 197, 94, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 8px 32px rgba(34, 197, 94, 0.2)',
                maxWidth: '320px',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: '1.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>✅</span>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  color: 'white',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                }}>
                  Claimed Successfully!
                </span>
              </div>
            )}

            {verificationError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '0.75rem 1rem',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 8px 32px rgba(239, 68, 68, 0.2)',
                maxWidth: '350px',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: '1.5rem'
              }}>
                <span style={{ fontSize: '1.2rem' }}>❌</span>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: 'white',
                  textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                  textAlign: 'center',
                  lineHeight: '1.3'
                }}>
                  {verificationError}
                </span>
              </div>
            )}

          </div>
        
        {/* Claim Section */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem'
        }}>
          {isConnected && address ? (
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              maxWidth: '400px',
              width: '100%'
            }}>
              <div style={{
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 0.75rem',
                  fontSize: '1.3rem'
                }}>
                  💎
                </div>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  Wallet Connected
                </h3>
                <p style={{
                  margin: '0 0 1rem 0',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#666',
                  background: '#f8f9fa',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
              
              <button
                onClick={() => {
                  setIsAutoVerification(false);
                  handleVerify(false);
                }}
                disabled={isVerifying}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: isVerifying 
                    ? 'linear-gradient(45deg, #ccc, #999)' 
                    : 'linear-gradient(45deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: isVerifying 
                    ? 'none' 
                    : '0 8px 25px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  transform: isVerifying ? 'none' : 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!isVerifying) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isVerifying) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {isVerifying ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Claiming...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    🚀 Claim Airdrop
                  </div>
                )}
              </button>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px',
              padding: '1.5rem',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
              textAlign: 'center',
              maxWidth: '400px',
              width: '100%'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(45deg, #ff9a9e, #fecfef)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem',
                fontSize: '1.3rem'
              }}>
                🔗
              </div>
              <h3 style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.2rem',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                Connect Wallet to Claim
              </h3>
              <p style={{
                margin: '0',
                color: '#666',
                lineHeight: '1.4',
                fontSize: '0.9rem'
              }}>
                Connect your wallet using the button above to claim your airdrop.
              </p>
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            display: 'inline-block',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.25rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🏆</span>
              <span style={{ fontSize: '1rem', fontWeight: '600', color: 'white' }}>Total Claims</span>
            </div>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#FFD700',
              textShadow: '0 2px 10px rgba(255, 215, 0, 0.3)'
            }}>
              {users.length.toLocaleString()}
            </div>
          </div>
        </div>

        
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '16px',
            padding: '1.25rem',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(239, 68, 68, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(45deg, #f59e0b, #d97706)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>
                ⚠️
              </div>
              <h3 style={{
                margin: '0',
                fontSize: '1.2rem',
                fontWeight: '600',
                color: '#ffffff'
              }}>
                Database Error
              </h3>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <p style={{
                margin: '0 0 0.5rem 0',
                fontSize: '0.9rem',
                color: '#374151',
                lineHeight: '1.4'
              }}>
                {error}
              </p>
              <small style={{
                color: '#6b7280',
                fontSize: '0.8rem',
                fontStyle: 'italic'
              }}>
                Check database configuration.
              </small>
            </div>
          </div>
        )}
        
        {/* Claims History */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '1.25rem',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(45deg, #8b5cf6, #a855f7)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem'
            }}>
              📊
            </div>
            <h3 style={{
              margin: '0',
              fontSize: '1.2rem',
              fontWeight: '600',
              color: '#1a1a1a'
            }}>
              Recent Claims
            </h3>
          </div>
          
          {users.length === 0 && !error ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
              color: '#6b7280'
            }}>
              <div style={{
                fontSize: '2rem',
                marginBottom: '0.75rem'
              }}>
                👥
              </div>
              <p style={{
                fontSize: '1rem',
                fontWeight: '500',
                margin: '0 0 0.25rem 0'
              }}>
                No claims yet
              </p>
              <p style={{
                fontSize: '0.85rem',
                margin: '0',
                color: '#9ca3af'
              }}>
                Be the first to claim!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: '0.75rem',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {users.map((user, index) => (
                <div 
                  key={user.id} 
                  style={{ 
                    background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                    border: '1px solid #e2e8f0',
                    padding: '0.875rem', 
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    background: `linear-gradient(45deg, ${
                      ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'][index % 6]
                    }, ${
                      ['#764ba2', '#667eea', '#f5576c', '#f093fb', '#00f2fe', '#4facfe'][index % 6]
                    })`,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    flexShrink: 0
                  }}>
                    💎
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: 'monospace',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '0.125rem'
                    }}>
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: '#6b7280',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      <span>🕒</span>
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  
                  <div style={{
                    background: 'rgba(34, 197, 94, 0.1)',
                    color: '#16a34a',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: '600',
                    border: '1px solid rgba(34, 197, 94, 0.2)'
                  }}>
                    ✓
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div style={{
          textAlign: 'center',
          paddingTop: '1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '0.8rem',
            margin: '0'
          }}>
            Powered by Base • Secured by blockchain
          </p>
        </div>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 768px) {
          body {
            font-size: 14px;
          }
        }
        
        @media (max-width: 480px) {
          body {
            font-size: 13px;
          }
        }
      `}</style>
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

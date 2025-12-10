import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { useAccount, useSignMessage } from 'wagmi'
import { useState, useEffect } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'
import prisma from '../lib/prisma'
import { Layout } from '../components/Layout'
import { generateSignature } from '../lib/signature-generator'
import { verifySignatureCache } from '../lib/signatureCache'
import { config } from '../lib/config'
import { useMiniKit } from "@coinbase/onchainkit/minikit"
import { useMiniAppContext } from '../components/MiniAppGuard'
import { useToast } from '../components/ToastProvider'
import { useOpenUrl } from '@coinbase/onchainkit/minikit';

type VerifiedUser = {
  id: string
  address: string
  createdAt: string
  updatedAt: string
}

type Props = {
  initialUsers: VerifiedUser[]
  error?: string
}

export default function Home({ initialUsers, error }: Props) {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const [users, setUsers] = useState<VerifiedUser[]>(initialUsers)
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationResult, setVerificationResult] = useState<any>(null)
  const [verificationError, setVerificationError] = useState<string>('')
  const miniAppContext = useMiniAppContext()
  const { isInMiniApp } = miniAppContext
  const [isAutoVerification, setIsAutoVerification] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string>('')
  const [showVerifyModal, setShowVerifyModal] = useState(false)
  const openUrl = useOpenUrl();
  const { setFrameReady, isFrameReady } = useMiniKit();
  const { showToast } = useToast();

  // Log MiniApp context
  useEffect(() => {
    console.log('MiniApp Context:', miniAppContext);
  }, [miniAppContext]);

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady();
    }
  }, [setFrameReady, isFrameReady]);

  // Clear cache when address changes or if cached signature is for wrong provider
  useEffect(() => {
    if (address) {
      // Check if cached signature is for a different address or wrong provider
      const cachedSignature = verifySignatureCache.get();
      if (cachedSignature) {
        // Clear if address doesn't match
        if (cachedSignature.address.toLowerCase() !== address.toLowerCase()) {
          verifySignatureCache.clear();
        }
        // Clear if cached signature is for wrong provider (not x)
        else if (!cachedSignature.message.includes('urn:verify:provider:x')) {
          console.log('Clearing cache - signature is for different provider');
          verifySignatureCache.clear();
        }
      }
    }
  }, [address])

  // Auto-verify when returning from verification with success=true
  useEffect(() => {
    const { success, code, state } = router.query;

    if (success === 'true' && address && isConnected && !isVerifying && !verificationResult) {
      console.log('Auto-verifying after successful redirect...');
      setIsAutoVerification(true);
      handleVerify(true);

      // Clean up the URL to remove the success parameter
      const { success: _, code: __, state: ___, ...cleanQuery } = router.query;
      router.replace({
        pathname: router.pathname,
        query: cleanQuery
      }, undefined, { shallow: true });
    }
  }, [router.query, address, isConnected, isVerifying, verificationResult])

  // Function to fetch updated users from API
  const fetchUsers = async () => {
    try {
      // Add cache-busting and debug logging
      const timestamp = Date.now()
      const response = await fetch(`/api/users?_=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const updatedUsers = await response.json()
        console.log('Fetched users count:', updatedUsers.length) // Debug
        setUsers(updatedUsers)
        return updatedUsers.length
      } else {
        console.error('Failed to fetch users:', response.status)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // Check if current wallet is verified
  const isCurrentUserVerified = () => {
    if (!address) return false
    return users.some(user => user.address.toLowerCase() === address.toLowerCase())
  }

  const handleDelete = async () => {
    if (!address || !signMessage) {
      setDeleteError('Please connect your wallet to delete')
      return
    }

    if (!isCurrentUserVerified()) {
      setDeleteError('You are not in the verified users list')
      return
    }

    setIsDeleting(true)
    setDeleteError('')

    try {
      // Create the delete message
      const deleteMessage = `Delete airdrop for ${address}`

      // Sign the message directly with the wallet
      const signature = await new Promise<string>((resolve, reject) => {
        signMessage(
          { message: deleteMessage },
          {
            onSuccess: (signature) => resolve(signature),
            onError: (error) => reject(error)
          }
        )
      })

      // Call our delete API endpoint
      const response = await fetch('/api/delete-airdrop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          signature: signature,
          message: deleteMessage
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Delete successful:', data)

        // Fetch updated users to reflect the deletion
        await fetchUsers()

        // Clear verification result since user is no longer verified
        setVerificationResult(null)

        // Show success toast
        showToast('Airdrop deleted successfully', 'success')
      } else {
        const errorData = await response.json()
        setDeleteError(errorData.error || 'Failed to delete airdrop')
      }
    } catch (err) {
      console.error('Delete error:', err)

      // Don't show error message if user rejected the signature
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete airdrop'
      if (!errorMessage.toLowerCase().includes('user rejected') &&
        !errorMessage.toLowerCase().includes('user denied') &&
        !errorMessage.toLowerCase().includes('rejected')) {
        setDeleteError(errorMessage)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const generateCodeVerifier = () => {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const generateCodeChallenge = async (verifier: string) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(digest))))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  const executeRedirectToVerifyMiniApp = async () => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = `verify-${Date.now()}`;

    sessionStorage.setItem('pkce_code_verifier', codeVerifier);
    sessionStorage.setItem('pkce_state', state);

    const params = new URLSearchParams({
      redirect_uri: `cbwallet://miniapp?url=${config.appUrl}?success=true`,
      providers: 'x',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    const baseVerifyMiniAppUrl = `${config.baseVerifyMiniAppUrl}?${params.toString()}`;
    const url = `cbwallet://miniapp?url=${encodeURIComponent(baseVerifyMiniAppUrl)}`;
    openUrl(url);
  }

  const redirectToVerifyMiniApp = async () => {
    setShowVerifyModal(true);
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
      if (cachedSignature && verifySignatureCache.isValidForAddress(address, 'claim_demo_x_airdrop', 'x')) {
        console.log('Using cached signature');
        signature = cachedSignature;
      } else {
        console.log('Generating new signature');
        console.log('sdk.isInMiniApp()', sdk.isInMiniApp())
        // Generate SIWE signature for base_verify_token
        signature = await generateSignature({
          action: 'claim_demo_x_airdrop',
          provider: 'x',
          traits: { 'verified': 'true' },
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

      const { code, state } = router.query;
      const storedCodeVerifier = sessionStorage.getItem('pkce_code_verifier');
      const storedState = sessionStorage.getItem('pkce_state');

      const requestBody: any = {
        signature: signature.signature,
        message: signature.message
      };

      if (code && storedCodeVerifier && state && storedState && state === storedState) {
        requestBody.code = code;
        requestBody.codeVerifier = storedCodeVerifier;
      }

      const response = await fetch('/api/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const data = await response.json()
        setVerificationResult(data)
        console.log('Verification successful:', data)

        // Reset auto-verification flag on success
        setIsAutoVerification(false)

        sessionStorage.removeItem('pkce_code_verifier');
        sessionStorage.removeItem('pkce_state');

        // Fetch updated users to reflect the new claim
        const newCount = await fetchUsers()
        console.log('📊 Updated count after claim:', newCount)
        
        // Show success toast
        showToast('Airdrop claimed successfully!', 'success')
      } else {
        const errorData = await response.json()

        // Handle 400 with traits not satisfied - Twitter account not verified
        if (response.status === 400 && errorData.message === 'verification_traits_not_satisfied') {
          setVerificationError('Sorry, your X account does not have a blue checkmark. You are not eligible for this airdrop.')
          setIsAutoVerification(false) // Reset flag
        }
        // If verification not found (404), handle based on context
        else if (response.status === 404) {
          if (isAutoVerifyFromSuccess) {
            // Show error message for auto-verification from success URL
            setVerificationError('Sorry, your X account does have have a blue checkmark. You are not eligible for this airdrop.')
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

      // Don't show error message if user rejected the signature
      const errorMessage = err instanceof Error ? err.message : 'Verification failed'
      if (!errorMessage.toLowerCase().includes('user rejected') &&
        !errorMessage.toLowerCase().includes('user denied') &&
        !errorMessage.toLowerCase().includes('rejected')) {
        setVerificationError(errorMessage)
      }
      setIsAutoVerification(false) // Reset flag on error
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Layout title="Base Verify Demo">
      <Head>
        <title>claim your airdrop</title>
        <meta name="description" content="Claim your exclusive airdrop tokens" />
        <link rel="icon" href="/favicon.ico" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      
      <div>
          {/* Hero Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: '1.25rem'
          }}>
            <h2 style={{
              fontSize: 'clamp(1.75rem, 7vw, 2.5rem)',
              fontWeight: '700',
              color: '#1a1a1a',
              margin: '0 0 0.5rem 0',
              lineHeight: '1.1'
            }}>
              claim your airdrop
            </h2>
            <p style={{
              fontSize: '0.9rem',
              color: '#666',
              margin: '0 0 1.25rem 0',
              maxWidth: '320px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: '1.3'
            }}>
              Limited to X Blue Checkmark users only. Only one claim per X account.
            </p>

            {verificationError && (
              <div style={{
                background: '#fef2f2',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
                maxWidth: '400px',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: '1.5rem'
              }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#991b1b',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  {verificationError}
                </span>
              </div>
            )}

            {deleteError && (
              <div style={{
                background: '#fef2f2',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid #fecaca',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.08)',
                maxWidth: '400px',
                marginLeft: 'auto',
                marginRight: 'auto',
                marginBottom: '1.5rem'
              }}>
                <span style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  color: '#991b1b',
                  textAlign: 'center',
                  lineHeight: '1.4'
                }}>
                  {deleteError}
                </span>
              </div>
            )}

            {/* Delete Button - Only show if user is verified and connected */}
            {isConnected && address && isCurrentUserVerified() && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '1.25rem'
              }}>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: isDeleting ? '#fef2f2' : 'white',
                    color: isDeleting ? '#9ca3af' : '#dc2626',
                    border: isDeleting ? '1px solid #fee2e2' : '1px solid #dc2626',
                    borderRadius: '12px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    boxShadow: isDeleting
                      ? 'none'
                      : '0 2px 8px rgba(220, 38, 38, 0.1)',
                    transition: 'all 0.2s ease',
                    transform: isDeleting ? 'none' : 'translateY(0)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) {
                      e.currentTarget.style.background = '#fef2f2';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleting) {
                      e.currentTarget.style.background = 'white';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(220, 38, 38, 0.1)';
                    }
                  }}
                >
                  {isDeleting ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid #e5e7eb',
                        borderTop: '2px solid #9ca3af',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      Deleting...
                    </div>
                  ) : (
                    'Delete My Airdrop'
                  )}
                </button>
              </div>
            )}

          </div>

          {/* Claim Section */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1.25rem'
          }}>
            {isConnected && address && !isCurrentUserVerified() ? (
              <button
                onClick={() => {
                  setIsAutoVerification(false);
                  handleVerify(false);
                }}
                disabled={isVerifying}
                style={{
                  padding: '0.875rem 1.5rem',
                  background: isVerifying ? '#f3f4f6' : 'white',
                  color: isVerifying ? '#9ca3af' : '#1a1a1a',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: isVerifying ? 'not-allowed' : 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: isVerifying
                    ? '0 2px 8px rgba(0, 0, 0, 0.05)'
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.3s ease',
                  transform: isVerifying ? 'none' : 'translateY(0)',
                }}
                onMouseEnter={(e) => {
                  if (!isVerifying) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isVerifying) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                  }
                }}
              >
                {isVerifying ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid #e5e7eb',
                      borderTop: '2px solid #9ca3af',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Claiming...
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    Claim Airdrop
                  </div>
                )}
              </button>
            ) : (
              <></>
            )}
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
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            borderRadius: '16px',
            padding: '1rem',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
            marginBottom: '1.25rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              marginBottom: '0.75rem'
            }}>
              <h3 style={{
                margin: '0',
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1a1a1a'
              }}>
                Recent Claims
              </h3>
            </div>

            {users.length === 0 && !error ? (
              <div style={{
                textAlign: 'center',
                padding: '1.5rem 1rem',
                color: '#6b7280'
              }}>
                <p style={{
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  margin: '0 0 0.125rem 0',
                  color: '#4b5563'
                }}>
                  No claims yet
                </p>
                <p style={{
                  fontSize: '0.75rem',
                  margin: '0',
                  color: '#9ca3af'
                }}>
                  Be the first!
                </p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gap: '0.5rem'
              }}>
                {users.slice(0, 20).map((user, index) => (
                  <div
                    key={user.id}
                    style={{
                      background: 'rgba(248, 250, 252, 0.8)',
                      border: '1px solid rgba(226, 232, 240, 0.6)',
                      padding: '0.625rem',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(248, 250, 252, 1)';
                      e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(248, 250, 252, 0.8)';
                      e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.6)';
                    }}
                  >

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#374151',
                        marginBottom: '0.0625rem'
                      }}>
                        {user.address.slice(0, 6)}...{user.address.slice(-4)}
                      </div>
                      <div style={{
                        fontSize: '0.625rem',
                        color: '#9ca3af',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <span style={{ fontSize: '0.5rem' }}>🕒</span>
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })} {new Date(user.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </div>
                    </div>

                    <div style={{
                      width: '16px',
                      height: '16px',
                      background: 'rgba(34, 197, 94, 0.15)',
                      color: '#16a34a',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.5rem',
                      fontWeight: '700',
                      border: '1px solid rgba(34, 197, 94, 0.3)'
                    }}>
                      ✓
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowVerifyModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '2rem',
              maxWidth: '400px',
              width: '100%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowVerifyModal(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'transparent',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#9ca3af',
                padding: '0.25rem',
                lineHeight: 1
              }}
            >
              ×
            </button>

            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <img
                src="/base-verify-icon.png"
                alt="Base Verify"
                style={{
                  width: '80px',
                  height: '80px'
                }}
              />
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#1a1a1a',
              margin: '0 0 1rem 0',
              textAlign: 'center'
            }}>
              Verify Your X Account
            </h3>

            {/* Description */}
            <p style={{
              fontSize: '1rem',
              color: '#666',
              margin: '0 0 1.5rem 0',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              To claim this airdrop, you need to verify your X account has a blue checkmark using Base Verify.
            </p>

            {/* Actions */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <button
                onClick={async () => {
                  setShowVerifyModal(false);
                  await executeRedirectToVerifyMiniApp();
                }}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: '#0052FF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(0, 82, 255, 0.3)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#0045DD';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 82, 255, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#0052FF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
                }}
              >
                Continue to Base Verify
              </button>

              <button
                onClick={() => setShowVerifyModal(false)}
                style={{
                  width: '100%',
                  padding: '0.875rem 1.5rem',
                  background: 'transparent',
                  color: '#666',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
    </Layout>
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
        initialUsers: JSON.parse(JSON.stringify(users))
      }
    }
  } catch (error) {
    console.error('Database error:', error)

    // Return props with error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Database connection failed'
    return {
      props: {
        initialUsers: [],
        error: process.env.NODE_ENV === 'development' ? errorMessage : 'Database connection failed'
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

import Head from 'next/head'
import { useAccount, useSignMessage } from 'wagmi'
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { generateSignature } from '../lib/signature-generator'
import { config } from '../lib/config'

export default function Examples() {
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const [isChecking, setIsChecking] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [requestDetails, setRequestDetails] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const checkFollowers = async () => {
    if (!address || !signMessage) {
      setError('Please connect your wallet first')
      return
    }

    if (!config.baseVerifyPublisherKey) {
      setError('Publisher key not configured. Please add NEXT_PUBLIC_BASE_VERIFY_PUBLISHER_KEY to your .env.local file')
      return
    }

    setIsChecking(true)
    setError('')
    setResponse(null)
    setRequestDetails(null)

    try {
      // Generate SIWE signature with followers > 100 trait
      const signature = await generateSignature({
        action: 'base_verify_token',
        provider: 'x',
        traits: { 'followers': 'gt:100' },
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
      })

      console.log('Generated signature:', signature)

      // Call Base Verify API directly with publisher key
      const apiUrl = `${config.baseVerifyApiUrl}/base_verify_token`
      const requestBody = {
        message: signature.message,
        signature: signature.signature,
      }

      // Store request details for display
      setRequestDetails({
        method: 'POST',
        url: apiUrl,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.baseVerifyPublisherKey?.substring(0, 20)}...`,
        },
        body: requestBody,
      })

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.baseVerifyPublisherKey}`,
        },
        body: JSON.stringify(requestBody)
      })

      const responseData = await apiResponse.json()

      // Store response with status code
      setResponse({
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        data: responseData,
        ok: apiResponse.ok,
      })

      console.log('API Response:', {
        status: apiResponse.status,
        data: responseData,
      })

    } catch (err: any) {
      console.error('Error checking followers:', err)
      setError(err.message || 'Failed to check followers')
    } finally {
      setIsChecking(false)
    }
  }

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return '#10b981'
    if (status >= 400 && status < 500) return '#f59e0b'
    return '#ef4444'
  }

  const getStatusBgColor = (status: number) => {
    if (status >= 200 && status < 300) return '#d1fae5'
    if (status >= 400 && status < 500) return '#fef3c7'
    return '#fee2e2'
  }

  return (
    <>
      <Head>
        <title>Base Verify API Examples</title>
        <meta name="description" content="Base Verify API Examples" />
      </Head>

      <Layout>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111' }}>
              Base Verify API Examples
            </h1>
            <p style={{ fontSize: '1.125rem', color: '#6b7280' }}>
              Interactive API documentation with live requests and responses
            </p>
          </div>

          {/* Example Card */}
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem', border: '1px solid #e5e7eb' }}>
            {/* Example Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ 
                  background: '#3b82f6', 
                  color: 'white', 
                  padding: '0.25rem 0.75rem', 
                  borderRadius: '6px', 
                  fontSize: '0.75rem', 
                  fontWeight: '600',
                  fontFamily: 'monospace'
                }}>
                  POST
                </span>
                <code style={{ fontSize: '0.875rem', color: '#111', fontFamily: 'monospace' }}>
                  /v1/base_verify_token
                </code>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111' }}>
                Check X (Twitter) Followers &gt; 100
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                Verify that a connected wallet has linked an X account with more than 100 followers
              </p>
            </div>

            {/* Configuration */}
            <div style={{ padding: '1.5rem', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.75rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Request Configuration
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Provider</div>
                  <code style={{ fontSize: '0.875rem', color: '#111', fontFamily: 'monospace' }}>x</code>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Trait</div>
                  <code style={{ fontSize: '0.875rem', color: '#111', fontFamily: 'monospace' }}>followers:gt:100</code>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Authentication</div>
                  <code style={{ fontSize: '0.875rem', color: '#111', fontFamily: 'monospace' }}>Publisher Key</code>
                </div>
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
              {isConnected ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></div>
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Connected Wallet:</span>
                  <code style={{ fontSize: '0.875rem', color: '#111', fontFamily: 'monospace', fontWeight: '500' }}>
                    {address}
                  </code>
                </div>
              ) : (
                <div style={{ padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                  <p style={{ color: '#92400e', fontSize: '0.875rem', margin: 0 }}>
                    Connect your wallet to test this API endpoint
                  </p>
                </div>
              )}
              
              <button
                onClick={checkFollowers}
                disabled={!isConnected || isChecking}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  background: isConnected && !isChecking ? '#3b82f6' : '#9ca3af',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  cursor: isConnected && !isChecking ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (isConnected && !isChecking) {
                    e.currentTarget.style.background = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (isConnected && !isChecking) {
                    e.currentTarget.style.background = '#3b82f6';
                  }
                }}
              >
                {isChecking ? 'Making API Request...' : 'Execute API Request'}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div style={{ padding: '1.5rem', background: '#fee2e2', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.25rem' }}>⚠️</span>
                  <div>
                    <p style={{ fontWeight: '600', color: '#991b1b', margin: '0 0 0.25rem 0' }}>Error</p>
                    <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Request Display */}
            {requestDetails && (
              <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: '1rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📤 Request
                </h3>
                <div style={{ background: '#1f2937', borderRadius: '8px', padding: '1rem', overflow: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '0.8rem', color: '#e5e7eb', fontFamily: 'monospace', lineHeight: '1.6' }}>
{`${requestDetails.method} ${requestDetails.url}

Headers:
${Object.entries(requestDetails.headers).map(([key, value]) => `  ${key}: ${value}`).join('\n')}

Body:
${JSON.stringify(requestDetails.body, null, 2)}`}
                  </pre>
                </div>
              </div>
            )}

            {/* Response Display */}
            {response && (
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '0.875rem', fontWeight: '600', margin: 0, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📥 Response
                  </h3>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    background: getStatusBgColor(response.status),
                    border: `2px solid ${getStatusColor(response.status)}`
                  }}>
                    <span style={{ 
                      fontSize: '1.25rem', 
                      fontWeight: '700', 
                      color: getStatusColor(response.status),
                      fontFamily: 'monospace'
                    }}>
                      {response.status}
                    </span>
                    <span style={{ fontSize: '0.875rem', fontWeight: '600', color: getStatusColor(response.status) }}>
                      {response.statusText}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#1f2937', borderRadius: '8px', padding: '1rem', overflow: 'auto' }}>
                  <pre style={{ margin: 0, fontSize: '0.8rem', color: '#e5e7eb', fontFamily: 'monospace', lineHeight: '1.6' }}>
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>

                {/* Status Explanations */}
                {response.status === 200 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#d1fae5', borderRadius: '8px', border: '1px solid #10b981' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#065f46' }}>✅ Success</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#047857' }}>
                      User has verified their X account and has more than 100 followers. The returned token is unique to this X account and can be used for Sybil resistance.
                    </p>
                  </div>
                )}

                {response.status === 404 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#dbeafe', borderRadius: '8px', border: '1px solid #3b82f6' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#1e40af' }}>ℹ️ Verification Not Found</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e3a8a' }}>
                      This wallet has not verified an X account yet. Redirect the user to the Base Verify mini app to complete verification.
                    </p>
                  </div>
                )}

                {response.status === 412 && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontWeight: '600', color: '#92400e' }}>⚠️ Requirements Not Met</p>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#b45309' }}>
                      User has verified their X account, but they have fewer than 100 followers and do not meet the trait requirements.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem', color: '#111' }}>
              About This Example
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#6b7280', fontSize: '0.95rem', lineHeight: '1.75' }}>
              <li>Uses publisher key for client-side API calls (requires origin validation)</li>
              <li>Calls <code style={{ background: '#e5e7eb', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.875rem' }}>/v1/base_verify_token</code> endpoint directly</li>
              <li>Demonstrates checking for specific trait conditions (followers &gt; 100)</li>
              <li>Shows complete request and response for learning purposes</li>
              <li>Returns deterministic token for Sybil resistance on success</li>
            </ul>
          </div>
        </div>
      </Layout>
    </>
  )
}


import Head from 'next/head'
import { useAccount, useSignMessage } from 'wagmi'
import { useState } from 'react'
import { Layout } from '../components/Layout'
import { generateSignature } from '../lib/signature-generator'
import { config } from '../lib/config'

type ExampleScenario = {
  id: string
  name: string
  description: string
  provider: string
  traits: Record<string, string>
  endpoint: string
}

const EXAMPLE_SCENARIOS: ExampleScenario[] = [
  {
    id: 'x-followers-100',
    name: 'X Followers > 100',
    description: 'Verify X account with more than 100 followers',
    provider: 'x',
    traits: { 'followers': 'gt:100' },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'coinbase-europe',
    name: 'Coinbase One - Europe',
    description: 'Active Coinbase One subscriber in a European country',
    provider: 'coinbase',
    traits: { 
      'coinbase_one_active': 'true',
      'country': 'in:AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE'
    },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'coinbase-north-america',
    name: 'Coinbase One - North America',
    description: 'Active Coinbase One subscriber in North America (US, CA, MX)',
    provider: 'coinbase',
    traits: { 
      'coinbase_one_active': 'true',
      'country': 'in:US,CA,MX'
    },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'coinbase-billed-active',
    name: 'Coinbase One - Billed & Active',
    description: 'Coinbase One subscriber who has been billed and is currently active',
    provider: 'coinbase',
    traits: { 
      'coinbase_one_active': 'true',
      'coinbase_one_billed': 'true'
    },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'instagram-followers-100',
    name: 'Instagram Followers > 100',
    description: 'Verify Instagram account with more than 100 followers',
    provider: 'instagram',
    traits: { 'followers_count': 'gt:100' },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'tiktok-followers-1000',
    name: 'TikTok Followers > 1000',
    description: 'Verify TikTok account with more than 1000 followers',
    provider: 'tiktok',
    traits: { 'follower_count': 'gt:1000' },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'tiktok-likes-10000',
    name: 'TikTok Likes > 10,000',
    description: 'Verify TikTok account with more than 10,000 total likes',
    provider: 'tiktok',
    traits: { 'likes_count': 'gt:10000' },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'tiktok-videos-50',
    name: 'TikTok Videos > 50',
    description: 'Verify TikTok account with more than 50 videos posted',
    provider: 'tiktok',
    traits: { 'video_count': 'gt:50' },
    endpoint: '/v1/base_verify_token'
  },
  {
    id: 'tiktok-creator',
    name: 'TikTok Active Creator',
    description: 'TikTok creator with 5K+ followers, 100K+ likes, and 100+ videos',
    provider: 'tiktok',
    traits: { 
      'follower_count': 'gte:5000',
      'likes_count': 'gte:100000',
      'video_count': 'gte:100'
    },
    endpoint: '/v1/base_verify_token'
  }
]

export default function Examples() {
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const [selectedScenario, setSelectedScenario] = useState<ExampleScenario>(EXAMPLE_SCENARIOS[0])
  const [isChecking, setIsChecking] = useState(false)
  const [response, setResponse] = useState<any>(null)
  const [requestDetails, setRequestDetails] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const executeVerificationCheck = async () => {
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
      // Generate SIWE signature with selected scenario traits
      const signature = await generateSignature({
        action: 'base_verify_token',
        provider: selectedScenario.provider,
        traits: selectedScenario.traits,
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
      const apiUrl = `${config.baseVerifyApiUrl}${selectedScenario.endpoint}`
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
      console.error('Error checking verification:', err)
      setError(err.message || 'Failed to check verification')
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
          <div style={{ marginBottom: '1rem' }}>
            <h1 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '0.5rem', color: '#111' }}>
              Base Verify API Examples
            </h1>
          </div>

          {/* Scenario Selector */}
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem', border: '1px solid #e5e7eb', padding: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#374151' }}>
              Select Example Scenario
            </label>
            <select
              value={selectedScenario.id}
              onChange={(e) => {
                const scenario = EXAMPLE_SCENARIOS.find(s => s.id === e.target.value)
                if (scenario) {
                  setSelectedScenario(scenario)
                  setResponse(null)
                  setRequestDetails(null)
                  setError('')
                }
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '0.95rem',
                background: 'white',
                cursor: 'pointer',
                color: '#111'
              }}
            >
              {EXAMPLE_SCENARIOS.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </div>

          {/* Example Card */}
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem', border: '1px solid #e5e7eb' }}>
            {/* Example Header */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
                    <span style={{ 
                      background: '#3b82f6', 
                      color: 'white', 
                      padding: '0.25rem 0.625rem', 
                      borderRadius: '4px', 
                      fontSize: '0.7rem', 
                      fontWeight: '600',
                      fontFamily: 'monospace',
                      flexShrink: 0
                    }}>
                      POST
                    </span>
                    <code style={{ fontSize: '0.8rem', color: '#111', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {selectedScenario.endpoint}
                    </code>
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.375rem', color: '#111', lineHeight: '1.3' }}>
                    {selectedScenario.name}
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4' }}>
                    {selectedScenario.description}
                  </p>
                </div>
                
                {/* Execute Button */}
                <button
                  onClick={executeVerificationCheck}
                  disabled={!isConnected || isChecking}
                  style={{
                    flexShrink: 0,
                    background: isConnected && !isChecking ? '#3b82f6' : '#9ca3af',
                    color: 'white',
                    padding: '0.625rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isConnected && !isChecking ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    alignSelf: 'flex-start'
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
                  {isChecking ? 'Requesting...' : 'Execute'}
                </button>
              </div>

              {/* Compact Configuration */}
              <div style={{ 
                padding: '0.5rem 0.75rem', 
                background: '#f9fafb', 
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: '#6b7280',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
                lineHeight: '1.5'
              }}>
                <span style={{ color: '#111', fontWeight: '500' }}>{selectedScenario.provider}</span>
                {' · '}
                {Object.entries(selectedScenario.traits).map(([key, value], idx) => (
                  <span key={key}>
                    {idx > 0 && ', '}
                    <span style={{ color: '#111' }}>{key}:{value}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              {isConnected ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }}></div>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', whiteSpace: 'nowrap' }}>Connected Wallet:</span>
                  </div>
                  <code style={{ 
                    display: 'block',
                    fontSize: '0.75rem', 
                    color: '#111', 
                    fontFamily: 'monospace', 
                    fontWeight: '500',
                    wordBreak: 'break-all',
                    background: '#f3f4f6',
                    padding: '0.5rem',
                    borderRadius: '4px'
                  }}>
                    {address}
                  </code>
                </div>
              ) : (
                <div style={{ padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                  <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0 }}>
                    Connect your wallet to test this API endpoint
                  </p>
                </div>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div style={{ padding: '1rem', background: '#fee2e2', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>⚠️</span>
                  <div>
                    <p style={{ fontWeight: '600', color: '#991b1b', margin: '0 0 0.25rem 0', fontSize: '0.875rem' }}>Error</p>
                    <p style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Request Display */}
            {requestDetails && (
              <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  📤 Request
                </h3>
                <div style={{ background: '#1f2937', borderRadius: '6px', padding: '0.75rem', overflowX: 'auto' }}>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '0.7rem', 
                    color: '#e5e7eb', 
                    fontFamily: 'monospace', 
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
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
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '0.8rem', fontWeight: '600', margin: 0, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📥 Response
                  </h3>
                  <div style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.375rem',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '6px',
                    background: getStatusBgColor(response.status),
                    border: `2px solid ${getStatusColor(response.status)}`
                  }}>
                    <span style={{ 
                      fontSize: '1.125rem', 
                      fontWeight: '700', 
                      color: getStatusColor(response.status),
                      fontFamily: 'monospace'
                    }}>
                      {response.status}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: getStatusColor(response.status) }}>
                      {response.statusText}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#1f2937', borderRadius: '6px', padding: '0.75rem', overflowX: 'auto' }}>
                  <pre style={{ 
                    margin: 0, 
                    fontSize: '0.7rem', 
                    color: '#e5e7eb', 
                    fontFamily: 'monospace', 
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {JSON.stringify(response.data, null, 2)}
                  </pre>
                </div>

                {/* Status Explanations */}
                {response.status === 200 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', border: '1px solid #10b981' }}>
                    <p style={{ margin: '0 0 0.375rem 0', fontWeight: '600', color: '#065f46', fontSize: '0.875rem' }}>✅ Success</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857', lineHeight: '1.4' }}>
                      User has verified their {selectedScenario.provider} account and meets all trait requirements. The returned token is unique to this {selectedScenario.provider} account and can be used for Sybil resistance.
                    </p>
                  </div>
                )}

                {response.status === 404 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#dbeafe', borderRadius: '6px', border: '1px solid #3b82f6' }}>
                    <p style={{ margin: '0 0 0.375rem 0', fontWeight: '600', color: '#1e40af', fontSize: '0.875rem' }}>ℹ️ Verification Not Found</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                      This wallet has not verified a {selectedScenario.provider} account yet. Redirect the user to the Base Verify mini app to complete verification.
                    </p>
                  </div>
                )}

                {response.status === 412 && (
                  <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
                    <p style={{ margin: '0 0 0.375rem 0', fontWeight: '600', color: '#92400e', fontSize: '0.875rem' }}>⚠️ Requirements Not Met</p>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309', lineHeight: '1.4' }}>
                      User has verified their {selectedScenario.provider} account, but they do not meet the trait requirements specified in this scenario.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Box */}
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1rem' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '600', marginBottom: '0.5rem', color: '#111' }}>
              About These Examples
            </h3>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#6b7280', fontSize: '0.8rem', lineHeight: '1.6' }}>
              <li>Uses publisher key for client-side API calls (requires origin validation)</li>
              <li>Calls <code style={{ background: '#e5e7eb', padding: '0.125rem 0.375rem', borderRadius: '4px', fontSize: '0.75rem' }}>/v1/base_verify_token</code> endpoint directly</li>
              <li>Demonstrates multiple verification scenarios across different providers (X, Coinbase, Instagram, TikTok)</li>
              <li>Shows trait-based requirements like follower counts, geographic restrictions, and subscription status</li>
              <li>Displays complete request and response for learning purposes</li>
              <li>Returns deterministic token for Sybil resistance on success</li>
            </ul>
          </div>
        </div>
      </Layout>
    </>
  )
}


import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { GetStaticProps } from 'next';
import { readFileSync } from 'fs';
import { join } from 'path';
import Head from 'next/head';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { useAccount, useSignMessage } from 'wagmi';
import { generateSignature } from '../../lib/signature-generator';
import { config } from '../../lib/config';
import { Layout } from '../../components/Layout';

interface DocsPageProps {
  content: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

type ExampleScenario = {
  id: string
  name: string
  description: string
  provider: string
  traits: Record<string, string>
}

const EXAMPLE_SCENARIOS: ExampleScenario[] = [
  {
    id: 'x-followers-100',
    name: 'X Followers > 100',
    description: 'Verify X account with more than 100 followers',
    provider: 'x',
    traits: { 'followers': 'gt:100' }
  },
  {
    id: 'coinbase-europe',
    name: 'Coinbase One - Europe',
    description: 'Active Coinbase One subscriber in a European country',
    provider: 'coinbase',
    traits: { 
      'coinbase_one_active': 'true',
      'country': 'in:AT,BE,BG,HR,CY,CZ,DK,EE,FI,FR,DE,GR,HU,IE,IT,LV,LT,LU,MT,NL,PL,PT,RO,SK,SI,ES,SE'
    }
  },
  {
    id: 'coinbase-north-america',
    name: 'Coinbase One - North America',
    description: 'Active Coinbase One subscriber in North America (US, CA, MX)',
    provider: 'coinbase',
    traits: { 
      'coinbase_one_active': 'true',
      'country': 'in:US,CA,MX'
    }
  },
  {
    id: 'coinbase-billed-active',
    name: 'Coinbase One - Billed & Active',
    description: 'Coinbase One subscriber who has been billed and is currently active',
    provider: 'coinbase',
    traits: { 
      'coinbase_one_active': 'true',
      'coinbase_one_billed': 'true'
    }
  },
  {
    id: 'instagram-followers-100',
    name: 'Instagram Followers > 100',
    description: 'Verify Instagram account with more than 100 followers',
    provider: 'instagram',
    traits: { 'followers_count': 'gt:100' }
  },
  {
    id: 'tiktok-followers-1000',
    name: 'TikTok Followers > 1000',
    description: 'Verify TikTok account with more than 1000 followers',
    provider: 'tiktok',
    traits: { 'follower_count': 'gt:1000' }
  },
  {
    id: 'tiktok-likes-10000',
    name: 'TikTok Likes > 10,000',
    description: 'Verify TikTok account with more than 10,000 total likes',
    provider: 'tiktok',
    traits: { 'likes_count': 'gt:10000' }
  },
  {
    id: 'tiktok-videos-50',
    name: 'TikTok Videos > 50',
    description: 'Verify TikTok account with more than 50 videos posted',
    provider: 'tiktok',
    traits: { 'video_count': 'gt:50' }
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
    }
  }
]

function ExampleCard({ scenario }: { scenario: ExampleScenario }) {
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
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
      setError('Publisher key not configured')
      return
    }

    setIsChecking(true)
    setError('')
    setResponse(null)
    setRequestDetails(null)

    try {
      const signature = await generateSignature({
        action: 'base_verify_token',
        provider: scenario.provider,
        traits: scenario.traits,
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

      const apiUrl = `${config.baseVerifyApiUrl}/base_verify_token`
      const requestBody = {
        message: signature.message,
        signature: signature.signature,
      }

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

      setResponse({
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        data: responseData,
        ok: apiResponse.ok,
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
    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1rem', border: '1px solid #e5e7eb' }}>
      <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '0.375rem', marginTop: 0, color: '#111', lineHeight: '1.3' }}>
              {scenario.name}
            </h3>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: '1.4', margin: 0 }}>
              {scenario.description}
            </p>
          </div>
          
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
            {isChecking ? 'Checking...' : 'Try It'}
          </button>
        </div>

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
          <span style={{ color: '#111', fontWeight: '500' }}>{scenario.provider}</span>
          {' · '}
          {Object.entries(scenario.traits).map(([key, value], idx) => (
            <span key={key}>
              {idx > 0 && ', '}
              <span style={{ color: '#111' }}>{key}:{value}</span>
            </span>
          ))}
        </div>
      </div>

      {!isConnected && (
        <div style={{ padding: '1rem', background: '#fef3c7', borderBottom: '1px solid #e5e7eb' }}>
          <p style={{ color: '#92400e', fontSize: '0.8rem', margin: 0 }}>
            Connect your wallet to test this example
          </p>
        </div>
      )}

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

      {requestDetails && (
        <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
          <h4 style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem', marginTop: 0, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Request
          </h4>
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

      {response && (
        <div style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: '600', margin: 0, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Response
            </h4>
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

          {response.status === 200 && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#d1fae5', borderRadius: '6px', border: '1px solid #10b981' }}>
              <p style={{ margin: '0 0 0.375rem 0', fontWeight: '600', color: '#065f46', fontSize: '0.875rem' }}>Success</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#047857', lineHeight: '1.4' }}>
                User has verified their {scenario.provider} account and meets all trait requirements.
              </p>
            </div>
          )}

          {response.status === 404 && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#dbeafe', borderRadius: '6px', border: '1px solid #3b82f6' }}>
              <p style={{ margin: '0 0 0.375rem 0', fontWeight: '600', color: '#1e40af', fontSize: '0.875rem' }}>Verification Not Found</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#1e3a8a', lineHeight: '1.4' }}>
                This wallet has not verified a {scenario.provider} account yet.
              </p>
            </div>
          )}

          {response.status === 412 && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fef3c7', borderRadius: '6px', border: '1px solid #f59e0b' }}>
              <p style={{ margin: '0 0 0.375rem 0', fontWeight: '600', color: '#92400e', fontSize: '0.875rem' }}>Requirements Not Met</p>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#b45309', lineHeight: '1.4' }}>
                User has verified their {scenario.provider} account, but does not meet the trait requirements.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProviderExamples({ provider }: { provider: string }) {
  const scenarios = EXAMPLE_SCENARIOS.filter(s => s.provider === provider)
  
  if (scenarios.length === 0) return null

  return (
    <div style={{ margin: '2rem 0' }}>
      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', color: '#1a1a1a' }}>
        Try It Live
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {scenarios.map(scenario => (
          <ExampleCard key={scenario.id} scenario={scenario} />
        ))}
      </div>
    </div>
  )
}

export default function DocsPage({ content, headings }: DocsPageProps) {
  // Split content by provider sections
  const sections = content.split(/(?=### (?:Coinbase|X \(Twitter\)|Instagram|TikTok)\s*$)/m)
  
  return (
    <Layout title="Base Verify Documentation">
      <Head>
        <title>Base Verify Integration Guide</title>
        <meta name="description" content="Complete guide to integrating Base Verify into your mini app" />
      </Head>

      <style jsx global>{`
        html {
          scroll-padding-top: 100px;
        }
        
        @media (max-width: 1023px) {
          .docs-sidebar {
            display: none !important;
          }
          .docs-container {
            flex-direction: column !important;
          }
        }
      `}</style>

      <div className="docs-container" style={{
        display: 'flex',
        gap: '2rem',
        margin: '-1.5rem -1rem',
        padding: '1.5rem 1rem'
      }}>
          {/* Table of Contents */}
          <aside className="docs-sidebar" style={{
              width: '250px',
              flexShrink: 0,
              position: 'sticky',
              top: '1rem',
              height: 'fit-content',
              maxHeight: 'calc(100vh - 8rem)',
              overflowY: 'auto',
              background: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(0, 0, 0, 0.1)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
            }}>
              <h3 style={{
                fontSize: '0.875rem',
                fontWeight: '700',
                color: '#666',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginTop: 0,
                marginBottom: '1rem'
              }}>
                Contents
              </h3>
              <nav>
                {headings.map((heading) => (
                  <a
                    key={heading.id}
                    href={`#${heading.id}`}
                    style={{
                      display: 'block',
                      fontSize: '0.875rem',
                      color: heading.level === 2 ? '#1a1a1a' : '#666',
                      textDecoration: 'none',
                      marginBottom: '0.5rem',
                      paddingLeft: `${(heading.level - 2) * 1}rem`,
                      fontWeight: heading.level === 2 ? '600' : '400',
                      transition: 'color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#0052FF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = heading.level === 2 ? '#1a1a1a' : '#666';
                    }}
                  >
                    {heading.text}
                  </a>
                ))}
              </nav>
            </aside>

          {/* Main Content */}
          <main style={{
            flex: 1,
            background: 'white',
            borderRadius: '12px',
            padding: '2.5rem',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
            minWidth: 0
          }}>
            {sections.map((section, index) => {
              const isCoinbaseSection = section.startsWith('### Coinbase')
              const isXSection = section.startsWith('### X (Twitter)')
              const isInstagramSection = section.startsWith('### Instagram')
              const isTikTokSection = section.startsWith('### TikTok')
              
              return (
                <React.Fragment key={index}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw, rehypeSanitize]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1
                          id={props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                          style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            color: '#1a1a1a',
                            marginTop: '0',
                            marginBottom: '1.5rem',
                            lineHeight: '1.2'
                          }}
                          {...props}
                        />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2
                          id={props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                          style={{
                            fontSize: '1.875rem',
                            fontWeight: '700',
                            color: '#1a1a1a',
                            marginTop: '2.5rem',
                            marginBottom: '1rem',
                            lineHeight: '1.3'
                          }}
                          {...props}
                        />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3
                          id={props.children?.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                          style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: '2rem',
                            marginBottom: '0.75rem',
                            lineHeight: '1.4'
                          }}
                          {...props}
                        />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            marginTop: '1.5rem',
                            marginBottom: '0.5rem'
                          }}
                          {...props}
                        />
                      ),
                      p: ({ node, ...props }) => (
                        <p
                          style={{
                            fontSize: '1rem',
                            lineHeight: '1.7',
                            color: '#374151',
                            marginBottom: '1.25rem'
                          }}
                          {...props}
                        />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul
                          style={{
                            fontSize: '1rem',
                            lineHeight: '1.7',
                            color: '#374151',
                            marginBottom: '1.25rem',
                            paddingLeft: '1.5rem',
                            listStyleType: 'disc'
                          }}
                          {...props}
                        />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol
                          style={{
                            fontSize: '1rem',
                            lineHeight: '1.7',
                            color: '#374151',
                            marginBottom: '1.25rem',
                            paddingLeft: '1.5rem',
                            listStyleType: 'decimal'
                          }}
                          {...props}
                        />
                      ),
                      li: ({ node, ...props }) => (
                        <li
                          style={{
                            marginBottom: '0.5rem'
                          }}
                          {...props}
                        />
                      ),
                      code: ({ node, className, children, ...props }) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const isInline = !className;
                        
                        return !isInline && match ? (
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              borderRadius: '8px',
                              fontSize: '0.875rem',
                              padding: '1.25rem'
                            }}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code
                            style={{
                              background: '#f3f4f6',
                              padding: '0.2em 0.4em',
                              borderRadius: '4px',
                              fontSize: '0.875em',
                              fontFamily: 'monospace',
                              color: '#d97706'
                            }}
                          >
                            {children}
                          </code>
                        );
                      },
                      pre: ({ node, ...props }) => (
                        <pre
                          style={{
                            marginBottom: '1.25rem',
                            background: '#1e293b',
                            borderRadius: '8px',
                            overflow: 'auto'
                          }}
                          {...props}
                        />
                      ),
                      a: ({ node, ...props }) => (
                        <a
                          style={{
                            color: '#0052FF',
                            textDecoration: 'underline',
                            fontWeight: '500'
                          }}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...props}
                        />
                      ),
                      table: ({ node, ...props }) => (
                        <div style={{ overflowX: 'auto', marginBottom: '1.25rem' }}>
                          <table
                            style={{
                              width: '100%',
                              borderCollapse: 'collapse',
                              fontSize: '0.875rem',
                              border: '1px solid #e5e7eb'
                            }}
                            {...props}
                          />
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead
                          style={{
                            background: '#f9fafb'
                          }}
                          {...props}
                        />
                      ),
                      th: ({ node, ...props }) => (
                        <th
                          style={{
                            padding: '0.75rem 1rem',
                            textAlign: 'left',
                            fontWeight: '600',
                            color: '#1a1a1a',
                            borderBottom: '2px solid #e5e7eb',
                            borderRight: '1px solid #e5e7eb'
                          }}
                          {...props}
                        />
                      ),
                      td: ({ node, ...props }) => (
                        <td
                          style={{
                            padding: '0.75rem 1rem',
                            borderBottom: '1px solid #e5e7eb',
                            borderRight: '1px solid #e5e7eb',
                            color: '#374151'
                          }}
                          {...props}
                        />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote
                          style={{
                            borderLeft: '4px solid #0052FF',
                            paddingLeft: '1rem',
                            marginLeft: '0',
                            marginBottom: '1.25rem',
                            color: '#6b7280',
                            fontStyle: 'italic'
                          }}
                          {...props}
                        />
                      ),
                      hr: ({ node, ...props }) => (
                        <div
                          style={{
                            height: '1px',
                            background: '#e5e7eb',
                            margin: '2rem 0',
                            border: 'none',
                            padding: 0
                          }}
                        />
                      ),
                    }}
                  >
                    {section}
                  </ReactMarkdown>
                  
                  {/* Inject interactive examples after provider sections */}
                  {isCoinbaseSection && <ProviderExamples provider="coinbase" />}
                  {isXSection && <ProviderExamples provider="x" />}
                  {isInstagramSection && <ProviderExamples provider="instagram" />}
                  {isTikTokSection && <ProviderExamples provider="tiktok" />}
                </React.Fragment>
              )
            })}
          </main>
        </div>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<DocsPageProps> = async () => {
  const filePath = join(process.cwd(), 'docs.md');
  const content = readFileSync(filePath, 'utf-8');

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: Array<{ id: string; text: string; level: number }> = [];
  let match;

  while ((match = headingRegex.exec(content)) !== null) {
    const level = match[1].length;
    const text = match[2].replace(/\{#.*?\}/g, '').trim();
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    headings.push({ id, text, level });
  }

  return {
    props: {
      content,
      headings,
    },
  };
};

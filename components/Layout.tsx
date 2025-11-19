import { useRouter } from 'next/router'
import { WalletComponent } from './Wallet'
import { useOpenUrl } from '@coinbase/onchainkit/minikit'
import { useToast } from './ToastProvider'
import { verifySignatureCache } from '../lib/signatureCache'
import { useState } from 'react'

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export function Layout({ children, title = 'Base Verify Demo' }: LayoutProps) {
  const router = useRouter()
  const openUrl = useOpenUrl()
  const { showToast } = useToast()
  const [showDebugButtons, setShowDebugButtons] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f5',
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column'
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
        <div style={{ margin: '0 auto', padding: '0 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(1.1rem, 4vw, 1.3rem)', fontWeight: '600', color: '#1a1a1a' }}>{title}</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <WalletComponent />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem', flex: 1, width: '100%' }}>
        {children}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center',
        padding: '1rem',
        borderTop: '1px solid #e5e7eb',
        marginTop: 'auto'
      }}>
        {/* Debug Buttons */}
        {showDebugButtons && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            gap: '1rem'
          }}>
            <button
              onClick={() => openUrl('cbwallet://settings')}
              style={{
                padding: '0.5rem 1rem',
                background: '#0052FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 82, 255, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0045DD';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0052FF';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 82, 255, 0.2)';
              }}
            >
              Open Wallet Settings
            </button>
            <button
              onClick={() => openUrl('cbwallet://points')}
              style={{
                padding: '0.5rem 1rem',
                background: '#0052FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 82, 255, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0045DD';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0052FF';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 82, 255, 0.2)';
              }}
            >
              Open Points
            </button>
            <button
              onClick={() => openUrl('cbwallet://miniapp?url=https://verify.base.dev')}
              style={{
                padding: '0.5rem 1rem',
                background: '#0052FF',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(0, 82, 255, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0045DD';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 82, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#0052FF';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 82, 255, 0.2)';
              }}
            >
              Open Base Verify
            </button>
          </div>
        )}

        {/* Footer Links */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <a href="cbwallet://miniapp?url=https://verify.base.dev" target="_blank" rel="noopener noreferrer" style={{
            color: '#6b7280',
            fontSize: '0.8rem',
            textDecoration: 'none'
          }}>
            Powered by Base Verify
          </a>
          <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>•</span>
          <button
            onClick={() => {
              verifySignatureCache.clear();
              localStorage.removeItem('miniapp_last_prompt_timestamp');
              showToast('Cache cleared', 'success');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            Clear Cache
          </button>
          <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>•</span>
          <button
            onClick={() => setShowDebugButtons(!showDebugButtons)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            {showDebugButtons ? 'Hide' : 'Show'} Debug Buttons
          </button>
          <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>•</span>
          <button
            onClick={() => router.push('/docs')}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            Base Verify Docs
          </button>
          <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>•</span>
          <button
            onClick={() => router.push('/examples')}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            Examples
          </button>
          <span style={{ color: '#d1d5db', fontSize: '0.8rem' }}>•</span>
          <button
            onClick={() => router.push('/coinbase')}
            style={{
              background: 'none',
              border: 'none',
              color: '#9ca3af',
              fontSize: '0.75rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1a1a1a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
            }}
          >
            Claim Coinbase Airdrop
          </button>
        </div>
      </div>
    </div>
  )
}


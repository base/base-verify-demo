'use client'

import { useAccount, useConnect } from 'wagmi'
import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect } from 'react';

export function WalletComponent() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()

  useEffect(() => {
    const checkContext = async () => {
      console.log('isConnected:', isConnected)
      console.log('address:', address)
      console.log("asking for context")
      const context = await sdk.context
      console.log('context:', context)
      if (context) {
        console.log('client:', context.client)
      }
    }
    void checkContext()
  }, [isConnected, address])
 
  if (isConnected && address) {
    return (
      <div style={{
        padding: '0.5rem 1rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: 'white',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
        fontFamily: 'monospace'
      }}>
        {address.slice(0, 6)}...{address.slice(-4)}
      </div>
    )
  }
 
  return (
    <button
      type="button"
      onClick={() => {
        console.log('Connecting to wallet...')
        console.log('Connectors:', connectors)
        connect({ connector: connectors[0] })
      }}
      style={{
        padding: '0.75rem 1.5rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: 'white',
        color: '#374151',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer'
      }}
    >
      Connect
    </button>
  )
}

'use client'

import { useAccount } from 'wagmi'
import { useConnect } from 'wagmi'
import { useDisconnect } from 'wagmi'


export function WalletComponent() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  console.log('connectors:', connectors)
  
  if (isConnected && address) {
    return (
      <div>
        <div
          onClick={() => disconnect()}
          style={{
            padding: '0.5rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: 'white',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: '500',
            fontFamily: 'monospace',
            cursor: 'pointer'
          }}
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
      </div>
    )
  }
 
  return (
    <button
      type="button"
      onClick={() => connect({ connector: connectors[0] })}
      style={{
        padding: '0.5rem 1rem',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        background: 'white',
        color: '#374151',
        fontSize: '0.875rem',
        fontWeight: '500',
        cursor: 'pointer'
      }}
    >
      Connect
    </button>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount } from 'wagmi'
import { useConnect } from 'wagmi'
import { useDisconnect } from 'wagmi'
import { config } from './Providers'


export function WalletComponent() {
  const { isConnected, address } = useAccount()
  const { connect, connectors } = useConnect({ config })
  const { disconnect } = useDisconnect()
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>()

  useEffect(() => {
    if (selectedConnectorId || connectors.length === 0) return

    const preferredConnector =
      connectors.find(c => {
        const name = c.name.toLowerCase()
        return name.includes('base account') || name.includes('farcaster')
      }) || connectors[0]

    setSelectedConnectorId(preferredConnector?.id)
  }, [connectors, selectedConnectorId])

  const selectedConnector = useMemo(
    () => connectors.find(c => c.id === selectedConnectorId),
    [connectors, selectedConnectorId]
  )

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
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center'
      }}
    >
      <select
        value={selectedConnectorId ?? ''}
        onChange={event => setSelectedConnectorId(event.target.value)}
        disabled={connectors.length === 0}
        style={{
          padding: '0.5rem',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          background: 'white',
          color: '#374151',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: connectors.length === 0 ? 'not-allowed' : 'pointer'
        }}
      >
        {connectors.length === 0 ? (
          <option>No wallets available</option>
        ) : (
          connectors.map(connector => (
            <option key={connector.id} value={connector.id}>
              {connector.name}
            </option>
          ))
        )}
      </select>
      <button
        type="button"
        onClick={() => selectedConnector && connect({ connector: selectedConnector })}
        disabled={!selectedConnector}
        style={{
          padding: '0.5rem 1rem',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          background: selectedConnector ? 'white' : '#f3f4f6',
          color: '#374151',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: selectedConnector ? 'pointer' : 'not-allowed'
        }}
      >
        Connect
      </button>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { config, baseSepolia } from '../lib/wagmi'
import { useToast } from './ToastProvider'

export function WalletComponent() {
  const { isConnected, address, connector } = useAccount()
  const [walletChainId, setWalletChainId] = useState<number | undefined>()
  const { connect, connectors } = useConnect({ config })
  const { switchChainAsync } = useSwitchChain()
  const { disconnect } = useDisconnect()
  const { showToast } = useToast()
  const [selectedConnectorId, setSelectedConnectorId] = useState<string>()

  useEffect(() => {
    if (!connector) {
      setWalletChainId(undefined)
      return
    }

    let cancelled = false

    const refresh = async () => {
      try {
        const id = await connector.getChainId()
        if (!cancelled) setWalletChainId(id)
      } catch {
        if (!cancelled) setWalletChainId(undefined)
      }
    }

    void refresh()

    let provider: { on?: (event: string, handler: () => void) => void; removeListener?: (event: string, handler: () => void) => void } | undefined
    const onChainChanged = () => { void refresh() }

    void connector.getProvider().then((p) => {
      provider = p as typeof provider
      provider?.on?.('chainChanged', onChainChanged)
    })

    return () => {
      cancelled = true
      provider?.removeListener?.('chainChanged', onChainChanged)
    }
  }, [connector])

  // Base Account often stays on mainnet (8453) after connect; nudge to Sepolia.
  useEffect(() => {
    if (!isConnected || walletChainId === undefined || walletChainId === baseSepolia.id) return
    void switchChainAsync({ chainId: baseSepolia.id }).catch(() => {})
  }, [isConnected, walletChainId, switchChainAsync])

  useEffect(() => {
    if (selectedConnectorId || connectors.length === 0) return

    const preferredConnector =
      connectors.find(c => {
        const name = c.name.toLowerCase()
        return name.includes('base account')
      }) || connectors[0]

    setSelectedConnectorId(preferredConnector?.id)
  }, [connectors, selectedConnectorId])

  const selectedConnector = useMemo(
    () => connectors.find(c => c.id === selectedConnectorId),
    [connectors, selectedConnectorId]
  )

  if (isConnected && address) {
    const copyAddress = async (event: React.MouseEvent) => {
      event.stopPropagation()
      try {
        await navigator.clipboard.writeText(address)
        showToast('Address copied', 'success')
      } catch {
        showToast('Could not copy address', 'error')
      }
    }

    return (
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <div
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: 'white',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: '500',
            fontFamily: 'monospace',
          }}
        >
          Chain {walletChainId ?? '…'}
        </div>
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
            cursor: 'pointer',
          }}
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          type="button"
          onClick={copyAddress}
          style={{
            padding: '0.5rem 0.75rem',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            background: 'white',
            color: '#374151',
            fontSize: '0.875rem',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          Copy
        </button>
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
        onClick={() =>
          selectedConnector &&
          connect({ connector: selectedConnector, chainId: baseSepolia.id })
        }
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

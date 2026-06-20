'use client'

import { useChainId, useSwitchChain } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { useToast } from './ToastProvider'

const NETWORKS = [
  { id: base.id, label: 'Base' },
  { id: baseSepolia.id, label: 'Base Sepolia' },
]

export function NetworkSwitcher() {
  const chainId = useChainId()
  const { switchChainAsync, isPending } = useSwitchChain()
  const { showToast } = useToast()

  const switchTo = async (id: number, label: string) => {
    try {
      await switchChainAsync({ chainId: id })
      showToast(`Switched to ${label}`, 'success')
    } catch {
      showToast(`Could not switch to ${label}`, 'error')
    }
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      {NETWORKS.map(({ id, label }) => {
        const active = chainId === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => switchTo(id, label)}
            disabled={isPending}
            style={{
              padding: '0.5rem 0.75rem',
              border: active ? '1px solid #0052FF' : '1px solid #d1d5db',
              borderRadius: '8px',
              background: active ? '#0052FF' : 'white',
              color: active ? 'white' : '#374151',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: isPending ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

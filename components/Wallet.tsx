'use client'

import {
  Address,
  Avatar,
  Identity,
  Name,
} from '@coinbase/onchainkit/identity'
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet'

export function WalletComponent() {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end'}}>
      <Wallet>
        <ConnectWallet>
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity>
            <Avatar />
            <Name />
            <Address />
          </Identity>
          <WalletDropdownBasename />
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  )
}

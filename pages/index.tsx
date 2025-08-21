import { GetServerSideProps } from 'next'
import Head from 'next/head'
import { useAccount } from 'wagmi'
import prisma from '../lib/prisma'
import { WalletComponent } from '../components/Wallet'

type VerifiedUser = {
  id: string
  address: string
  xUserId: string
  xUsername: string
  xFollowers: number
  createdAt: string
  updatedAt: string
}

type Props = {
  users: VerifiedUser[]
}

export default function Home({ users }: Props) {
  const { address, isConnected } = useAccount()

  return (
    <>
      <Head>
        <title>Verified X Users</title>
        <meta name="description" content="Simple app to track verified X users" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1>Verified X Users</h1>
            <p>Total verified users: {users.length}</p>
          </div>
          <WalletComponent />
        </div>
        
        {isConnected && address && (
          <div style={{ marginBottom: '2rem', padding: '1rem', backgroundColor: '#f0f8ff', borderRadius: '8px', border: '1px solid #0070f3' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#0070f3' }}>Connected Wallet</h3>
            <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {address}
            </p>
          </div>
        )}
        
        {users.length === 0 ? (
          <p>No verified users found.</p>
        ) : (
          <div>
            {users.map((user) => (
              <div 
                key={user.id} 
                style={{ 
                  border: '1px solid #ccc', 
                  padding: '1rem', 
                  margin: '1rem 0',
                  borderRadius: '8px'
                }}
              >
                <h3>@{user.xUsername}</h3>
                <p>Wallet: {user.address.slice(0, 6)}...{user.address.slice(-4)}</p>
                <p>X User ID: {user.xUserId}</p>
                <p>Followers: {user.xFollowers.toLocaleString()}</p>
                <small>Added: {new Date(user.createdAt).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    const users = await prisma.verifiedUser.findMany({
      orderBy: { createdAt: 'desc' }
    })

    return {
      props: {
        users: JSON.parse(JSON.stringify(users))
      }
    }
  } catch (error) {
    console.error('Error fetching users:', error)
    return {
      props: {
        users: []
      }
    }
  }
}

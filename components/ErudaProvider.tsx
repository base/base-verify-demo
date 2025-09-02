'use client'

export function ErudaProvider() {
  if (process.env.NEXT_PUBLIC_LOAD_ERUDA !== 'true') {
    return null
  }

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://cdn.jsdelivr.net/npm/eruda" />
      <script>eruda.init();</script>
    </>
  )
}

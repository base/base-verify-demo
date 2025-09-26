'use client'

export function ErudaProvider() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="https://cdn.jsdelivr.net/npm/eruda" />
      <script>eruda.init();</script>
    </>
  )
}

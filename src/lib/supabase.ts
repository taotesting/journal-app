import { createBrowserClient } from '@supabase/ssr'
import { useMemo } from 'react'

// Singleton client instance for non-hook usage
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // During SSR/build, env vars may not be available - return a placeholder
  // that will be replaced on the client side
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // Return null during build/SSR when env vars aren't available
    // The actual client will be created on the browser
    if (typeof window === 'undefined') {
      return null as unknown as ReturnType<typeof createBrowserClient>
    }
    throw new Error('Missing Supabase environment variables')
  }

  if (!clientInstance) {
    clientInstance = createBrowserClient(url, key)
  }
  return clientInstance
}

// Hook for components - memoizes the client
export function useSupabase() {
  return useMemo(() => createClient(), [])
}

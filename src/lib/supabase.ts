import { createBrowserClient } from '@supabase/ssr'
import { useMemo } from 'react'

// Singleton client instance for non-hook usage
let clientInstance: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (!clientInstance) {
    clientInstance = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return clientInstance
}

// Hook for components - memoizes the client
export function useSupabase() {
  return useMemo(() => createClient(), [])
}

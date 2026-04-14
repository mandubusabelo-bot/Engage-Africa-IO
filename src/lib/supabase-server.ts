import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// Singleton pattern for server-side admin client
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null

export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    if (!supabaseUrl || !serviceKey) {
      console.error('Missing Supabase server environment variables')
      throw new Error('Missing SUPABASE_SERVICE_KEY environment variable')
    }
    supabaseAdminInstance = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  }
  return supabaseAdminInstance
})()

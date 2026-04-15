import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

// Singleton pattern for server-side admin client
let supabaseAdminInstance: ReturnType<typeof createClient> | null = null

export const supabaseAdmin = (() => {
  if (!supabaseAdminInstance) {
    if (!supabaseUrl || !serviceKey) {
      console.warn('Missing Supabase server environment variables - creating placeholder client')
      // Return a placeholder that will fail gracefully when used
      return createClient('https://placeholder.supabase.co', 'placeholder-service-key') as any
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

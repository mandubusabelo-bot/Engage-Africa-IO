import { createClient } from '@supabase/supabase-js'

const DEFAULT_SUPABASE_URL = 'https://gjizhfacvjklggxfrxxc.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdqaXpoZmFjdmprbGdneGZyeHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNjQ3NDIsImV4cCI6MjA5MTc0MDc0Mn0.ggfzB7r8ZTRILW5b87yxcm3894GJ-mCWtNwEA_AXMrg'

export const hasSupabasePublicEnv = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY

// Singleton pattern to prevent multiple instances
let supabaseInstance: ReturnType<typeof createClient> | null = null

export const supabase = (() => {
  if (!supabaseInstance) {
    if (!hasSupabasePublicEnv) {
      console.warn('[Supabase] NEXT_PUBLIC env vars missing at build/runtime. Using hardcoded project defaults.')
    }
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }
  return supabaseInstance
})()

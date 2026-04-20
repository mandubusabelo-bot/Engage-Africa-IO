import { supabaseAdmin } from '@/lib/supabase-server'

const cache = new Map<string, {
  template: string
  channel: string
  cachedAt: number
}>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function loadPrompt(triggerKey: string): Promise<{
  template: string
  channel: string
} | null> {
  const now = Date.now()
  const cached = cache.get(triggerKey)

  if (cached && now - cached.cachedAt < CACHE_TTL) {
    return { template: cached.template, channel: cached.channel }
  }

  const { data: row, error } = await supabaseAdmin
    .from('internal_prompts')
    .select('template, channel')
    .eq('trigger_key', triggerKey)
    .eq('active', true)
    .single()

  if (error || !row) {
    console.warn(`No active prompt found for: ${triggerKey}`)
    return null
  }

  cache.set(triggerKey, {
    template: row.template,
    channel: row.channel,
    cachedAt: now
  })

  return { template: row.template, channel: row.channel }
}

export function invalidatePromptCache(triggerKey: string) {
  cache.delete(triggerKey)
}

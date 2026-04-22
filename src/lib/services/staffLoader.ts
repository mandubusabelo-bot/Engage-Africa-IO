import { supabaseAdmin } from '@/lib/supabase-server'

function parseNumbers(raw?: string): string[] {
  if (!raw) return []
  return raw
    .split(/[;,\n]/)
    .map((n) => n.trim())
    .filter(Boolean)
}

export async function getStaffNumbers(
  role: 'dispatch' | 'human_agent' | 'disputes'
): Promise<string[]> {
  const { data: rows, error } = await supabaseAdmin
    .from('internal_staff')
    .select('number')
    .eq('role', role)
    .eq('active', true)

  if (error) {
    console.error('Error loading staff numbers:', error)
  }

  if (rows && rows.length > 0) {
    return rows.map((r: { number: string }) => r.number)
  }

  // Fallback to environment variables
  const envMap: Record<string, string[]> = {
    dispatch: [
      ...parseNumbers(process.env.DISPATCH_NUMBERS),
      ...parseNumbers(process.env.DISPATCH_NUMBER)
    ],
    human_agent: parseNumbers(process.env.HUMAN_AGENT_NUMBER),
    disputes: parseNumbers(process.env.DISPUTES_NUMBER)
  }

  return envMap[role] || []
}

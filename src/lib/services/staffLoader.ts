import { supabaseAdmin } from '@/lib/supabase-server'

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
  const envMap: Record<string, string | undefined> = {
    dispatch: process.env.DISPATCH_NUMBER,
    human_agent: process.env.HUMAN_AGENT_NUMBER,
    disputes: process.env.DISPUTES_NUMBER
  }

  return envMap[role] ? [envMap[role]!] : []
}

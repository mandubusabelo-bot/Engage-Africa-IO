import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit') || 20)

    const { data: runs, error } = await supabaseAdmin
      .from('flow_runs')
      .select('*')
      .eq('flow_id', params.id)
      .order('started_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit, 100)))

    if (error) {
      return NextResponse.json({ success: true, data: [] })
    }

    return NextResponse.json({ success: true, data: runs || [] })
  } catch (error: any) {
    console.error('Get flow runs error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

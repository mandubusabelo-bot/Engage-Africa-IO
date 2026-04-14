import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Use service key to bypass RLS for testing
    const { data: agents, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: agents || [] })
  } catch (error: any) {
    console.error('Get agents error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .insert({
        ...body,
        message_count: 0,
        response_rate: 95,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: agent })
  } catch (error: any) {
    console.error('Create agent error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

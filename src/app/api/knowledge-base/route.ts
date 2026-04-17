import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const scope = searchParams.get('scope')

    let query = supabaseAdmin
      .from('knowledge_base')
      .select('*')

    if (scope === 'global') {
      query = query.is('agent_id', null)
    } else if (agentId) {
      query = query.eq('agent_id', agentId)
    }

    const primary = await query.order('created_at', { ascending: false })

    if (primary.error) {
      const fallback = await query
      if (fallback.error) throw fallback.error
      return NextResponse.json({ success: true, data: fallback.data || [] })
    }

    return NextResponse.json({ success: true, data: primary.data || [] })
  } catch (error: any) {
    console.error('Get knowledge base error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('knowledge_base')
      .insert({
        title: body.title,
        content: body.content,
        agent_id: body.agent_id ?? null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Create knowledge base error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

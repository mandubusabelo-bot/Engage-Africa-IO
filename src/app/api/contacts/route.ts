import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select(`
        *,
        agents:assigned_agent_id (name)
      `)
      .order('last_message_at', { ascending: false })

    if (error) throw error

    // Transform to include agent name
    const transformed = contacts?.map((c: any) => ({
      ...c,
      assigned_agent_name: c.agents?.name || null
    })) || []

    return NextResponse.json({ success: true, data: transformed })
  } catch (error: any) {
    console.error('Get contacts error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { data: contact, error } = await supabaseAdmin
      .from('contacts')
      .insert({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: contact })
  } catch (error: any) {
    console.error('Create contact error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

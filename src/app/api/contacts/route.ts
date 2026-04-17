import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get all contacts
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false })

    if (contactsError) throw contactsError

    // Get all agents to map names
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, name')

    // Create agent map
    const agentMap = new Map(agents?.map(a => [a.id, a.name]) || [])

    // Transform to include agent name
    const transformed = contacts?.map((c: any) => ({
      ...c,
      assigned_agent_name: c.assigned_agent_id ? agentMap.get(c.assigned_agent_id) : null
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

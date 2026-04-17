import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Get all contacts (fallback for older schemas that don't have last_message_at)
    let contacts: any[] | null = null
    const primaryQuery = await supabaseAdmin
      .from('contacts')
      .select('*')
      .order('last_message_at', { ascending: false })

    if (primaryQuery.error) {
      const fallbackQuery = await supabaseAdmin
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallbackQuery.error) {
        const lastResortQuery = await supabaseAdmin
          .from('contacts')
          .select('*')

        if (lastResortQuery.error) {
          throw lastResortQuery.error
        }

        contacts = lastResortQuery.data
      } else {
        contacts = fallbackQuery.data
      }
    } else {
      contacts = primaryQuery.data
    }

    // Get all agents to map names
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, name')

    // Create agent map
    const agentMap = new Map((agents || []).map((a: { id: string; name: string }) => [a.id, a.name]))

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

    const primaryInsert = await supabaseAdmin
      .from('contacts')
      .insert({
        ...body,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    let contact = primaryInsert.data
    let error = primaryInsert.error

    if (error) {
      const fallbackInsert = await supabaseAdmin
        .from('contacts')
        .insert({
          phone: body.phone,
          name: body.name,
          profile_pic_url: body.profile_pic_url,
          assigned_agent_id: body.assigned_agent_id
        })
        .select()
        .single()

      contact = fallbackInsert.data
      error = fallbackInsert.error
    }

    if (error) throw error

    return NextResponse.json({ success: true, data: contact })
  } catch (error: any) {
    console.error('Create contact error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

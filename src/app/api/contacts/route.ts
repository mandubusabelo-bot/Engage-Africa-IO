import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const normalizePhone = (value?: string | null) => (value || '').trim().toLowerCase()

const fallbackNameFromPhone = (phone?: string | null) => {
  const raw = (phone || '').replace('@s.whatsapp.net', '').replace('@c.us', '')
  return raw || 'Unknown'
}

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

    // Pull recent messages so contacts can be enriched from active chats
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('phone, name, created_at')
      .order('created_at', { ascending: false })
      .limit(500)

    const contactPhoneSet = new Set((contacts || []).map((c: any) => normalizePhone(c.phone)))
    const missingContacts = new Map<string, { phone: string; name: string; last_message_at: string }>()

    ;(recentMessages || []).forEach((msg: any) => {
      const normalized = normalizePhone(msg.phone)
      if (!normalized || contactPhoneSet.has(normalized)) return
      if (!missingContacts.has(normalized)) {
        missingContacts.set(normalized, {
          phone: msg.phone,
          name: msg.name || fallbackNameFromPhone(msg.phone),
          last_message_at: msg.created_at || new Date().toISOString()
        })
      }
    })

    if (missingContacts.size > 0) {
      const toInsert = Array.from(missingContacts.values())
      const primaryInsert = await supabaseAdmin
        .from('contacts')
        .insert(toInsert)

      if (primaryInsert.error) {
        await supabaseAdmin
          .from('contacts')
          .insert(toInsert.map(({ phone, name }) => ({ phone, name })))
      }

      contacts = [
        ...(contacts || []),
        ...toInsert.map((item) => ({
          ...item,
          created_at: item.last_message_at
        }))
      ]
    }

    // Get all agents to map names
    const { data: agents } = await supabaseAdmin
      .from('agents')
      .select('id, name')

    // Create agent map
    const agentMap = new Map((agents || []).map((a: { id: string; name: string }) => [a.id, a.name]))

    const latestMessageNameByPhone = new Map<string, string>()
    ;(recentMessages || []).forEach((msg: any) => {
      const normalized = normalizePhone(msg.phone)
      if (!normalized || latestMessageNameByPhone.has(normalized)) return
      if (msg.name && msg.name.trim()) {
        latestMessageNameByPhone.set(normalized, msg.name.trim())
      }
    })

    // Transform to include agent name + resilient display name
    const transformed = contacts?.map((c: any) => ({
      ...c,
      name: c.name || latestMessageNameByPhone.get(normalizePhone(c.phone)) || fallbackNameFromPhone(c.phone),
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

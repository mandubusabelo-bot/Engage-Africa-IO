import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { eventSystem, EventTypes } from '@/lib/eventSystem'

export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check back after testing
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ success: true, data: messages || [] })
  } catch (error: any) {
    console.error('Get messages error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add auth check back after testing
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()

    const { data: message, error } = await supabaseAdmin
      .from('messages')
      .insert({
        agent_id: body.agentId,
        content: body.content,
        sender: body.sender || 'user',
        phone: body.phone,
        name: body.name
      })
      .select()
      .single()

    if (error) throw error

    // Emit events based on message type
    if (body.sender === 'user' && body.phone) {
      // Incoming WhatsApp message
      eventSystem.emit(EventTypes.WHATSAPP_INBOUND_MESSAGE, {
        message: body.content,
        phone: body.phone,
        name: body.name,
        timestamp: new Date().toISOString()
      })
    } else if (body.sender === 'bot') {
      // Outgoing WhatsApp message (agent response)
      eventSystem.emit(EventTypes.WHATSAPP_OUTBOUND_MESSAGE, {
        message: body.content,
        phone: body.phone,
        agentId: body.agentId,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({ success: true, data: message })
  } catch (error: any) {
    console.error('Create message error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')

    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone number required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('phone', phone)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Messages deleted' })
  } catch (error: any) {
    console.error('Delete messages error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

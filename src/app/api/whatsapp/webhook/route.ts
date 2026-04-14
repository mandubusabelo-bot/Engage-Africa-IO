import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { eventSystem, EventTypes } from '@/lib/eventSystem'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Evolution API webhook format
    const { event, data } = body

    if (event === 'messages.upsert' && data) {
      const message = data.key?.remoteJid
      const text = data.message?.conversation || data.message?.extendedTextMessage?.text
      const fromMe = data.key?.fromMe

      if (!fromMe && message && text) {
        // Save message to database
        const { error: insertError } = await (supabaseAdmin.from('messages') as any).insert({
          agent_id: null, // Will be determined by flow
          content: text,
          sender: 'user',
          phone: message,
          name: message.split('@')[0]
        })

        if (insertError) {
          console.error('Failed to save message:', insertError)
        }

        // Emit event for flow triggers
        eventSystem.emit(EventTypes.WHATSAPP_INBOUND_MESSAGE, {
          message: text,
          phone: message,
          timestamp: new Date().toISOString()
        })

        console.log(`WhatsApp message from ${message}: ${text}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

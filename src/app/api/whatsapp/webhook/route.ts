import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { eventSystem, EventTypes } from '@/lib/eventSystem'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Webhook] Received:', JSON.stringify(body).slice(0, 500))

    // Evolution API webhook format (v2 uses MESSAGES_UPSERT)
    const { event, data } = body

    if ((event === 'MESSAGES_UPSERT' || event === 'messages.upsert') && data) {
      const message = data.key?.remoteJid
      const text = data.message?.conversation || data.message?.extendedTextMessage?.text
      const fromMe = data.key?.fromMe

      console.log('[Webhook] Message:', { message, text, fromMe })

      if (!fromMe && message && text) {
        // Save message to database
        const { error: insertError } = await (supabaseAdmin.from('messages') as any).insert({
          agent_id: null,
          content: text,
          sender: 'user',
          phone: message
        })

        if (insertError) {
          console.error('[Webhook] Failed to save message:', insertError)
        } else {
          console.log('[Webhook] Message saved to DB')
        }

        // Emit event for flow triggers
        eventSystem.emit(EventTypes.WHATSAPP_INBOUND_MESSAGE, {
          message: text,
          phone: message,
          timestamp: new Date().toISOString()
        })

        console.log(`[Webhook] ✅ WhatsApp message from ${message}: ${text}`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

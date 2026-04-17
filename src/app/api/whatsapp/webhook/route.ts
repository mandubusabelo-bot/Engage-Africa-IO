import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { handleIncomingWhatsApp } from '@/lib/aiService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[Webhook] Received:', JSON.stringify(body).slice(0, 300))

    const { event, data } = body

    if ((event === 'MESSAGES_UPSERT' || event === 'messages.upsert') && data) {
      const phone = data.key?.remoteJid
      const text = data.message?.conversation || data.message?.extendedTextMessage?.text
      const fromMe = data.key?.fromMe
      const pushName = data.pushName

      console.log('[Webhook] Message:', { phone, text, fromMe, pushName })

      if (!fromMe && phone && text) {
        // Save inbound message to DB
        const { error: insertError } = await (supabaseAdmin.from('messages') as any).insert({
          agent_id: null,
          content: text,
          sender: 'user',
          phone
        })

        if (insertError) {
          console.error('[Webhook] Failed to save message:', insertError)
        } else {
          console.log('[Webhook] Message saved to DB')
        }

        console.log(`[Webhook] ✅ WhatsApp message from ${pushName || phone}: ${text}`)

        // Process and reply (non-blocking - don't await so webhook returns fast)
        handleIncomingWhatsApp(phone, text, pushName).catch(err =>
          console.error('[Webhook] AI handler error:', err.message)
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

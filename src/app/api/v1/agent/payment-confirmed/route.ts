import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

async function sendWhatsAppDirect(to: string, text: string) {
  const apiUrl = process.env.EVOLUTION_API_URL
  const apiKey = process.env.EVOLUTION_API_KEY
  const instance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE
  if (!apiUrl || !apiKey || !instance) return
  const phone = to.replace(/\D/g, '')
  await fetch(`${apiUrl}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': apiKey },
    body: JSON.stringify({ number: phone, textMessage: { text } })
  }).catch(err => console.error('[PaymentConfirmed] WhatsApp send failed:', err?.message))
}

export async function POST(request: NextRequest) {
  try {
    // Verify agent API secret
    const apiSecret = request.headers.get('x-agent-secret')
    if (apiSecret !== process.env.AGENT_API_SECRET) {
      console.error('[Payment Webhook] Unauthorized request')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      event,
      orderRef,
      orderId,
      customerPhone,
      customerName,
      totalAmount,
      itemSummary,
      collectionPoint,
      paymentStatus,
      conversationId: providedConvId,
    } = body

    console.log(`[Payment Webhook] Received ${event} for order ${orderRef || orderId}`)

    // ── Resolve conversation (by ID or by phone fallback) ─────────────────────
    let conversation: any = null

    if (providedConvId) {
      const { data } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('id', providedConvId)
        .single()
      conversation = data
    }

    if (!conversation && customerPhone) {
      const normalised = customerPhone.replace(/\D/g, '')
      const { data } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .or(`phone.eq.${normalised},phone.eq.+${normalised}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      conversation = data
    }

    if (!conversation) {
      console.warn('[Payment Webhook] Conversation not found — skipping message insert')
    }

    // ── Get agent + actions ────────────────────────────────────────────────────
    const agentId = conversation?.agent_id
    let agent: any = null
    let dispatchAction: any = null

    if (agentId) {
      const { data: agentRow } = await supabaseAdmin
        .from('agents')
        .select('order_confirmed_template, payment_failed_template')
        .eq('id', agentId)
        .single()
      agent = agentRow

      // Read notify_dispatch action config for dispatch numbers
      const { data: actions } = await supabaseAdmin
        .from('agent_actions')
        .select('*')
        .eq('agent_id', agentId)
        .eq('action_type', 'notify_dispatch')
        .eq('is_enabled', true)
        .limit(1)
      dispatchAction = actions?.[0] || null
    }

    // ── Resolve dispatch numbers: action config → env fallback ────────────────
    const configNumbers: string = dispatchAction?.config?.dispatchNumbers || ''
    const envNumbers: string = process.env.DISPATCH_NUMBERS || process.env.DISPATCH_NUMBER || ''
    const dispatchNumbers = (configNumbers || envNumbers)
      .split(/[,;\n]/)
      .map((n: string) => n.trim())
      .filter(Boolean)

    console.log(`[Payment Webhook] Dispatch numbers: ${dispatchNumbers.join(', ') || 'none'}`)

    if (event === 'payment_confirmed' && paymentStatus === 'COMPLETE') {
      console.log(`[Payment Webhook] Payment confirmed for order ${orderRef}`)

      // ── Customer confirmation message ──────────────────────────────────────
      const firstName = (customerName || 'there').split(' ')[0]
      let confirmationMessage = agent?.order_confirmed_template ||
        `✅ *Payment Confirmed!*\n\nHi ${firstName}! Your payment of *R${totalAmount}* has been received.\n\n📦 *Order:* ${orderRef}\n🛍️ *Items:* ${itemSummary || 'Your order'}\n${collectionPoint ? `📍 *Collection:* ${collectionPoint}\n` : ''}\nOur team will prepare and dispatch within 1–3 business days. Thank you! 🌿`

      confirmationMessage = confirmationMessage
        .replace(/\{\{orderId\}\}/g, orderRef || orderId || '')
        .replace(/\{\{orderRef\}\}/g, orderRef || '')
        .replace(/\{\{totalAmount\}\}/g, String(totalAmount || ''))
        .replace(/\{\{estimatedDispatch\}\}/g, '1–3 business days')
        .replace(/\{\{customerName\}\}/g, customerName || '')
        .replace(/\{\{itemSummary\}\}/g, itemSummary || '')
        .replace(/\{\{collectionPoint\}\}/g, collectionPoint || '')

      // Save to conversation + send via WhatsApp
      if (conversation) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          content: confirmationMessage,
          sender: 'agent',
          phone: conversation.phone,
          agent_id: agentId
        })
      }
      if (customerPhone) {
        await sendWhatsAppDirect(customerPhone, confirmationMessage)
        console.log('[Payment Webhook] Customer WhatsApp sent to', customerPhone)
      }

      // ── Dispatch notification ──────────────────────────────────────────────
      if (dispatchNumbers.length > 0) {
        const dispatchMsg =
          `🚨 *New Order — Payment Confirmed*\n\n` +
          `👤 *Customer:* ${customerName || 'N/A'}\n` +
          `📱 *Phone:* ${customerPhone || 'N/A'}\n` +
          `📦 *Ref:* ${orderRef || orderId}\n` +
          `🛍️ *Items:* ${itemSummary || 'See order'}\n` +
          (collectionPoint ? `📍 *Collection:* ${collectionPoint}\n` : '') +
          `💰 *Total:* R${totalAmount}\n` +
          `⏰ ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`

        for (const num of dispatchNumbers) {
          await sendWhatsAppDirect(num, dispatchMsg)
        }
        console.log('[Payment Webhook] Dispatch WhatsApp sent to', dispatchNumbers.join(', '))
      }

    } else if (event === 'payment_failed') {
      console.log(`[Payment Webhook] Payment ${paymentStatus} for order ${orderRef}`)

      const failureMessage = agent?.payment_failed_template ||
        `It looks like your payment didn't go through — no worries at all.\nWould you like me to send you the payment link again, or would you prefer to pay a different way?`

      if (conversation) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: conversation.id,
          content: failureMessage,
          sender: 'agent',
          phone: conversation.phone,
          agent_id: agentId
        })
      }
      if (customerPhone) {
        await sendWhatsAppDirect(customerPhone, failureMessage)
      }
    }

    return NextResponse.json({ success: true, message: 'Payment webhook processed' })

  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

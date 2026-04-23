import { getStaffNumbers } from './staffLoader'
import { notify } from './internalNotifier'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function isInternalStaff(jid: string): Promise<boolean> {
  const number = jid
    .replace('@s.whatsapp.net', '')
    .replace('@c.us', '')

  const all = [
    ...await getStaffNumbers('dispatch'),
    ...await getStaffNumbers('human_agent'),
    ...await getStaffNumbers('disputes')
  ]

  return all.includes(number)
}

export async function handleStaffReply(payload: any) {
  const jid = payload.data?.key?.remoteJid
  const number = jid.replace('@s.whatsapp.net', '').replace('@c.us', '')
  const text = (payload.data?.message?.conversation || '').trim().toUpperCase()

  // Handle RECEIVED command
  if (text.startsWith('RECEIVED')) {
    const parts = text.split(' ')
    const orderRef = parts[1]
    if (!orderRef) return

    // Update order status to acknowledged_by_dispatch
    await supabaseAdmin
      .from('orders')
      .update({ status: 'acknowledged_by_dispatch', updated_at: new Date().toISOString() })
      .eq('order_reference', orderRef)

    // Reply to staff
    await notify('staff_reply_received_ack', { 'order.ref': orderRef }, { role: 'dispatch' })
    return
  }

  // Handle DISPATCHED command
  if (text.startsWith('DISPATCHED')) {
    const parts = text.split(' ')
    const orderRef = parts[1]
    const tracking = parts[2] ?? null

    if (!orderRef) return

    // Get order details including conversation_id
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, conversation_id, contact_id')
      .eq('order_reference', orderRef)
      .single()

    if (!order) {
      await sendWhatsApp(number, `❌ Order ${orderRef} not found`)
      return
    }

    // Update order status
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'dispatched',
        tracking_number: tracking,
        dispatched_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id)

    // Notify customer
    if (order.conversation_id) {
      await notify('order_dispatched_customer', {
        'order.trackingNumber': tracking ?? ''
      }, { conversationId: order.conversation_id, contactId: order.contact_id })
    }

    // Reply to staff
    await notify('staff_reply_dispatched_ack', { 'order.ref': orderRef }, { role: 'dispatch' })
    return
  }

  // Handle DONE command
  if (text.startsWith('DONE')) {
    const parts = text.split(' ')
    const orderRef = parts[1]
    if (!orderRef) return

    // Get order details
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, conversation_id')
      .eq('order_reference', orderRef)
      .single()

    if (order) {
      // Update order status
      await supabaseAdmin
        .from('orders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', order.id)

      // Close the conversation
      if (order.conversation_id) {
        await supabaseAdmin
          .from('conversations')
          .update({ status: 'closed', closed_at: new Date().toISOString() })
          .eq('id', order.conversation_id)

        // Add completion label
        await addConversationLabel(order.conversation_id, 'completed')
      }
    }

    // Reply to staff
    await notify('staff_reply_done_ack', { 'order.ref': orderRef }, { role: 'dispatch' })
    return
  }
}

async function sendWhatsApp(toNumber: string, message: string) {
  try {
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'engage-africa'
    await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendText/${instance}`,
      {
        method: 'POST',
        headers: {
          'apikey': process.env.EVOLUTION_API_KEY!,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: toNumber,
          text: message,
          delay: 1000
        })
      }
    )
  } catch (err) {
    console.error('Failed to send WhatsApp to staff:', err)
  }
}

async function addConversationLabel(conversationId: string, label: string) {
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('labels')
    .eq('id', conversationId)
    .single()

  const currentLabels = conv?.labels || []
  if (!currentLabels.includes(label)) {
    await supabaseAdmin
      .from('conversations')
      .update({ labels: [...currentLabels, label] })
      .eq('id', conversationId)
  }
}

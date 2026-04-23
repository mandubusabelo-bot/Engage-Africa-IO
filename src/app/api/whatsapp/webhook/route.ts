import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { handleIncomingWhatsApp } from '@/lib/aiService'
import { isInternalStaff, handleStaffReply } from '@/lib/services/staffReplyHandler'
import { notify } from '@/lib/services/internalNotifier'

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
      const hasImage = data.message?.imageMessage || data.message?.viewOnceMessage?.message?.imageMessage

      console.log('[Webhook] Message:', { phone, text, fromMe, pushName, hasImage })

      // Check if this is a staff reply (internal routing)
      if (phone && await isInternalStaff(phone)) {
        console.log(`[Webhook] 👤 Staff reply from ${phone}: ${text}`)
        await handleStaffReply(body)
        return NextResponse.json({ success: true, handled: 'staff_reply' })
      }

      // Handle image messages (Proof of Payment detection)
      if (!fromMe && phone && hasImage) {
        console.log(`[Webhook] 📸 Image received from ${pushName || phone}`)

        // Get contact and check for active order
        const phoneClean = phone.replace('@s.whatsapp.net', '').replace('@c.us', '')
        const { data: contact } = await supabaseAdmin
          .from('contacts')
          .select('id, name')
          .eq('phone', phoneClean)
          .single()

        if (contact?.id) {
          // Check for active order awaiting POP
          const { data: orders } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('contact_id', contact.id)
            .in('status', ['collecting', 'awaiting_pop', 'awaiting_payment'])
            .order('created_at', { ascending: false })
            .limit(1)

          if (orders && orders.length > 0) {
            const order = orders[0]
            const { data: conversation } = await supabaseAdmin
              .from('conversations')
              .select('id')
              .eq('contact_id', contact.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (conversation?.id) {
              // Save image message
              await supabaseAdmin.from('messages').insert({
                agent_id: null,
                content: '[Image: Proof of Payment]',
                sender: 'user',
                phone: phoneClean,
                metadata: { is_image: true, order_id: order.id }
              })

              // Trigger POP notification
              await notify('pop_received_customer', {}, {
                conversationId: conversation.id,
                contactId: contact.id
              })

              await notify('dispatch_new_order', {
                'contact.name': contact.name || pushName || phoneClean,
                'contact.phone': phoneClean,
                'order.productName': order.product_name || 'Products',
                'order.qty': String(order.quantity || 1),
                'order.price': order.price?.toFixed(2) || '0.00',
                'order.totalAmount': order.total_amount?.toFixed(2) || order.price?.toFixed(2) || '0.00',
                'order.collectionDetails': order.collection_details || order.delivery_address || 'N/A',
                'order.contactName': order.contact_name || contact.name || pushName || phoneClean,
                'dispatch.timestamp': new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
              }, { role: 'dispatch', conversationId: conversation.id, orderId: order.id })

              // Update order status
              await supabaseAdmin
                .from('orders')
                .update({ status: 'pop_received', updated_at: new Date().toISOString() })
                .eq('id', order.id)

              // Add labels
              await supabaseAdmin
                .from('conversations')
                .update({
                  labels: ['pop-received', 'awaiting-dispatch'],
                  updated_at: new Date().toISOString()
                })
                .eq('id', conversation.id)

              console.log(`[Webhook] ✅ POP processed for order ${order.id}`)
              return NextResponse.json({ success: true, handled: 'pop_received' })
            }
          }
        }

        // Save image without POP trigger (no active order)
        await supabaseAdmin.from('messages').insert({
          agent_id: null,
          content: '[Image received]',
          sender: 'user',
          phone: phoneClean,
          metadata: { is_image: true }
        })

        // Still process through AI for skin consultation etc
        handleIncomingWhatsApp(phoneClean, '[Customer sent an image]', pushName).catch(err => {
          console.error('[Webhook] AI handler error:', err.message)
        })

        return NextResponse.json({ success: true, handled: 'image_saved' })
      }

      if (!fromMe && phone && text) {
        const phoneCleanText = phone.replace('@s.whatsapp.net', '').replace('@c.us', '')
        console.log(`[Webhook] ✅ WhatsApp message from ${pushName || phoneCleanText}: ${text}`)

        // Process and reply (non-blocking - don't await so webhook returns fast)
        // handleIncomingWhatsApp saves the message itself — do NOT save here too
        handleIncomingWhatsApp(phoneCleanText, text, pushName).catch(err => {
          console.error('[Webhook] AI handler error:', err.message)
          console.error('[Webhook] AI handler stack:', err.stack)
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Webhook] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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
      orderId,
      conversationId,
      contactId,
      contactName,
      totalAmount,
      paymentStatus,
      items,
      deliveryAddress
    } = body

    console.log(`[Payment Webhook] Received ${event} for order ${orderId}`)

    if (!conversationId) {
      console.error('[Payment Webhook] No conversation ID provided')
      return NextResponse.json({ success: false, error: 'No conversation ID' }, { status: 400 })
    }

    // Find the conversation
    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (convError || !conversation) {
      console.error('[Payment Webhook] Conversation not found:', conversationId)
      return NextResponse.json({ success: false, error: 'Conversation not found' }, { status: 404 })
    }

    // Get agent settings for message templates
    const { data: agent } = await supabaseAdmin
      .from('agents')
      .select('order_confirmed_template, payment_failed_template')
      .eq('id', conversation.agent_id)
      .single()

    if (event === 'payment_confirmed' && paymentStatus === 'COMPLETE') {
      // Payment successful
      console.log(`[Payment Webhook] Payment confirmed for order ${orderId}`)

      // Add internal comment to conversation
      await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: `💰 Payment confirmed for Order #${orderId} — R${totalAmount}. Dispatch notification sent to team.`,
          sender: 'system',
          phone: conversation.phone
        })

      // Send confirmation message to customer
      let confirmationMessage = agent?.order_confirmed_template || 
        `Your payment is confirmed! 🎉\n\nOrder #${orderId} has been sent to our dispatch team.\nDelivery to: ${deliveryAddress?.street}, ${deliveryAddress?.city}\n\nWe'll be in touch with tracking info. Thank you for your order!`

      // Replace template variables
      confirmationMessage = confirmationMessage
        .replace(/\{\{orderId\}\}/g, orderId)
        .replace(/\{\{totalAmount\}\}/g, totalAmount.toString())
        .replace(/\{\{deliveryAddress\.street\}\}/g, deliveryAddress?.street || '')
        .replace(/\{\{deliveryAddress\.city\}\}/g, deliveryAddress?.city || '')
        .replace(/\{\{estimatedDispatch\}\}/g, '1-2 business days')

      await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: confirmationMessage,
          sender: 'agent',
          phone: conversation.phone,
          agent_id: conversation.agent_id
        })

      // Send via WhatsApp
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        await fetch(`${siteUrl}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: conversation.phone,
            message: confirmationMessage
          })
        })
      } catch (error) {
        console.error('[Payment Webhook] Failed to send WhatsApp message:', error)
      }

      // Update contact fields if auto-update is enabled
      if (contactId && deliveryAddress) {
        const { data: agentSettings } = await supabaseAdmin
          .from('agents')
          .select('auto_update_contact_address, auto_update_contact_email')
          .eq('id', conversation.agent_id)
          .single()

        if (agentSettings?.auto_update_contact_address) {
          await supabaseAdmin
            .from('contacts')
            .update({
              street_address: deliveryAddress.street,
              city: deliveryAddress.city,
              province: deliveryAddress.province,
              postal_code: deliveryAddress.postalCode,
              last_auto_update: new Date().toISOString(),
              auto_updated_fields: {
                address: new Date().toISOString()
              }
            })
            .eq('id', contactId)

          console.log(`[Payment Webhook] Updated contact ${contactId} address`)
        }
      }

      console.log(`[Payment Webhook] Order ${orderId} processed successfully`)

    } else if (event === 'payment_failed' || paymentStatus !== 'COMPLETE') {
      // Payment failed or cancelled
      console.log(`[Payment Webhook] Payment ${paymentStatus} for order ${orderId}`)

      // Send failure message to customer
      let failureMessage = agent?.payment_failed_template ||
        `It looks like your payment didn't go through — no worries at all.\nWould you like me to send you the payment link again, or would you prefer to pay a different way?`

      await supabaseAdmin
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: failureMessage,
          sender: 'agent',
          phone: conversation.phone,
          agent_id: conversation.agent_id
        })

      // Send via WhatsApp
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        await fetch(`${siteUrl}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: conversation.phone,
            message: failureMessage
          })
        })
      } catch (error) {
        console.error('[Payment Webhook] Failed to send WhatsApp message:', error)
      }

      // Store pending order ID in conversation metadata for retry
      await supabaseAdmin
        .from('conversation_metadata')
        .upsert({
          conversation_id: conversationId,
          pending_order_id: orderId,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'conversation_id'
        })
    }

    return NextResponse.json({ success: true, message: 'Payment webhook processed' })

  } catch (error: any) {
    console.error('[Payment Webhook] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { notify } from '@/lib/services/internalNotifier'

// POST /api/agent-engine/[id]/actions/test - Test a specific action with sample data
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const logs: Array<{ ts: string; level: 'info' | 'warn' | 'error' | 'success'; msg: string }> = []
  const log = (level: 'info' | 'warn' | 'error' | 'success', msg: string) => {
    logs.push({ ts: new Date().toISOString(), level, msg })
  }

  try {
    const { actionId, samplePhone, sampleMessage } = await request.json()
    const agentId = params.id

    log('info', `Starting test for agent ${agentId}, action ${actionId}`)

    // Fetch the action
    const { data: action, error: fetchErr } = await supabaseAdmin
      .from('agent_actions')
      .select('*')
      .eq('id', actionId)
      .eq('agent_id', agentId)
      .single()

    if (fetchErr || !action) {
      log('error', `Action not found: ${fetchErr?.message || 'No data'}`)
      return NextResponse.json({ success: false, logs })
    }

    log('info', `Action type: ${action.action_type}, enabled: ${action.is_enabled}`)
    log('info', `Trigger condition: "${action.trigger_condition || '(none)'}"`)

    // Check trigger match
    const condition = (action.trigger_condition || '').trim().toLowerCase()
    const message = (sampleMessage || 'I want to buy umuthi wenhlanhla').toLowerCase()

    const triggerTokens = condition
      ? condition.split(/[|,\n]/).map((t: string) => t.trim()).filter(Boolean)
      : []

    const wildcard = triggerTokens.includes('*')
    const matchedToken = triggerTokens.find((token: string) => token !== '*' && message.includes(token))
    const shouldFire = !condition || wildcard || Boolean(matchedToken)

    if (!shouldFire) {
      log('warn', `Trigger condition "${condition}" NOT matched in sample message`)
      log('warn', `Checked tokens: ${triggerTokens.join(', ') || '(none)'}`)
      log('warn', 'Action would NOT fire for this message')
      return NextResponse.json({ success: true, triggered: false, logs })
    }

    if (!condition) {
      log('success', 'No trigger condition — always fires')
    } else if (wildcard) {
      log('success', 'Wildcard trigger "*" matched')
    } else {
      log('success', `Trigger matched via token: "${matchedToken}"`)
    }

    // Parse config
    const config = action.config || {}
    const instructionConfig = parseInstructionConfig(action.instruction)
    const mergedConfig = { ...instructionConfig, ...config }

    log('info', `Merged config: ${JSON.stringify(mergedConfig).slice(0, 500)}`)

    const phone = samplePhone || '27600000000'

    // Execute based on type
    if (['http_request', 'webhook_call', 'product_lookup', 'create_booking'].includes(action.action_type)) {
      const method = (mergedConfig.method || 'POST').toUpperCase()
      const rawUrl = mergedConfig.url || mergedConfig.endpoint

      if (!rawUrl) {
        log('error', 'No URL/endpoint configured — action cannot execute')
        return NextResponse.json({ success: false, logs })
      }

      const url = interpolate(String(rawUrl), { message, phone, query: message })
      log('info', `${method} ${url}`)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(mergedConfig.headers || {})
      }

      const bodyPayload = mergedConfig.body
        ? interpolate(JSON.stringify(mergedConfig.body), { message, phone, query: message })
        : JSON.stringify({ message, phone })

      log('info', `Headers: ${JSON.stringify(headers)}`)
      log('info', `Body: ${bodyPayload.slice(0, 300)}`)

      try {
        const startMs = Date.now()
        const response = await fetch(url, {
          method,
          headers,
          body: method === 'GET' ? undefined : bodyPayload
        })
        const elapsed = Date.now() - startMs

        log('info', `Response status: ${response.status} (${elapsed}ms)`)

        const contentType = response.headers.get('content-type') || ''
        let data: any = null

        if (contentType.includes('application/json')) {
          data = await response.json().catch(() => null)
          log('info', `Response body (JSON): ${JSON.stringify(data).slice(0, 1000)}`)
        } else {
          const text = await response.text().catch(() => '')
          log('info', `Response body (text): ${text.slice(0, 500)}`)
          data = text
        }

        if (response.ok) {
          log('success', `HTTP action completed successfully (${response.status})`)
        } else {
          log('error', `HTTP action failed with status ${response.status}`)
        }

        return NextResponse.json({ success: response.ok, triggered: true, data, logs })
      } catch (err: any) {
        log('error', `Network/fetch error: ${err.message}`)
        return NextResponse.json({ success: false, triggered: true, logs })
      }
    }

    if (action.action_type === 'assign_to_human') {
      const humanAgentPhone = mergedConfig.humanAgentPhone || mergedConfig.humanAgentId
      if (!humanAgentPhone) {
        log('error', 'Missing humanAgentPhone in config')
        return NextResponse.json({ success: false, logs })
      }

      log('info', `Looking up contact for phone: ${phone}`)

      // Get or create contact for testing
      let { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id, name')
        .eq('phone', phone)
        .single()

      if (!contact) {
        log('info', `Creating test contact for ${phone}`)
        const { data: newContact, error: createErr } = await supabaseAdmin
          .from('contacts')
          .insert({ phone, name: 'Test User' })
          .select()
          .single()

        if (createErr) {
          log('error', `Failed to create contact: ${createErr.message}`)
        } else {
          contact = newContact
          log('success', `Created test contact: ${contact?.id}`)
        }
      } else {
        log('info', `Found existing contact: ${contact.name || 'Unknown'}`)
      }

      // Get or create conversation
      let conversationId: string | undefined
      if (contact?.id) {
        const { data: conversation } = await supabaseAdmin
          .from('conversations')
          .select('id')
          .eq('contact_id', contact.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (conversation?.id) {
          conversationId = conversation.id
          log('info', `Found conversation: ${conversationId}`)
        } else {
          // Create test conversation
          const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({
              contact_id: contact.id,
              status: 'active',
              labels: ['test-handover']
            })
            .select()
            .single()
          if (newConv) {
            conversationId = newConv.id
            log('success', `Created test conversation: ${conversationId}`)
          }
        }
      }

      // Execute the handover
      log('info', `Sending WhatsApp notification to human agent...`)
      try {
        await notify('escalation_human', {
          'contact.name': contact?.name || phone,
          'contact.phone': phone,
          'escalation.reason': mergedConfig.reason || 'Test handover from agent action',
          'escalation.lastMessage': message,
          'conversation.id': conversationId || 'test'
        }, {
          role: 'human_agent',
          recipients: [String(humanAgentPhone)],
          conversationId,
          contactId: contact?.id
        })

        log('success', `WhatsApp notification sent to human agent`)

        // Also add internal note
        if (conversationId) {
          await notify('escalation_internal_note', {
            'escalation.reason': mergedConfig.reason || 'Test handover',
            'escalation.lastMessage': message
          }, { conversationId })
          log('success', `Internal note added to conversation`)
        }
      } catch (notifyErr: any) {
        log('error', `Failed to send WhatsApp: ${notifyErr.message}`)
      }

      log('success', `Test complete: Conversation assigned to human agent ${humanAgentPhone}`)
      return NextResponse.json({ success: true, triggered: true, logs })
    }

    if (action.action_type === 'notify_dispatch') {
      const notificationType = mergedConfig.notificationType || 'dispatch_pending_order'

      log('info', `Looking up contact for phone: ${phone}`)

      // Get contact
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id, name')
        .eq('phone', phone)
        .single()

      const { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('contact_id', contact?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Get order if specified
      let order = null
      const orderId = mergedConfig.orderId
      if (orderId) {
        const { data: orderData } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        order = orderData
        if (order) log('info', `Found order: ${order.id}`)
      }

      // Execute notification
      log('info', `Sending WhatsApp notification to dispatch team (${notificationType})...`)
      try {
        if (notificationType === 'dispatch_new_order' && order) {
          await notify('dispatch_new_order', {
            'contact.name': contact?.name || phone,
            'contact.phone': phone,
            'order.productName': order.product_name || 'Products',
            'order.qty': String(order.quantity || 1),
            'order.price': order.price?.toFixed(2) || '0.00',
            'order.totalAmount': order.total_amount?.toFixed(2) || '0.00',
            'order.collectionDetails': order.collection_details || 'N/A',
            'order.contactName': order.contact_name || contact?.name || phone,
            'dispatch.timestamp': new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
          }, { role: 'dispatch', conversationId: conversation?.id, orderId: order.id })
        } else if (notificationType === 'pop_received' && order) {
          await notify('pop_received_customer', {}, { conversationId: conversation?.id, contactId: contact?.id })
          await notify('dispatch_new_order', {
            'contact.name': contact?.name || phone,
            'contact.phone': phone,
            'order.productName': order.product_name || 'Products',
            'order.qty': String(order.quantity || 1),
            'order.price': order.price?.toFixed(2) || '0.00',
            'order.totalAmount': order.total_amount?.toFixed(2) || '0.00',
            'order.collectionDetails': order.collection_details || 'N/A',
            'order.contactName': order.contact_name || contact?.name || phone,
            'dispatch.timestamp': new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
          }, { role: 'dispatch', conversationId: conversation?.id, orderId: order.id })
        } else {
          // Default pending order notification
          await notify('dispatch_pending_order', {
            'contact.name': contact?.name || phone,
            'contact.phone': phone,
            'order.productName': order?.product_name || 'Products',
            'order.qty': String(order?.quantity || 1),
            'order.price': order?.price?.toFixed(2) || '0.00',
            'order.totalAmount': order?.total_amount?.toFixed(2) || '0.00',
            'order.collectionDetails': order?.collection_details || 'N/A'
          }, { role: 'dispatch', conversationId: conversation?.id, orderId: order?.id })
        }

        log('success', `WhatsApp notification sent to dispatch team`)

        // Also log to messages
        await supabaseAdmin.from('messages').insert({
          agent_id: agentId,
          sender: 'system',
          phone,
          content: `[Test] ${notificationType} notification sent to dispatch`
        })
      } catch (notifyErr: any) {
        log('error', `Failed to send WhatsApp: ${notifyErr.message}`)
      }

      log('success', `Test complete: Dispatch notified`)
      return NextResponse.json({ success: true, triggered: true, logs })
    }

    // Site connectivity test (bonus diagnostic)
    if (action.action_type === 'product_lookup') {
      log('info', 'Running bonus site connectivity check...')
      try {
        const siteUrl = process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
        const apiSecret = process.env.AGENT_API_SECRET

        if (!apiSecret) {
          log('error', 'AGENT_API_SECRET env var is not set — product search will fail in production')
        } else {
          log('info', `Testing product search at ${siteUrl}/api/agent/products/search?q=umuthi`)
          const startMs = Date.now()
          const res = await fetch(`${siteUrl}/api/agent/products/search?q=umuthi`, {
            headers: { 'x-agent-secret': apiSecret }
          })
          const elapsed = Date.now() - startMs
          const body = await res.json().catch(() => null)
          log('info', `Product search responded: ${res.status} (${elapsed}ms)`)
          if (body) {
            log('info', `Products found: ${body.products?.length ?? 'N/A'}`)
            log('info', `Response: ${JSON.stringify(body).slice(0, 500)}`)
          }
          if (res.ok && body?.success) {
            log('success', 'Site product API is reachable and working')
          } else {
            log('error', `Product API returned error: ${body?.error || res.status}`)
          }
        }
      } catch (err: any) {
        log('error', `Site connectivity failed: ${err.message}`)
      }
    }

    log('info', `Action type "${action.action_type}" test complete (no-op execution)`)
    return NextResponse.json({ success: true, triggered: true, logs })
  } catch (error: any) {
    log('error', `Unexpected error: ${error.message}`)
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 })
  }
}

function parseInstructionConfig(instruction?: string | null): Record<string, any> {
  if (!instruction) return {}
  const trimmed = instruction.trim()
  if (!trimmed.startsWith('{')) return {}
  try {
    const parsed = JSON.parse(trimmed)
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

function interpolate(template: string, values: Record<string, string>) {
  let output = template
  for (const [key, value] of Object.entries(values)) {
    output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return output
}

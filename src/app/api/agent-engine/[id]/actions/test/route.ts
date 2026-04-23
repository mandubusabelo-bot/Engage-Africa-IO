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

    // notify_dispatch fires on ORD- ref in message, not a text trigger — skip trigger check
    const isDispatchAction = action.action_type === 'notify_dispatch'

    // Check trigger match (skipped for notify_dispatch)
    const condition = (action.trigger_condition || '').trim().toLowerCase()
    const message = (sampleMessage || 'I want to buy umuthi wenhlanhla').toLowerCase()

    const triggerTokens = condition
      ? condition.split(/[|,\n]/).map((t: string) => t.trim()).filter(Boolean)
      : []

    const wildcard = triggerTokens.includes('*')
    const matchedToken = triggerTokens.find((token: string) => token !== '*' && message.includes(token))
    const shouldFire = !condition || wildcard || Boolean(matchedToken)

    if (!shouldFire && !isDispatchAction) {
      log('warn', `Trigger condition "${condition}" NOT matched in sample message`)
      log('warn', `Checked tokens: ${triggerTokens.join(', ') || '(none)'}`)
      log('warn', 'Action would NOT fire for this message')
      return NextResponse.json({ success: true, triggered: false, logs })
    }
    if (isDispatchAction) {
      log('info', 'notify_dispatch fires on payment message with ORD- ref — trigger condition not used')
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

      const query = deriveSearchQuery(message)
      const url = interpolate(String(rawUrl), { message, phone, query })
      log('info', `${method} ${url}`)
      log('info', `Derived query: "${query || '(empty -> fetch broad catalog)'}"`)

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(mergedConfig.headers || {})
      }

      const headerKeys = Object.keys(headers).map((k) => k.toLowerCase())
      const needsAgentSecretHeader = url.toLowerCase().includes('/api/agent/')
      const autoAppliedAgentSecret = needsAgentSecretHeader && !headerKeys.includes('x-agent-secret') && Boolean(process.env.AGENT_API_SECRET)
      if (autoAppliedAgentSecret) {
        headers['x-agent-secret'] = process.env.AGENT_API_SECRET as string
      }

      if (needsAgentSecretHeader) {
        if (headers['x-agent-secret']) {
          log(autoAppliedAgentSecret ? 'success' : 'info', autoAppliedAgentSecret ? 'Auto-applied x-agent-secret header for agent API request' : 'Using configured x-agent-secret header')
        } else {
          log('warn', 'Agent API endpoint detected but x-agent-secret is missing (request may fail with 401)')
        }
      }

      const bodyPayload = mergedConfig.body
        ? interpolate(JSON.stringify(mergedConfig.body), { message, phone, query })
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
      // Read dispatch numbers directly from action config
      const configNumbers: string = mergedConfig.dispatchNumbers || mergedConfig.recipients || ''
      const envNumbers: string = process.env.DISPATCH_NUMBERS || process.env.DISPATCH_NUMBER || ''
      log('info', `Config dispatchNumbers: "${configNumbers}"`)
      log('info', `Env DISPATCH_NUMBERS: "${envNumbers}"`)

      const dispatchNumbers = (configNumbers || envNumbers)
        .split(/[,;\n]/).map((n: string) => n.trim()).filter(Boolean)

      if (dispatchNumbers.length === 0) {
        log('error', 'No dispatch numbers found — add numbers to the "Dispatch Numbers" field on this action, or set DISPATCH_NUMBERS env var')
        return NextResponse.json({ success: false, triggered: true, logs })
      }

      log('success', `Found ${dispatchNumbers.length} dispatch number(s): ${dispatchNumbers.join(', ')}`)

      // Send test WhatsApp directly via Evolution API
      const apiUrl = process.env.EVOLUTION_API_URL
      const apiKey = process.env.EVOLUTION_API_KEY
      const instance = process.env.EVOLUTION_INSTANCE_NAME || process.env.EVOLUTION_INSTANCE

      log('info', `Evolution API URL: ${apiUrl || '(NOT SET)'}`)
      log('info', `Evolution Instance: ${instance || '(NOT SET)'}`)
      log('info', `Evolution API Key: ${apiKey ? '***set***' : '(NOT SET)'}`)

      if (!apiUrl || !apiKey || !instance) {
        log('error', 'Evolution API env vars missing (EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME)')
        return NextResponse.json({ success: false, triggered: true, logs })
      }

      const testMsg =
        `🧪 *Dispatch Test Message*\n\n` +
        `📦 *Order Ref:* ORD-TEST-0000\n` +
        `📱 *Customer Phone:* ${phone}\n` +
        `💬 *Note:* This is a test from the Actions page\n` +
        `⏰ ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`

      let allSent = true
      for (const num of dispatchNumbers) {
        const cleanNum = num.replace(/\D/g, '')
        log('info', `Sending to ${cleanNum}...`)
        try {
          const res = await fetch(`${apiUrl}/message/sendText/${instance}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', apikey: apiKey },
            body: JSON.stringify({ number: cleanNum, text: testMsg })
          })
          const body = await res.text()
          if (res.ok) {
            log('success', `WhatsApp sent to ${cleanNum} — HTTP ${res.status}`)
          } else {
            log('error', `Failed to send to ${cleanNum} — HTTP ${res.status}: ${body.slice(0, 200)}`)
            allSent = false
          }
        } catch (err: any) {
          log('error', `Network error sending to ${cleanNum}: ${err.message}`)
          allSent = false
        }
      }

      if (allSent) {
        log('success', 'All dispatch WhatsApp messages sent successfully!')
      }
      return NextResponse.json({ success: allSent, triggered: true, logs })
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

function deriveSearchQuery(message: string): string {
  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(what|do|you|have|in|stock|price|cost|available|please|can|i|want|to|buy|order|for|me|the|a|an|show|find|search|products)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

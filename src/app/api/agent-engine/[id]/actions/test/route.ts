import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

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

    if (condition && !message.includes(condition)) {
      log('warn', `Trigger condition "${condition}" NOT matched in sample message`)
      log('warn', 'Action would NOT fire for this message')
      return NextResponse.json({ success: true, triggered: false, logs })
    }

    log('success', condition ? `Trigger condition "${condition}" matched` : 'No trigger condition — always fires')

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
      const humanAgentId = mergedConfig.humanAgentId
      if (!humanAgentId) {
        log('error', 'Missing humanAgentId in config')
        return NextResponse.json({ success: false, logs })
      }
      log('success', `Would assign conversation to human agent: ${humanAgentId}`)
      return NextResponse.json({ success: true, triggered: true, logs })
    }

    if (action.action_type === 'notify_dispatch') {
      const tpl = mergedConfig.messageTemplate || 'Dispatch alert for {{phone}}: {{message}}'
      const rendered = interpolate(tpl, { phone, message, query: message })
      log('success', `Dispatch message: ${rendered}`)
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

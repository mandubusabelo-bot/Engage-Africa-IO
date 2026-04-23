import { supabaseAdmin } from './supabase-server'
import { notify } from './services/internalNotifier'

type AgentActionRecord = {
  id: string
  action_type: string
  is_enabled: boolean
  trigger_condition: string | null
  instruction: string | null
  priority: 'low' | 'medium' | 'high' | null
  config?: Record<string, any> | null
}

type ActionExecutionResult = {
  actionId: string
  actionType: string
  success: boolean
  summary: string
  data?: any
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

function interpolateTemplate(template: string, values: Record<string, string>) {
  let output = template
  for (const [key, value] of Object.entries(values)) {
    output = output.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return output
}

function deriveSearchQuery(message: string): string {
  const normalized = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(what|do|you|have|in|stock|price|cost|available|please|can|i|want|to|buy|order|for|me|the|a|an|show|find|search|products)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized
}

function parseRecipientNumbers(raw?: string): string[] {
  if (!raw) return []
  return String(raw)
    .split(/[;,\n]/)
    .map((n) => n.trim())
    .filter(Boolean)
}

function shouldTrigger(action: AgentActionRecord, message: string) {
  if (!action.is_enabled) return false
  const condition = (action.trigger_condition || '').trim().toLowerCase()
  const normalizedMessage = message.toLowerCase()

  // assign_to_human: also match common "I want a human" phrases regardless of trigger wording
  if (action.action_type === 'assign_to_human') {
    const humanPhrases = [
      'human', 'agent', 'person', 'operator', 'speak to someone', 'talk to someone',
      'real person', 'call me', 'speak to a person', 'human help', 'human support',
      'not a bot', 'need help', 'escalate', 'supervisor', 'manager'
    ]
    if (humanPhrases.some((p) => normalizedMessage.includes(p))) return true
  }

  if (!condition) return true

  const tokens = condition
    .split(/[|,\n]/)
    .map((t) => t.trim())
    .filter(Boolean)

  if (tokens.length === 0) return true
  if (tokens.includes('*')) return true

  return tokens.some((token) => normalizedMessage.includes(token))
}

async function executeHttpLikeAction(action: AgentActionRecord, message: string, phone: string) {
  const mergedConfig = {
    ...parseInstructionConfig(action.instruction),
    ...(action.config || {})
  }

  const method = (mergedConfig.method || 'POST').toUpperCase()
  const rawUrl = mergedConfig.url || mergedConfig.endpoint
  if (!rawUrl) {
    return {
      actionId: action.id,
      actionType: action.action_type,
      success: false,
      summary: 'Missing URL/endpoint in action config'
    } satisfies ActionExecutionResult
  }

  const query = deriveSearchQuery(message)
  const url = interpolateTemplate(String(rawUrl), {
    message,
    phone,
    query
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(mergedConfig.headers || {})
  }

  const headerKeys = Object.keys(headers).map((k) => k.toLowerCase())
  const needsAgentSecretHeader = url.toLowerCase().includes('/api/agent/')
  if (needsAgentSecretHeader && !headerKeys.includes('x-agent-secret') && process.env.AGENT_API_SECRET) {
    headers['x-agent-secret'] = process.env.AGENT_API_SECRET
  }

  const bodyPayload = mergedConfig.body
    ? interpolateTemplate(JSON.stringify(mergedConfig.body), { message, phone, query })
    : JSON.stringify({ message, phone })

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : bodyPayload
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : await response.text().catch(() => '')

    return {
      actionId: action.id,
      actionType: action.action_type,
      success: response.ok,
      summary: response.ok
        ? `Called ${method} ${url}`
        : `HTTP ${response.status} from ${url}`,
      data
    } satisfies ActionExecutionResult
  } catch (error: any) {
    return {
      actionId: action.id,
      actionType: action.action_type,
      success: false,
      summary: error.message || 'HTTP action failed'
    } satisfies ActionExecutionResult
  }
}

export async function runAgentActions(params: {
  agentId: string
  phone: string
  message: string
}) {
  const { agentId, phone, message } = params

  const { data: actions, error } = await supabaseAdmin
    .from('agent_actions')
    .select('*')
    .eq('agent_id', agentId)
    .eq('is_enabled', true)
    .order('priority', { ascending: false })

  if (error || !actions?.length) {
    return [] as ActionExecutionResult[]
  }

  const results: ActionExecutionResult[] = []

  for (const action of actions as AgentActionRecord[]) {
    if (!shouldTrigger(action, message)) continue

    if (
      action.action_type === 'http_request' ||
      action.action_type === 'webhook_call' ||
      action.action_type === 'product_lookup' ||
      action.action_type === 'create_booking'
    ) {
      const httpResult = await executeHttpLikeAction(action, message, phone)
      results.push(httpResult)
      continue
    }

    if (action.action_type === 'assign_to_human') {
      const mergedConfig = {
        ...parseInstructionConfig(action.instruction),
        ...(action.config || {})
      }
      // Support both humanAgentPhone (UI field) and humanAgentId (legacy) - v2
      const humanAgentPhone = mergedConfig.humanAgentPhone || mergedConfig.humanAgentId
      if (!humanAgentPhone) {
        results.push({
          actionId: action.id,
          actionType: action.action_type,
          success: false,
          summary: 'Missing humanAgentPhone in action config'
        })
        continue
      }

      // Get contact info for notification
      const { data: contact } = await supabaseAdmin
        .from('contacts')
        .select('id, name, assigned_agent_id')
        .eq('phone', phone)
        .single()

      const { data: conversation } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('contact_id', contact?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      // Send WhatsApp notification to human agent using template
      if (conversation?.id && contact?.id) {
        await notify('escalation_human', {
          'contact.name': contact.name || phone,
          'contact.phone': phone,
          'escalation.reason': mergedConfig.reason || 'Customer needs human assistance',
          'escalation.lastMessage': message,
          'conversation.id': conversation.id
        }, {
          role: 'human_agent',
          recipients: [String(humanAgentPhone)],
          conversationId: conversation.id,
          contactId: contact.id
        })

        // Add internal note
        await notify('escalation_internal_note', {
          'escalation.reason': mergedConfig.reason || 'Customer needs human assistance',
          'escalation.lastMessage': message
        }, { conversationId: conversation.id })
      }

      results.push({
        actionId: action.id,
        actionType: action.action_type,
        success: true,
        summary: `Notified human agent ${humanAgentPhone} via WhatsApp`
      })
      continue
    }

    if (action.action_type === 'notify_dispatch') {
      const mergedConfig = {
        ...parseInstructionConfig(action.instruction),
        ...(action.config || {})
      }
      const dispatchRecipients = parseRecipientNumbers(mergedConfig.dispatchNumbers || mergedConfig.recipients)

      // Get contact info
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

      // Determine notification type based on config
      const notificationType = mergedConfig.notificationType || 'dispatch_pending_order'
      const orderId = mergedConfig.orderId

      // Get order details if available
      let order = null
      if (orderId) {
        const { data: orderData } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        order = orderData
      }

      // Send notification using template
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
        }, { role: 'dispatch', recipients: dispatchRecipients, conversationId: conversation?.id, orderId: order.id })
      } else if (notificationType === 'pop_received' && order) {
        // POP received notification
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
        }, { role: 'dispatch', recipients: dispatchRecipients, conversationId: conversation?.id, orderId: order.id })
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
        }, { role: 'dispatch', recipients: dispatchRecipients, conversationId: conversation?.id, orderId: order?.id })
      }

      // Also log to messages for audit trail
      const { error: insertError } = await supabaseAdmin.from('messages').insert({
        agent_id: agentId,
        sender: 'system',
        phone,
        content: `[Dispatch Notice] ${notificationType} notification sent to dispatch team`
      })

      results.push({
        actionId: action.id,
        actionType: action.action_type,
        success: !insertError,
        summary: `Dispatch notified via WhatsApp: ${notificationType}`
      })
      continue
    }

    results.push({
      actionId: action.id,
      actionType: action.action_type,
      success: true,
      summary: 'No-op action recorded'
    })
  }

  return results
}

import { supabaseAdmin } from './supabase-server'

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

function shouldTrigger(action: AgentActionRecord, message: string) {
  if (!action.is_enabled) return false
  const condition = (action.trigger_condition || '').trim().toLowerCase()
  if (!condition) return true
  return message.toLowerCase().includes(condition)
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

  const url = interpolateTemplate(String(rawUrl), {
    message,
    phone,
    query: message
  })

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(mergedConfig.headers || {})
  }

  const bodyPayload = mergedConfig.body
    ? interpolateTemplate(JSON.stringify(mergedConfig.body), { message, phone, query: message })
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
      const humanAgentId = mergedConfig.humanAgentId
      if (!humanAgentId) {
        results.push({
          actionId: action.id,
          actionType: action.action_type,
          success: false,
          summary: 'Missing humanAgentId in action config'
        })
        continue
      }

      const { error: assignError } = await supabaseAdmin
        .from('contacts')
        .update({ assigned_agent_id: humanAgentId, updated_at: new Date().toISOString() })
        .eq('phone', phone)

      results.push({
        actionId: action.id,
        actionType: action.action_type,
        success: !assignError,
        summary: assignError ? assignError.message : `Assigned conversation to human agent ${humanAgentId}`
      })
      continue
    }

    if (action.action_type === 'notify_dispatch') {
      const mergedConfig = {
        ...parseInstructionConfig(action.instruction),
        ...(action.config || {})
      }
      const noteTemplate = mergedConfig.messageTemplate || 'Dispatch alert for {{phone}}: {{message}}'
      const dispatchNote = interpolateTemplate(noteTemplate, { phone, message, query: message })

      const { error: insertError } = await supabaseAdmin.from('messages').insert({
        agent_id: agentId,
        sender: 'system',
        phone,
        content: `[Dispatch Notice] ${dispatchNote}`
      })

      results.push({
        actionId: action.id,
        actionType: action.action_type,
        success: !insertError,
        summary: insertError ? insertError.message : 'Dispatch notice logged'
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

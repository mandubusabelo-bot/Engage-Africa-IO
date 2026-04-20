import { loadPrompt } from './promptLoader'
import { renderTemplate } from './templateRenderer'
import { getStaffNumbers } from './staffLoader'
import { sendWhatsApp } from './evolutionNotifier'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function notify(
  triggerKey: string,
  variables: Record<string, string | undefined>,
  options?: {
    role?: 'dispatch' | 'human_agent' | 'disputes'
    recipients?: string[]
    conversationId?: string
    contactId?: string
    orderId?: string
  }
): Promise<void> {
  const prompt = await loadPrompt(triggerKey)

  if (!prompt) {
    console.warn(`No active prompt found for: ${triggerKey}`)
    return
  }

  const message = renderTemplate(prompt.template, variables)

  if (prompt.channel === 'whatsapp') {
    const numbers = options?.recipients?.length
      ? options.recipients
      : (options?.role ? await getStaffNumbers(options.role) : [])

    const normalizedNumbers = numbers
      .map(normalizePhone)
      .filter((n): n is string => Boolean(n))

    if (!normalizedNumbers.length) {
      console.warn(`No recipients available for trigger: ${triggerKey}`)
      return
    }

    const results = await Promise.allSettled(
      normalizedNumbers.map(n => sendWhatsApp(n, message))
    )
    await logNotifications(triggerKey, options?.role || 'direct', normalizedNumbers, message, options, results)
    return
  }

  if (prompt.channel === 'conversation' && options?.conversationId) {
    await sendToConversation(options.conversationId, message, options.contactId)
    return
  }

  if (prompt.channel === 'internal_note' && options?.conversationId) {
    await addInternalNote(options.conversationId, message)
    return
  }
}

function normalizePhone(raw?: string) {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('27')) return digits
  if (digits.startsWith('0')) return `27${digits.slice(1)}`
  return digits
}

async function logNotifications(
  triggerKey: string,
  role: string,
  numbers: string[],
  message: string,
  options: any,
  results: PromiseSettledResult<any>[]
) {
  await Promise.all(
    numbers.map((number, i) => {
      const result = results[i]
      const success = result.status === 'fulfilled' && result.value?.success
      return supabaseAdmin.from('internal_notification_logs').insert({
        trigger_key: triggerKey,
        role,
        recipient: number,
        rendered_message: message.slice(0, 500),
        conversation_id: options?.conversationId,
        reference_id: options?.orderId,
        status: success ? 'sent' : 'failed',
        error: success ? null : (result.status === 'rejected' ? result.reason : result.value?.error)
      })
    })
  )
}

async function sendToConversation(
  conversationId: string,
  message: string,
  contactId?: string
) {
  // Save as AI message in the conversation
  const { error } = await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    content: message,
    sender_type: 'ai',
    contact_id: contactId || null
  })

  if (error) {
    console.error('Failed to send to conversation:', error)
  }
}

async function addInternalNote(
  conversationId: string,
  message: string
) {
  // Save as internal note (private message)
  const { error } = await supabaseAdmin.from('messages').insert({
    conversation_id: conversationId,
    content: message,
    sender_type: 'system',
    metadata: { is_internal_note: true }
  })

  if (error) {
    console.error('Failed to add internal note:', error)
  }
}

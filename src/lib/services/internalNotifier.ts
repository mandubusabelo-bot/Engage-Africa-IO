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

  if (prompt.channel === 'whatsapp' && options?.role) {
    const numbers = await getStaffNumbers(options.role)
    const results = await Promise.allSettled(
      numbers.map(n => sendWhatsApp(n, message))
    )
    await logNotifications(triggerKey, options.role, numbers, message, options, results)
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

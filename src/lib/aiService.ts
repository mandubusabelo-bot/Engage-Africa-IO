/**
 * aiService.ts — Refactored
 * ─────────────────────────
 * PRINCIPLE: The LLM always writes the reply. The code only:
 *   1. Fetches context (contact, agent, history, knowledge base, bookings, orders)
 *   2. Builds a system prompt from the database
 *   3. Injects context into that prompt
 *   4. Sends everything to the LLM
 *   5. Forwards the LLM reply to WhatsApp
 *
 * NEVER hardcode customer-facing messages in this file.
 * All tone, phrasing, and flow logic lives in the agent's system prompt in the database.
 */

import { supabaseAdmin } from './supabase-server'
import {
  emitConversationOpened,
  emitAgentAssigned,
  emitWhatsAppMessageReceived,
  emitWhatsAppMessageSent
} from './workflowTriggers'
import {
  checkBookingAvailability,
  checkBookingsForPhone,
  checkOrderStatus
} from './orderService'
import { runAgentActions } from './agentActions'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface Agent {
  id: string
  agent_name?: string
  name?: string
  system_prompt?: string
  greeting_message?: string
  tone?: string
  rule_limit_emojis?: boolean
  rule_concise?: boolean
  custom_rules?: string
  never_say?: string
  fallback_message?: string
}

interface Contact {
  id?: string
  name?: string
  phone?: string
  assigned_agent_id?: string
  greeting_sent?: boolean
}

// ─── AI provider ─────────────────────────────────────────────────────────────

export async function getAIResponseWithHistory(messages: Message[]): Promise<string> {
  const openrouterKey = process.env.OPENROUTER_API_KEY
  if (openrouterKey) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://engage-africa.io'
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
          messages
        })
      })
      const data = await response.json()
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content
      }
      console.error('[AI] OpenRouter unexpected response:', JSON.stringify(data).slice(0, 200))
    } catch (err: any) {
      console.error('[AI] OpenRouter error:', err.message)
    }
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const systemMsg = messages.find(m => m.role === 'system')?.content || ''
      const chatHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      const chat = model.startChat({ history: chatHistory.slice(0, -1), systemInstruction: systemMsg })
      const lastMsg = chatHistory[chatHistory.length - 1]?.parts[0]?.text || ''
      const result = await chat.sendMessage(lastMsg)
      return result.response.text()
    } catch (err: any) {
      console.error('[AI] Gemini error:', err.message)
    }
  }

  console.warn('[AI] No AI key configured')
  return `Thank you for your message! Our team will get back to you shortly.` 
}

// ─── WhatsApp sender ──────────────────────────────────────────────────────────

export async function sendWhatsAppReply(phone: string, message: string): Promise<void> {
  const evolutionApiUrl = process.env.EVOLUTION_API_URL
  const evolutionApiKey = process.env.EVOLUTION_API_KEY
  const instanceName = process.env.EVOLUTION_INSTANCE_NAME

  if (!evolutionApiUrl || !evolutionApiKey || !instanceName) {
    console.error('[WhatsApp] Missing Evolution API env vars')
    return
  }

  try {
    const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'apikey': evolutionApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text: message })
    })
    const data = await response.json()
    if (response.ok) {
      console.log(`[WhatsApp] Sent to ${phone}`)
    } else {
      console.error('[WhatsApp] Send failed:', response.status, JSON.stringify(data))
    }
  } catch (err: any) {
    console.error('[WhatsApp] Send error:', err.message)
  }
}

// ─── Knowledge base ───────────────────────────────────────────────────────────

async function getKnowledgeBaseContext(agentId: string | null): Promise<string | null> {
  if (!agentId) return null
  try {
    const { data: kb } = await supabaseAdmin
      .from('knowledge_base')
      .select('content')
      .eq('agent_id', agentId)
      .limit(5)

    if (kb && kb.length > 0) {
      return `KNOWLEDGE BASE:\n${kb.map((k: any) => k.content).join('\n\n')}` 
    }

    const { data: globalKb } = await supabaseAdmin
      .from('knowledge_base')
      .select('content')
      .is('agent_id', null)
      .limit(5)

    if (globalKb && globalKb.length > 0) {
      return `KNOWLEDGE BASE:\n${globalKb.map((k: any) => k.content).join('\n\n')}` 
    }
  } catch (err) {
    console.error('[KB] Error fetching knowledge base:', err)
  }
  return null
}

// ─── Context injectors (adds info to system prompt — never writes replies) ────

async function injectGreetingRule(
  systemPrompt: string,
  phone: string,
  contactName: string,
  agent: Agent
): Promise<{ systemPrompt: string; greetingSent: boolean; sendGreetingNow: boolean }> {
  // Check if greeting was already sent
  const { data: convMeta } = await supabaseAdmin
    .from('conversations')
    .select('id, greeting_sent')
    .eq('contact_phone', phone)
    .maybeSingle()

  let greetingSent = convMeta?.greeting_sent === true

  if (!greetingSent) {
    const { data: priorAgentMessages } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('phone', phone)
      .in('sender', ['agent', 'ai', 'bot'])
      .limit(1)
    greetingSent = (priorAgentMessages?.length || 0) > 0
  }

  if (!greetingSent) {
    // Tell the LLM to greet, using the greeting from the database
    const greetingInstruction = agent.greeting_message
      ? `GREETING INSTRUCTION: This is the first message from this contact. Start your response with this greeting (replace {{contact.name}} with the actual name): "${agent.greeting_message}". Then directly address what they said.` 
      : `GREETING INSTRUCTION: This is the first message from this contact. Greet them warmly using the tone defined in your system prompt, then address what they said.` 

    systemPrompt += `\n\n${greetingInstruction}` 

    // Mark as greeted in DB (best effort)
    if (convMeta?.id) {
      await supabaseAdmin.from('conversations').update({ greeting_sent: true }).eq('id', convMeta.id)
    } else {
      await supabaseAdmin.from('conversations').insert({
        contact_phone: phone,
        contact_name: contactName,
        greeting_sent: true,
        status: 'open'
      })
    }

    return { systemPrompt, greetingSent: false, sendGreetingNow: true }
  }

  // Already greeted — tell LLM not to greet again
  systemPrompt += `\n\nIMPORTANT: You have already greeted this contact. Do NOT say hello, hi, sawubona, or introduce yourself again. Start your reply by directly addressing what they said.` 
  return { systemPrompt, greetingSent: true, sendGreetingNow: false }
}

async function injectBookingContext(systemPrompt: string, message: string): Promise<string> {
  const checkBookingKeywords = /\b(my booking|check booking|booking status|when is my|appointment status)\b/i
  const bookingKeywords = /\b(book|consultation|consult|appointment|schedule|available|slot|booking)\b/i

  if (checkBookingKeywords.test(message)) {
    // Customer asking about existing booking
    // Note: phone is not available here — pass it through if needed
    systemPrompt += `\n\n[CONTEXT] Customer is asking about an existing booking. Ask them for their reference number or phone number if you need to look it up.` 
  } else if (bookingKeywords.test(message)) {
    const availResult = await checkBookingAvailability(14)
    if (availResult.success && availResult.total_slots && availResult.total_slots > 0) {
      const slotSummary = Object.entries(availResult.availability || {})
        .slice(0, 5)
        .map(([date, slots]: [string, any]) => {
          const dateStr = new Date(date).toLocaleDateString('en-ZA', {
            weekday: 'short', day: 'numeric', month: 'short'
          })
          return `${dateStr}: ${slots.map((s: any) => s.time).join(', ')}` 
        })
        .join('\n')
      systemPrompt += `\n\n[AVAILABLE CONSULTATION SLOTS — next 14 days, ${availResult.total_slots} total]:\n${slotSummary}\nConsultation fee: R150. To book: need name, phone, preferred date & time.` 
    } else {
      systemPrompt += `\n\n[AVAILABILITY] No consultation slots available in the next 14 days. Advise the customer to contact us directly on 062 584 2441.` 
    }
  }
  return systemPrompt
}

async function injectOrderContext(systemPrompt: string, message: string, phone: string): Promise<string> {
  const orderCheckKeywords = /\b(order status|track order|where is my order|check my order|order ref|ORD-)\b/i

  if (orderCheckKeywords.test(message)) {
    const orderRefMatch = message.match(/ORD-[A-Z0-9-]+/i)
    if (orderRefMatch) {
      const orderResult = await checkOrderStatus(orderRefMatch[0])
      if (orderResult.success && orderResult.order) {
        const o = orderResult.order
        systemPrompt += `\n\n[ORDER STATUS for ${o.order_ref}]:\n- Status: ${o.order_status}\n- Payment: ${o.payment_status}\n- Total: R${o.total}\n- Items: ${o.items?.map((i: any) => `${i.quantity}x ${i.product_name}`).join(', ') || 'N/A'}\n- Placed: ${new Date(o.created_at).toLocaleDateString('en-ZA')}` 
      } else {
        systemPrompt += `\n\n[ORDER STATUS] No order found with reference "${orderRefMatch[0]}". Ask the customer to double-check their reference number.` 
      }
    } else {
      systemPrompt += `\n\n[ORDER STATUS] Customer is asking about an order but hasn't provided a reference number. Ask them for it (format: ORD-XXXXX).` 
    }
  }
  return systemPrompt
}

async function injectActionResults(systemPrompt: string, agentId: string, phone: string, message: string): Promise<string> {
  const actionResults = await runAgentActions({ agentId, phone, message })
  if (actionResults.length > 0) {
    const actionContext = actionResults
      .map((result: any) => {
        const base = `- ${result.actionType}: ${result.success ? 'success' : 'failed'} (${result.summary})` 
        return result.data ? `${base}\n  data: ${JSON.stringify(result.data).slice(0, 500)}` : base
      })
      .join('\n')
    systemPrompt += `\n\nAUTOMATION RESULTS:\n${actionContext}` 
  }
  return systemPrompt
}

// ─── Build system prompt entirely from database ───────────────────────────────

function buildSystemPrompt(agent: Agent, contactName: string): string {
  // Start with the agent's system prompt from the database — this is the source of truth
  let prompt = agent?.system_prompt || 'You are a helpful AI assistant.'

  // Append agent identity if defined
  if (agent?.agent_name) {
    prompt += `\n\nYour name is ${agent.agent_name}.` 
  }

  // Tone
  if (agent?.tone) {
    prompt += `\n\nTone: ${agent.tone}` 
  }

  // Emoji rule
  if (agent?.rule_limit_emojis !== false) {
    prompt += `\n\nUse a maximum of 1 emoji per response.` 
  }

  // Concise rule
  if (agent?.rule_concise) {
    prompt += `\n\nKeep responses brief unless the user asks for detail.` 
  }

  // Custom rules from database
  if (agent?.custom_rules) {
    prompt += `\n\nADDITIONAL RULES:\n${agent.custom_rules}` 
  }

  // Never say
  if (agent?.never_say) {
    prompt += `\n\nNEVER use: ${agent.never_say}` 
  }

  // Fallback
  if (agent?.fallback_message) {
    prompt += `\n\nIf you cannot help: ${agent.fallback_message}` 
  }

  prompt += `\n\nYou are speaking with ${contactName}.` 

  return prompt
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleIncomingWhatsApp(
  phone: string,
  message: string,
  pushName?: string
): Promise<void> {
  try {
    console.log(`[Handler] Incoming from ${phone}: "${message.slice(0, 80)}"`)

    // Emit incoming trigger
    await emitWhatsAppMessageReceived(phone, message, pushName)

    // ── 1. Get or create contact ──────────────────────────────────────────────
    let { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .single()

    const contactName = pushName || contact?.name || phone.split('@')[0]

    if (!contact) {
      const { data: newContacts } = await supabaseAdmin
        .from('contacts')
        .insert({ phone, name: contactName, last_message_at: new Date().toISOString() })
        .select()
      contact = newContacts?.[0] || { name: contactName, phone }
      if (contact?.id) await emitConversationOpened(contact.id, phone)
      console.log(`[Handler] New contact: ${contactName}`)
    } else {
      await supabaseAdmin
        .from('contacts')
        .update({ last_message_at: new Date().toISOString(), ...(pushName && { name: pushName }) })
        .eq('phone', phone)
    }

    // ── 2. Get or assign agent ────────────────────────────────────────────────
    let agent: Agent | null = null

    if (contact?.assigned_agent_id) {
      const { data } = await supabaseAdmin.from('agents').select('*').eq('id', contact.assigned_agent_id).single()
      agent = data
    }

    if (!agent) {
      const { data: agents } = await supabaseAdmin.from('agents').select('*').eq('is_active', true).limit(1)
      agent = agents?.[0] || null

      if (!agent) {
        const { data: fallback } = await supabaseAdmin.from('agents').select('*').limit(1)
        agent = fallback?.[0] || null
      }

      if (agent && contact?.id) {
        await supabaseAdmin.from('contacts').update({ assigned_agent_id: agent.id }).eq('phone', phone)
        await emitAgentAssigned(contact.id, agent.id, agent.agent_name || agent.name || 'Agent')
      }
    }

    console.log(`[Handler] Agent: ${agent?.agent_name || agent?.name || 'none'}`)

    // ── 3. Save incoming message to DB ───────────────────────────────────────
    await supabaseAdmin.from('messages').insert({
      agent_id: agent?.id || null,
      content: message,
      sender: 'user',
      phone
    })

    // ── 4. Build system prompt from database agent ────────────────────────────
    let systemPrompt = buildSystemPrompt(agent || {} as Agent, contactName)

    // ── 5. Inject knowledge base ──────────────────────────────────────────────
    const knowledgeBase = await getKnowledgeBaseContext(agent?.id || null)
    if (knowledgeBase) {
      systemPrompt += `\n\n${knowledgeBase}` 
    }

    // ── 6. Inject greeting rule (tells LLM whether to greet or not) ───────────
    const greetingResult = await injectGreetingRule(systemPrompt, phone, contactName, agent || {} as Agent)
    systemPrompt = greetingResult.systemPrompt

    // ── 7. Inject contextual data (bookings, orders, action results) ──────────
    systemPrompt = await injectBookingContext(systemPrompt, message)
    systemPrompt = await injectOrderContext(systemPrompt, message, phone)

    if (agent?.id) {
      systemPrompt = await injectActionResults(systemPrompt, agent.id, phone, message)
    }

    // ── 8. Fetch conversation history ─────────────────────────────────────────
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('content, sender, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(30)

    const history = (recentMessages || []).reverse()

    // ── 9. Build messages array for LLM ──────────────────────────────────────
    const llmMessages: Message[] = [{ role: 'system', content: systemPrompt }]

    history.forEach((msg: any) => {
      // Don't re-add the current message if it's already the last in history
      llmMessages.push({
        role: msg.sender === 'agent' || msg.sender === 'ai' || msg.sender === 'bot' ? 'assistant' : 'user',
        content: msg.content
      })
    })

    // Ensure current message is the last user message
    const lastMsg = llmMessages[llmMessages.length - 1]
    if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== message) {
      llmMessages.push({ role: 'user', content: message })
    }

    console.log(`[Handler] Sending ${llmMessages.length} messages to LLM`)
    console.log(`[Handler] System prompt preview: ${systemPrompt.slice(0, 300)}...`)

    // ── 10. Get LLM response ──────────────────────────────────────────────────
    const aiResponse = await getAIResponseWithHistory(llmMessages)
    console.log(`[Handler] LLM response: "${aiResponse.slice(0, 100)}"`)

    // ── 11. Save response and send ────────────────────────────────────────────
    await supabaseAdmin.from('messages').insert({
      agent_id: agent?.id || null,
      content: aiResponse,
      sender: 'agent',
      phone
    })

    await sendWhatsAppReply(phone, aiResponse)
    await emitWhatsAppMessageSent(phone, aiResponse)

  } catch (error: any) {
    console.error('[Handler] Unhandled error:', error.message)
    console.error('[Handler] Stack:', error.stack)
    throw error
  }
}

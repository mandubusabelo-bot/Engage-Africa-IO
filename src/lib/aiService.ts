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
  createOrderFromConversation,
  extractOrderDetails,
  getMissingInfo,
  checkBookingAvailability,
  createBooking,
  extractBookingDetails,
  getMissingBookingInfo,
  checkBookingsForPhone,
  checkOrderStatus,
  searchAgentProducts,
  updateContactFromOrder
} from './orderService'
import { runAgentActions } from './agentActions'
import { notify } from './services/internalNotifier'
import { sendPaymentOptionsInteractive } from './services/evolutionNotifier'

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
      const systemMsg = messages.find(m => m.role === 'system')?.content || ''
      const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })
      
      // Prepend system message to first user message
      const chatHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }))
      
      // Add system instruction as first message if present
      if (systemMsg && chatHistory.length > 0) {
        chatHistory[0].parts[0].text = `${systemMsg}\n\nUser: ${chatHistory[0].parts[0].text}`
      }
      
      const chat = model.startChat({ history: chatHistory.slice(0, -1) })
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

function normalizePhoneForBooking(phone: string): string {
  const digits = phone.replace(/@.*/, '').replace(/\D/g, '')
  if (digits.startsWith('27') && digits.length >= 11) return digits
  if (digits.startsWith('0') && digits.length === 10) return `27${digits.slice(1)}`
  return digits
}

async function injectBookingContext(systemPrompt: string, message: string, phone: string, history: any[]): Promise<string> {
  const checkBookingKeywords = /\b(my booking|check booking|booking status|when is my|appointment status)\b/i
  const bookingKeywords = /\b(book|consultation|consult|appointment|schedule|available|slot|booking)\b/i
  const bookingConfirmIntent = /\b(confirm|book now|go ahead|proceed|yes book|yes please book|ready to book|book it)\b/i.test(message)

  if (checkBookingKeywords.test(message)) {
    const bookingCheck = await checkBookingsForPhone(normalizePhoneForBooking(phone))
    if (bookingCheck.success) {
      if ((bookingCheck.count || 0) > 0) {
        const latest = bookingCheck.bookings?.[0]
        systemPrompt += `\n\n[BOOKING STATUS] Found ${bookingCheck.count} booking(s) for this phone.${latest ? ` Latest: ${latest.reference || latest.id} on ${latest.date} at ${latest.time}, status ${latest.booking_status}, payment ${latest.payment_status}.` : ''}`
      } else {
        systemPrompt += `\n\n[BOOKING STATUS] No bookings found for this phone number. Ask the customer if they want to create a new booking.`
      }
    } else {
      systemPrompt += `\n\n[BOOKING STATUS CHECK FAILED] ${bookingCheck.error || 'Unknown error'}. Ask for booking reference and retry shortly.`
    }
    return systemPrompt
  }

  if (bookingKeywords.test(message)) {
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
      return systemPrompt
    }

    const extracted = extractBookingDetails(message, history)
    if (!extracted) return systemPrompt

    const normalizedPhone = normalizePhoneForBooking(phone)
    const bookingDetails = {
      clientName: extracted.clientName,
      clientPhone: extracted.clientPhone || normalizedPhone,
      bookingDate: extracted.bookingDate,
      startTime: extracted.startTime,
      consultationType: extracted.consultationType || 'video',
      notes: extracted.notes
    }

    const missing = getMissingBookingInfo(bookingDetails)
    if (missing.length > 0) {
      systemPrompt += `\n\n[BOOKING DETAILS PARTIAL] Missing: ${missing.join(', ')}. Ask only for these booking fields.`
      return systemPrompt
    }

    if (!bookingConfirmIntent) {
      systemPrompt += `\n\n[BOOKING READY TO CREATE]\n- Name: ${bookingDetails.clientName}\n- Phone: ${bookingDetails.clientPhone}\n- Date: ${bookingDetails.bookingDate}\n- Time: ${bookingDetails.startTime}\n- Type: ${bookingDetails.consultationType}\nAsk for explicit confirmation before creating booking.`
      return systemPrompt
    }

    const bookingResult = await createBooking({
      clientName: bookingDetails.clientName as string,
      clientPhone: bookingDetails.clientPhone as string,
      bookingDate: bookingDetails.bookingDate as string,
      startTime: bookingDetails.startTime as string,
      consultationType: bookingDetails.consultationType,
      notes: bookingDetails.notes
    })

    if (bookingResult.success && bookingResult.booking) {
      systemPrompt += `\n\n[BOOKING CREATED]\n- Reference: ${bookingResult.booking.reference || bookingResult.booking.id}\n- Date: ${bookingResult.booking.date}\n- Time: ${bookingResult.booking.time}\n- Type: ${bookingResult.booking.type}\n- Amount: R${Number(bookingResult.booking.amount || 0).toFixed(2)}\nConfirm booking creation to customer and share payment steps.`
    } else {
      systemPrompt += `\n\n[BOOKING CREATION FAILED] ${bookingResult.error || 'Unknown error'}. Help customer adjust date/time and retry.`
    }
  }

  return systemPrompt
}

function extractProductSearchQuery(message: string): string {
  const cleaned = message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(i|want|need|buy|order|please|for|me|the|a|an|to|show|find|looking|search|price|stock|of)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned
}

async function injectCommerceContext(
  systemPrompt: string,
  message: string,
  phone: string,
  history: any[]
): Promise<string> {
  const productIntent = /\b(price|stock|available|have|product|umuthi|buy|order|purchase|cost)\b/i.test(message)
  const confirmIntent = /\b(confirm|place order|go ahead|proceed|yes order|yes please order|ready to order|order now|place it|do it|yes proceed|yes go ahead)\b/i.test(message)

  if (productIntent) {
    const query = extractProductSearchQuery(message)
    const search = await searchAgentProducts(query, 5)
    if (search.success && search.products.length > 0) {
      const stockLines = search.products
        .slice(0, 5)
        .map((p: any) => `- ${p.name}: R${Number(p.price || 0).toFixed(2)} (stock: ${p.stock_quantity ?? 'unknown'})`)
        .join('\n')

      systemPrompt += `\n\n[LIVE PRODUCT STOCK for query "${query || '(all products)'}"]:\n${stockLines}\nOnly promise products with stock > 0 (or unknown stock). If exact product is unavailable, suggest closest in-stock alternatives.`
    } else if (search.error) {
      systemPrompt += `\n\n[PRODUCT LOOKUP ERROR] ${search.error}. Ask the customer to retry shortly or specify the exact product name.`
    }
  }

  const details = extractOrderDetails(message, history)
  if (!details) return systemPrompt

  await updateContactFromOrder(phone, details)

  const missing = getMissingInfo(details)
  if (missing.length > 0) {
    systemPrompt += `\n\n[ORDER DETAILS PARTIAL] Extracted product: ${details.productName}. Missing: ${missing.join(', ')}. Ask only for these missing fields.`
    return systemPrompt
  }

  if (!confirmIntent) {
    systemPrompt += `\n\n[ORDER READY TO PLACE]\n- Product: ${details.productName}\n- Qty: ${details.quantity || 1}\n- Name: ${details.customerName}\n- Phone: ${details.customerPhone}\n- Delivery: ${details.deliveryMethod} to ${details.deliveryLocation}\nAsk for explicit confirmation before placing order.`
    return systemPrompt
  }

  const orderResult = await createOrderFromConversation(phone, details)
  if (orderResult.success) {
    if (orderResult.paymentUrl) {
      systemPrompt += `\n\n[ORDER CREATED]\n- Reference: ${orderResult.orderRef}\n- Payment Link: ${orderResult.paymentUrl}\nCRITICAL RESPONSE RULE: The order is already created. Reply with a direct confirmation and provide THIS exact payment portal link first: ${orderResult.paymentUrl}. Do NOT send the customer back to the generic shop/catalog URL. Ask the customer to complete payment using this portal link and then share POP.`
    } else {
      systemPrompt += `\n\n[ORDER CREATED]\n- Reference: ${orderResult.orderRef}\n- Payment Link: not available\nConfirm order creation to customer. Explain that the payment portal link is temporarily unavailable, then provide EFT as fallback and ask for POP.`
    }
  } else {
    systemPrompt += `\n\n[ORDER CREATION FAILED] ${orderResult.error || 'Unknown error'}. Explain the issue and help customer adjust product/quantity or details.`
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
    const fallback = agent.fallback_message.replace(/\{\{contact\.name\}\}/g, contactName)
    prompt += `\n\nIf you cannot help: ${fallback}` 
  }

  prompt += `\n\nYou are speaking with ${contactName}.` 

  return prompt
}

// ─── Internal Routing Triggers ────────────────────────────────────────────────

async function triggerPopReceived(
  phone: string,
  contactName: string,
  contactId: string,
  conversationId: string
) {
  // Find active order for this contact
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('contact_id', contactId)
    .in('status', ['collecting', 'awaiting_pop'])
    .order('created_at', { ascending: false })
    .limit(1)

  const order = orders?.[0]
  if (!order) return

  // Notify customer
  await notify('pop_received_customer', {}, { conversationId, contactId })

  // Notify dispatch
  await notify('dispatch_new_order', {
    'contact.name': contactName,
    'contact.phone': phone,
    'order.productName': order.product_name || 'Products',
    'order.qty': String(order.quantity || 1),
    'order.price': order.price?.toFixed(2) || '0.00',
    'order.totalAmount': order.total_amount?.toFixed(2) || order.price?.toFixed(2) || '0.00',
    'order.collectionDetails': order.collection_details || order.delivery_address || 'N/A',
    'order.contactName': order.contact_name || contactName,
    'dispatch.timestamp': new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
  }, { role: 'dispatch', conversationId, orderId: order.id })

  // Update order status
  await supabaseAdmin
    .from('orders')
    .update({ status: 'pop_received', updated_at: new Date().toISOString() })
    .eq('id', order.id)

  // Add internal note
  await notify('escalation_internal_note', {
    'escalation.reason': 'Proof of payment received',
    'escalation.lastMessage': 'Image/Pop uploaded by customer'
  }, { conversationId })

  // Add labels to conversation
  await addConversationLabels(conversationId, ['pop-received', 'awaiting-dispatch'])
}

async function triggerPendingOrderNotification(
  phone: string,
  contactName: string,
  contactId: string,
  conversationId: string
) {
  // Find the most recent order awaiting payment
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('contact_id', contactId)
    .in('status', ['awaiting_payment', 'collecting'])
    .order('created_at', { ascending: false })
    .limit(1)

  const order = orders?.[0]
  if (!order) return

  // Notify dispatch about pending order
  await notify('dispatch_pending_order', {
    'contact.name': contactName,
    'contact.phone': phone,
    'order.productName': order.product_name || 'Products',
    'order.qty': String(order.quantity || 1),
    'order.price': order.price?.toFixed(2) || '0.00',
    'order.totalAmount': order.total_amount?.toFixed(2) || order.price?.toFixed(2) || '0.00',
    'order.collectionDetails': order.collection_details || order.delivery_address || 'N/A'
  }, { role: 'dispatch', conversationId, orderId: order.id })

  // Update order status to awaiting_payment
  await supabaseAdmin
    .from('orders')
    .update({ status: 'awaiting_payment', updated_at: new Date().toISOString() })
    .eq('id', order.id)
}

async function triggerHumanEscalation(
  phone: string,
  contactName: string,
  contactId: string,
  conversationId: string,
  reason: string,
  lastMessage: string
) {
  // Notify human agent
  await notify('escalation_human', {
    'contact.name': contactName,
    'contact.phone': phone,
    'escalation.reason': reason,
    'escalation.lastMessage': lastMessage,
    'conversation.id': conversationId
  }, { role: 'human_agent', conversationId, contactId })

  // Add internal note
  await notify('escalation_internal_note', {
    'escalation.reason': reason,
    'escalation.lastMessage': lastMessage
  }, { conversationId })

  // Add label
  await addConversationLabels(conversationId, ['needs-human'])

  // Update conversation status
  await supabaseAdmin
    .from('conversations')
    .update({ 
      status: 'pending_human',
      assigned_to_human: true,
      escalation_reason: reason,
      updated_at: new Date().toISOString()
    })
    .eq('id', conversationId)
}

async function addConversationLabels(conversationId: string, labels: string[]) {
  const { data: conv } = await supabaseAdmin
    .from('conversations')
    .select('labels')
    .eq('id', conversationId)
    .single()

  const currentLabels = conv?.labels || []
  const newLabels = [...new Set([...currentLabels, ...labels])]

  await supabaseAdmin
    .from('conversations')
    .update({ labels: newLabels, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
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

    // ── 7. Fetch conversation history ─────────────────────────────────────────
    const { data: recentMessages } = await supabaseAdmin
      .from('messages')
      .select('content, sender, created_at')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(30)

    const history = (recentMessages || []).reverse()

    // ── 8. Inject contextual data (bookings, orders, commerce, action results) ──────────
    systemPrompt = await injectBookingContext(systemPrompt, message, phone, history)
    systemPrompt = await injectOrderContext(systemPrompt, message, phone)
    systemPrompt = await injectCommerceContext(systemPrompt, message, phone, history)

    if (agent?.id) {
      systemPrompt = await injectActionResults(systemPrompt, agent.id, phone, message)
    }

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

    // ── 9b. PAYMENT STATE: deterministic — same logic as chat route ──────────
    const agentHistoryMsgs = history.filter((m: any) => m.sender === 'agent' || m.sender === 'ai' || m.sender === 'bot')
    const lastAgentHistoryContent: string = agentHistoryMsgs[agentHistoryMsgs.length - 1]?.content || ''
    const isAtPaymentStep =
      lastAgentHistoryContent.includes('I can make the payment') ||
      (lastAgentHistoryContent.includes('EFT') && lastAgentHistoryContent.includes('Capitec'))

    if (isAtPaymentStep) {
      const lc = message.toLowerCase().trim()
      let paymentReply = ''

      if (/\b(2|eft|bank transfer|bank|transfer)\b/.test(lc) || lc === 'pay_eft') {
        paymentReply = `EFT details 🏦\n\nBank: Capitec Bank\nAccount name: Miss Mokoatle\nAccount number: 1506845620\n\nOnce paid, please send your Proof of Payment (POP) so we can process your order.`
      } else if (/\b(3|capitec)\b/.test(lc) || lc === 'pay_capitec') {
        paymentReply = `Capitec payment 📱\n\nAccount name: Miss Mokoatle\nCapitec linked number: 0625842441\n\nSend your payment then share your Proof of Payment (POP).`
      } else if (
        /\b(1|yes|ok|sure|please|agent|pay online|payment link|process|go ahead|generate|send|link)\b/.test(lc) ||
        lc === 'pay_online' ||
        lc.includes('make the payment') ||
        lc.includes('pay for me') ||
        lc.includes('make payment') ||
        lc.includes('for me') ||
        lc.length <= 5
      ) {
        const orderDetails = extractOrderDetails(message, history)
        if (orderDetails?.productName) {
          const orderResult = await createOrderFromConversation(phone, orderDetails)
          if (orderResult.success && orderResult.paymentUrl) {
            paymentReply = `Here is your secure payment link 🔗\n\n${orderResult.paymentUrl}\n\nClick to pay securely. Once paid we'll get your order ready!`
          } else if (orderResult.success) {
            paymentReply = `Your order has been placed 🎉 Ref: ${orderResult.orderRef}. Our team will contact you shortly.`
          } else {
            paymentReply = `I'm having trouble generating the link right now. Please try EFT to Capitec 1506845620 (Miss Mokoatle) or Capitec linked: 0625842441`
          }
        }
      }

      if (paymentReply) {
        await supabaseAdmin.from('messages').insert({ agent_id: agent?.id || null, content: paymentReply, sender: 'agent', phone })
        await sendWhatsAppReply(phone, paymentReply)
        await emitWhatsAppMessageSent(phone, paymentReply)
        return
      }
    }
    // ── END PAYMENT STATE ─────────────────────────────────────────────────────

    console.log(`[Handler] Sending ${llmMessages.length} messages to LLM`)
    console.log(`[Handler] System prompt preview: ${systemPrompt.slice(0, 300)}...`)

    // ── 10. Get LLM response ──────────────────────────────────────────────────
    let aiResponse = await getAIResponseWithHistory(llmMessages)
    console.log(`[Handler] LLM response: "${aiResponse.slice(0, 100)}"`)

    // Interactive payment picker for ANY order summary (strips LLM text options, replaces with list message)
    const looksLikeOrderSummary =
      (aiResponse.includes('Total:') || /total.*r\d+/i.test(aiResponse) || aiResponse.includes('💰')) &&
      (aiResponse.includes('Name:') || aiResponse.includes('Cell:') || aiResponse.includes('📋'))

    if (looksLikeOrderSummary) {
      // Strip any payment options text the LLM already appended
      const summaryOnly = aiResponse
        .split('\n\nI can make the payment')[0]
        .split('\n\nAlternatively')[0]
        .trim()

      // Save to DB with text marker so next-turn payment state detection works
      const dbContent = summaryOnly + '\n\nI can make the payment for you 💳\nAlternatively, use these other options:\n1) EFT / Bank transfer\n2) Capitec transfer'
      await supabaseAdmin.from('messages').insert({ agent_id: agent?.id || null, content: dbContent, sender: 'agent', phone })

      // Send clean order summary first
      await sendWhatsAppReply(phone, summaryOnly)

      // Send the interactive list picker — fallback to text if unsupported
      const interactiveResult = await sendPaymentOptionsInteractive(phone, summaryOnly)
      if (!interactiveResult.success) {
        console.warn('[Payment] Interactive list failed, sending text fallback:', interactiveResult.error)
        await sendWhatsAppReply(phone, 'I can make the payment for you 💳\nAlternatively, use these other options:\n1) EFT / Bank transfer\n2) Capitec transfer')
      }

      await emitWhatsAppMessageSent(phone, dbContent)
      return
    }

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

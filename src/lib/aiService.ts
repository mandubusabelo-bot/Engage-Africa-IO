import { supabaseAdmin } from './supabase-server'
import { emitConversationOpened, emitAgentAssigned, emitWhatsAppMessageReceived, emitWhatsAppMessageSent } from './workflowTriggers'
import { createOrderFromConversation, extractOrderDetails, getMissingInfo, updateContactFromOrder } from './orderService'
import { runAgentActions } from './agentActions'

// Retrieve knowledge base content for an agent
async function getKnowledgeBaseContext(agentId: string | null): Promise<string | null> {
  if (!agentId) return null
  
  try {
    const { data: kb } = await supabaseAdmin
      .from('knowledge_base')
      .select('content')
      .eq('agent_id', agentId)
      .limit(3)
    
    if (kb && kb.length > 0) {
      return `Use this knowledge to answer questions:\n${kb.map((k: any) => k.content).join('\n\n')}`
    }
    
    // Try global knowledge base if no agent-specific KB
    const { data: globalKb } = await supabaseAdmin
      .from('knowledge_base')
      .select('content')
      .is('agent_id', null)
      .limit(3)
    
    if (globalKb && globalKb.length > 0) {
      return `Use this knowledge to answer questions:\n${globalKb.map((k: any) => k.content).join('\n\n')}`
    }
    
    return null
  } catch (err) {
    console.error('[KB] Error fetching knowledge base:', err)
    return null
  }
}

export async function getAIResponseWithHistory(messages: Array<{ role: string; content: string }>): Promise<string> {
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
        console.log('[AI] OpenRouter response received')
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
      const userMsg = messages[messages.length - 1]?.content || ''
      const result = await model.generateContent(`${systemMsg}\n\nUser: ${userMsg}`)
      console.log('[AI] Gemini response received')
      return result.response.text()
    } catch (err: any) {
      console.error('[AI] Gemini error:', err.message)
    }
  }

  return `Thank you for your message! Our team will get back to you shortly.`
}

export async function getAIResponse(message: string, systemPrompt: string): Promise<string> {
  // Try OpenRouter first
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
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ]
        })
      })

      const data = await response.json()
      if (data.choices?.[0]?.message?.content) {
        console.log('[AI] OpenRouter response received')
        return data.choices[0].message.content
      }
      console.error('[AI] OpenRouter unexpected response:', JSON.stringify(data).slice(0, 200))
    } catch (err: any) {
      console.error('[AI] OpenRouter error:', err.message)
    }
  }

  // Try Gemini
  const geminiKey = process.env.GEMINI_API_KEY
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(geminiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
      const result = await model.generateContent(`${systemPrompt}\n\nUser: ${message}`)
      console.log('[AI] Gemini response received')
      return result.response.text()
    } catch (err: any) {
      console.error('[AI] Gemini error:', err.message)
    }
  }

  console.warn('[AI] No AI key configured (OPENROUTER_API_KEY or GEMINI_API_KEY)')
  return `Thank you for your message! Our team will get back to you shortly.`
}

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
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ number: phone, text: message })
    })

    const data = await response.json()
    if (response.ok) {
      console.log('[WhatsApp] Reply sent to', phone)
    } else {
      console.error('[WhatsApp] Send failed:', JSON.stringify(data))
    }
  } catch (err: any) {
    console.error('[WhatsApp] Send error:', err.message)
  }
}

export async function handleIncomingWhatsApp(phone: string, message: string, pushName?: string): Promise<void> {
  console.log(`[AI Handler] Processing message from ${phone}: ${message}`)
  
  // Emit message received trigger
  await emitWhatsAppMessageReceived(phone, message, pushName)

  // Get or create contact
  let { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!contact) {
    // Create new contact
    const contactName = pushName || phone.split('@')[0]
    let newContacts: any[] | null = null
    let insertError: any = null

    const primaryInsert = await supabaseAdmin
      .from('contacts')
      .insert({
        phone,
        name: contactName,
        last_message_at: new Date().toISOString()
      })
      .select()

    if (primaryInsert.error) {
      const fallbackInsert = await supabaseAdmin
        .from('contacts')
        .insert({
          phone,
          name: contactName
        })
        .select()

      newContacts = fallbackInsert.data
      insertError = fallbackInsert.error
    } else {
      newContacts = primaryInsert.data
      insertError = null
    }
    
    if (insertError) {
      console.error('[AI Handler] Failed to create contact:', insertError)
    }
    
    contact = newContacts?.[0] || { name: contactName, phone }
    console.log(`[AI Handler] New contact created: ${contact.name}`)
    
    // Emit conversation opened trigger
    if (contact.id) {
      await emitConversationOpened(contact.id, phone)
    }
  } else {
    // Update last message time and name if provided
    const primaryUpdate = await supabaseAdmin
      .from('contacts')
      .update({
        last_message_at: new Date().toISOString(),
        ...(pushName && { name: pushName })
      })
      .eq('phone', phone)

    if (primaryUpdate.error) {
      await supabaseAdmin
        .from('contacts')
        .update({
          ...(pushName && { name: pushName })
        })
        .eq('phone', phone)
    }
    console.log(`[AI Handler] Existing contact: ${contact.name}`)
  }

  // Get assigned agent or assign one
  let agentId = contact?.assigned_agent_id
  let agent = null

  if (agentId) {
    const { data: assignedAgent } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single()
    agent = assignedAgent
  }

  // If no assigned agent, get first available
  if (!agent) {
    let { data: agents } = await supabaseAdmin.from('agents').select('*').eq('is_active', true).limit(1)
    if (!agents || agents.length === 0) {
      const result = await supabaseAdmin.from('agents').select('*').limit(1)
      agents = result.data
    }
    agent = agents?.[0]

    // Assign agent to contact
    if (agent && contact) {
      await supabaseAdmin
        .from('contacts')
        .update({ assigned_agent_id: agent.id })
        .eq('phone', phone)
      console.log(`[AI Handler] Assigned agent ${agent.name} to contact ${contact.name}`)
      
      // Emit agent assigned trigger
      if (contact.id) {
        await emitAgentAssigned(contact.id, agent.id, agent.name)
      }
    }
  }

  const agentName = agent?.agent_name || agent?.name || 'AI Assistant'
  const contactName = contact?.name || phone.split('@')[0]

  console.log(`[AI Handler] Using agent: ${agentName} for contact: ${contactName}`)

  // Check if conversation has already been greeted
  const { data: convMeta, error: convMetaError } = await supabaseAdmin
    .from('conversations')
    .select('id, greeting_sent')
    .eq('contact_phone', phone)
    .maybeSingle()

  if (convMetaError) {
    console.error('[AI Handler] Failed to fetch conversation greeting status:', convMetaError)
  }

  let greetingSent = convMeta?.greeting_sent === true

  // Fallback check: if we have previously sent any agent message, do not greet again
  if (!greetingSent) {
    const { data: priorAgentMessages } = await supabaseAdmin
      .from('messages')
      .select('id')
      .eq('phone', phone)
      .in('sender', ['agent', 'ai', 'bot'])
      .limit(1)

    greetingSent = (priorAgentMessages?.length || 0) > 0
  }

  let sentGreetingThisTurn = false

  // Send greeting DIRECTLY (not through LLM) for new contacts
  if (!greetingSent && agent?.greeting_message) {
    const greeting = agent.greeting_message.replace(/\{\{contact\.name\}\}/g, contactName)
    console.log(`[AI Handler] Sending direct greeting to ${contactName}`)

    await supabaseAdmin.from('messages').insert({
      agent_id: agent?.id || null,
      content: greeting,
      sender: 'agent',
      phone: phone
    })
    await sendWhatsAppReply(phone, greeting)
    await emitWhatsAppMessageSent(phone, greeting)

    sentGreetingThisTurn = true
    greetingSent = true

    // Mark conversation as greeted (non-blocking best effort)
    if (convMeta?.id) {
      const { error: markError } = await supabaseAdmin
        .from('conversations')
        .update({ greeting_sent: true })
        .eq('id', convMeta.id)

      if (markError) {
        console.error('[AI Handler] Failed to mark existing conversation as greeted:', markError)
      }
    } else {
      const { error: insertConversationError } = await supabaseAdmin
        .from('conversations')
        .insert({
          contact_phone: phone,
          contact_name: contactName,
          greeting_sent: true,
          status: 'open'
        })

      if (insertConversationError) {
        console.error('[AI Handler] Failed to create conversation greeting marker:', insertConversationError)
      }
    }

    console.log('[AI Handler] Greeting sent; continuing with AI response for the same user message')
  }

  // Build enhanced system prompt — LLM never sees a greeting instruction
  let systemPrompt = agent?.system_prompt || 'You are a helpful AI assistant.'

  // Agent identity
  if (agent?.agent_name) {
    systemPrompt += `\n\nYour name is ${agent.agent_name}.`
  }

  // Tone
  if (agent?.tone) {
    systemPrompt += `\n\nTone: Use a ${agent.tone} tone in all responses.`
  }

  // HARDCODED anti-greeting rule — always appended, agent cannot override
  systemPrompt += `\n\nYou have already greeted this contact. Do NOT say hello, hi, sawubona, or introduce yourself again under any circumstances. Do NOT open with a greeting word. Start your reply by directly addressing what the contact said. Check the full conversation history before every response and never repeat yourself.`

  // Emoji rule
  if (agent?.rule_limit_emojis !== false) {
    systemPrompt += `\n\nCRITICAL RULE — EMOJI LIMIT: Use maximum 1 emoji per response.`
  }

  // Concise rule
  if (agent?.rule_concise) {
    systemPrompt += `\n\nCRITICAL RULE — BE CONCISE: Keep responses under 2 sentences unless the user asks for detailed information.`
  }

  // Custom rules
  if (agent?.custom_rules) {
    systemPrompt += `\n\nCUSTOM RULES:\n${agent.custom_rules}`
  }

  // Never say
  if (agent?.never_say) {
    systemPrompt += `\n\nNEVER say or use these words/phrases: ${agent.never_say}`
  }

  // Fallback guidance
  if (agent?.fallback_message) {
    systemPrompt += `\n\nIf you cannot answer: ${agent.fallback_message}`
  }

  // Knowledge base context
  const knowledgeBase = await getKnowledgeBaseContext(agent?.id)
  if (knowledgeBase) {
    systemPrompt += `\n\n${knowledgeBase}`
  }

  // Order handling instructions
  systemPrompt += `\n\nORDER HANDLING: When a customer wants to buy a product, you must collect: 1) Their full name, 2) Cellphone number, 3) Collection location (PEP store with code like P1234, or mall name). Once they provide all details, acknowledge their order and tell them a payment link will be sent. Do NOT say "order processed for collection" without a payment link.`

  // Execute enabled agent actions (API/Webhook/Human handoff/etc.) and inject results
  if (agent?.id) {
    const actionResults = await runAgentActions({
      agentId: agent.id,
      phone,
      message
    })

    if (actionResults.length > 0) {
      const actionContext = actionResults
        .map((result) => {
          const base = `- ${result.actionType}: ${result.success ? 'success' : 'failed'} (${result.summary})`
          if (!result.data) return base
          return `${base}\n  data: ${JSON.stringify(result.data).slice(0, 500)}`
        })
        .join('\n')

      systemPrompt += `\n\nAUTOMATION ACTION RESULTS (latest message):\n${actionContext}\nUse these results in your response when relevant.`
    }
  }

  systemPrompt += `\n\nYou are speaking with ${contactName}.`

  // Fetch recent message history for context
  const { data: recentMessages } = await supabaseAdmin
    .from('messages')
    .select('content, sender, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(10)

  const history = (recentMessages || []).reverse()

  // ===== ORDER CREATION FLOW =====
  // Check if user is trying to buy and has provided all details
  const orderDetails = extractOrderDetails(message, history)
  
  if (orderDetails) {
    console.log(`[AI Handler] Detected purchase intent with complete details:`, orderDetails)
    
    // Update contact with extracted information
    await updateContactFromOrder(phone, orderDetails)
    
    // Create order
    const orderResult = await createOrderFromConversation(phone, orderDetails)
    
    if (orderResult.success && orderResult.paymentUrl) {
      const orderConfirmation = `Thank you ${orderDetails.customerName}! 🎉

Your order has been created:
📦 Product: ${orderDetails.productName}
📍 Collection: ${orderDetails.deliveryLocation}${orderDetails.pepStoreCode ? ' (' + orderDetails.pepStoreCode + ')' : ''}
💳 Total: Click here to pay and complete your order: ${orderResult.paymentUrl}

Once payment is confirmed, your order will be ready for collection within 1-3 business days.`

      // Save order confirmation to DB
      await supabaseAdmin.from('messages').insert({
        agent_id: agent?.id || null,
        content: orderConfirmation,
        sender: 'agent',
        phone: phone
      })

      // Send via WhatsApp
      await sendWhatsAppReply(phone, orderConfirmation)
      await emitWhatsAppMessageSent(phone, orderConfirmation)
      
      console.log(`[AI Handler] Order ${orderResult.orderRef} created with payment link`)
      return
    } else {
      console.error(`[AI Handler] Order creation failed:`, orderResult.error)
      // Continue with normal AI response but include error context
    }
  } else {
    // Check if there's partial purchase intent - ask for missing info
    const partialDetails = extractOrderDetails(message + ' ' + history.map((m: any) => m.content).join(' '), [])
    const hasPurchaseKeywords = /(?:buy|purchase|order|get|want|nehla|inhlanhla|isichitho|vitality)/i.test(message)
    
    if (hasPurchaseKeywords && !partialDetails) {
      const missing = getMissingInfo({
        productName: message.match(/(?:nehla|inhlanhla|isichitho|vitality|love|luck|fertility|skin)/i)?.[0] || ''
      })
      
      if (missing.length > 0) {
        const askForDetails = `I'd be happy to help you with your order! To complete your purchase, please provide:

${missing.map(m => `• ${m}`).join('\n')}

For example: "My name is John Smith, my number is 0821234567, and I want to collect at PEP store Pinetown P1234"`

        await supabaseAdmin.from('messages').insert({
          agent_id: agent?.id || null,
          content: askForDetails,
          sender: 'agent',
          phone: phone
        })

        await sendWhatsAppReply(phone, askForDetails)
        await emitWhatsAppMessageSent(phone, askForDetails)
        return
      }
    }
  }

  // Build messages array with history
  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt }
  ]
  history.forEach((msg: any) => {
    messages.push({
      role: msg.sender === 'agent' || msg.sender === 'ai' ? 'assistant' : 'user',
      content: msg.content
    })
  })

  const lastHistoryMessage = history[history.length - 1]
  const messageAlreadyInHistory =
    lastHistoryMessage &&
    (lastHistoryMessage.sender === 'user' || lastHistoryMessage.sender === 'contact') &&
    lastHistoryMessage.content === message

  if (!messageAlreadyInHistory) {
    messages.push({ role: 'user', content: message })
  }

  // Generate AI response
  const aiResponse = await getAIResponseWithHistory(messages)
  console.log(`[AI Handler] AI response: ${aiResponse.slice(0, 100)}...`)

  // Save AI response to DB
  await supabaseAdmin.from('messages').insert({
    agent_id: agent?.id || null,
    content: aiResponse,
    sender: 'agent',
    phone: phone
  })

  // Send back via WhatsApp
  await sendWhatsAppReply(phone, aiResponse)

  // Emit message sent trigger
  await emitWhatsAppMessageSent(phone, aiResponse)

  if (sentGreetingThisTurn) {
    console.log('[AI Handler] Completed first-contact flow: greeting + AI response sent')
  }
}

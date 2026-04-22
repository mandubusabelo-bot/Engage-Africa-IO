import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { createOrderFromConversation, extractOrderDetails, getMissingInfo, searchAgentProducts } from '@/lib/orderService'
import { notify } from '@/lib/services/internalNotifier'

async function notifyDispatchPendingOrder(params: {
  conversationId?: string
  orderId?: string
  phone: string
  orderRef?: string
  productName: string
  quantity?: number
  customerName: string
  deliveryLocation: string
}) {
  try {
    await notify('dispatch_pending_order', {
      'contact.name': params.customerName,
      'contact.phone': params.phone,
      'order.productName': params.productName,
      'order.qty': String(params.quantity || 1),
      'order.price': '0.00',
      'order.totalAmount': '0.00',
      'order.collectionDetails': params.deliveryLocation,
      'order.contactName': params.customerName,
      'order.ref': params.orderRef || 'pending',
      'dispatch.timestamp': new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })
    }, {
      role: 'dispatch',
      conversationId: params.conversationId,
      orderId: params.orderId
    })
  } catch (error: any) {
    console.error('[AgentChat] Failed to notify dispatch:', error?.message || error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, conversationId, phone, testMode, history } = await request.json()
    console.log(`[AgentChat] Request received for agent ${params.id}:`, { message, phone, testMode })

    // Get agent configuration
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', params.id)
      .single()

    if (agentError || !agent) {
      console.error('[AgentChat] Agent not found:', agentError)
      return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 })
    }

    console.log(`[AgentChat] Using agent: ${agent.name}`)

    // Check conversation history to determine if this is a returning contact
    let isReturningContact = false
    let messageHistory: any[] = []
    
    if (!Array.isArray(history) && (phone || conversationId)) {
      const { data: previousMessages } = await supabaseAdmin
        .from('messages')
        .select('*')
        .or(`phone.eq.${phone},conversation_id.eq.${conversationId}`)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (previousMessages && previousMessages.length > 0) {
        isReturningContact = true
        messageHistory = previousMessages.reverse()
        console.log(`[AgentChat] Returning contact detected: ${previousMessages.length} previous messages`)
      }
    }

    if (Array.isArray(history) && history.length > 0) {
      isReturningContact = true
      messageHistory = history
    }

    const extractProductSearchQuery = (rawMessage: string): string => {
      return rawMessage
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b(i|want|need|buy|order|please|for|me|the|a|an|to|show|find|looking|search|price|stock|of|products|product|list|them|all|available|do|you|have|what)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }

    // Build enhanced system prompt with rules
    let enhancedSystemPrompt = agent.system_prompt || 'You are a helpful AI assistant.'
    
    // Add agent identity
    if (agent.agent_name) {
      enhancedSystemPrompt += `\n\nYour name is ${agent.agent_name}.`
    }
    
    // Add tone instruction
    if (agent.tone) {
      enhancedSystemPrompt += `\n\nTone: Use a ${agent.tone} tone in all responses.`
    }
    
    // RULE 1: No greeting for returning contacts
    if (agent.rule_no_greet_returning !== false && isReturningContact) {
      enhancedSystemPrompt += `\n\nCRITICAL RULE - NO GREETING: This contact has previous conversation history. DO NOT say "Hello", "Hi", "Sawubona", "Hey", or any greeting. DO NOT introduce yourself. Continue the conversation naturally from where it left off.`
    }
    
    // RULE 2: Limit emojis
    if (agent.rule_limit_emojis !== false) {
      enhancedSystemPrompt += `\n\nCRITICAL RULE - EMOJI LIMIT: Use maximum 1 emoji per response. NEVER use these emojis: 🌿, 🌱, 🍃, 🌴, 🌲, 🌳, 🌾 (nature/plant emojis) unless the user specifically asks about plants or herbs.`
    }
    
    // RULE 3: Concise responses
    if (agent.rule_concise) {
      enhancedSystemPrompt += '\n\nCRITICAL RULE - BE CONCISE: Keep responses under 2 sentences unless the user asks for detailed information. Be direct and efficient.'
    }
    
    // Add custom rules if present
    if (agent.custom_rules) {
      enhancedSystemPrompt += '\n\nCUSTOM RULES:\n' + agent.custom_rules
    }
    
    const isShortOpener = /^\s*(hi|hello|hey|yo|sup|howzit|sawubona|sanibona|hola)\s*[!.?]*\s*$/i.test(message)
    if (isShortOpener) {
      enhancedSystemPrompt += '\n\nSHORT-OPENER RULE: If the user sends a short opener like "hi", respond naturally and warmly, then ask one helpful clarifying question about what they need. Do not use the fallback message for greetings.'
    }

    // Add fallback message guidance
    if (agent.fallback_message) {
      enhancedSystemPrompt += '\n\nFallback rule: Use this message ONLY when the request is truly outside your scope or critical details are missing after clarifying. Never use fallback for greetings, small talk, or early discovery questions. Fallback message: ' + agent.fallback_message
    }
    
    // Add never-say guidance
    if (agent.never_say) {
      enhancedSystemPrompt += '\n\nNEVER say or use these words/phrases: ' + agent.never_say
    }

    const productIntentPattern = /\b(product|products|stock|available|price|cost|umuthi|umaxosh|buy|order|oreder|purchase)\b/i
    const listFollowUpPattern = /\b(list|show|them|all|catalog|catalogue)\b/i
    const recentUserText = (messageHistory || [])
      .filter((m: any) => (m?.sender || '').toLowerCase() === 'user' || (m?.sender || '').toLowerCase() === 'contact')
      .slice(-5)
      .map((m: any) => String(m.content || ''))
      .join(' ')

    const needsProductContext =
      productIntentPattern.test(message) ||
      (listFollowUpPattern.test(message) && productIntentPattern.test(recentUserText))

    let productFallbackList = ''

    if (needsProductContext) {
      const query = extractProductSearchQuery(message)
      const liveProducts = await searchAgentProducts(query, query ? 8 : 15)
      if (liveProducts.success && liveProducts.products.length > 0) {
        const productLines = liveProducts.products
          .slice(0, 12)
          .map((p: any) => `- ${p.name}: R${Number(p.price || 0).toFixed(2)} (stock: ${p.stock_quantity ?? 'unknown'})`)
          .join('\n')

        productFallbackList = productLines

        enhancedSystemPrompt += `\n\n[LIVE PRODUCT CATALOG for query "${query || '(all products)'}"]:\n${productLines}\nWhen user asks to list products, provide a concise list from this live data first before suggesting website browsing.`
      } else if (liveProducts.success) {
        enhancedSystemPrompt += '\n\n[PRODUCT LOOKUP] Live catalog returned no products for this query. Ask one clarifying product preference question (category, symptom, or budget). Do not use fallback immediately.'
      } else {
        enhancedSystemPrompt += `\n\n[PRODUCT LOOKUP ERROR] ${liveProducts.error || 'Unknown error'}. Ask one clarifying question and offer to retry lookup.`
      }
    }

    const orderIntentPattern = /\b(place\s+an?\s+order|place\s+order|order\s+for\s+me|oreder\s+me|buy\s+for\s+me|i\s+want\s+to\s+order|purchase|checkout|can\s+you\s+place\s+an?\s+order|order\s+me|buy\s+me)\b/i
    const orderConfirmPattern = /\b(confirm|place order|go ahead|proceed|yes order|yes please order|ready to order|order now|place it|do it|yes proceed|yes go ahead)\b/i
    const paymentRequestPattern = /\b(payment\s*link|payment|pay\s*link|portal|checkout\s*link|how\s*to\s*pay|pay\s*now|agent\s*pay|pay\s*please|just\s*pay|i.*pay|want\s*to\s*pay)\b/i
    const onlineChoicePattern = /\b(pay\s*online|online\s*payment|payment\s*portal|portal\s*link|option\s*1|1️⃣)\b/i
    const eftChoicePattern = /\b(eft|bank\s*transfer|bank\s*details)\b/i
    const capitecChoicePattern = /\b(capitec)\b/i
    const recentCommerceContext = [recentUserText, messageHistory.map((m: any) => String(m?.content || '')).slice(-3).join(' ')].join(' ').toLowerCase()
    const hasRecentCommerceSignals = /\b(product|products|stock|price|order|payment|eft|bank|pep|mall|delivery|shop)\b/.test(recentCommerceContext)
    const orderFollowUpPattern = /\b(order|oreder|buy|purchase|checkout|place it|place one|yes i need|i need that|yes please)\b/i
    const paymentOptionChoice = message.trim().toLowerCase().match(/^(?:option\s*)?(1|2|3|4)$/)?.[1] || ''
    const paymentChoice = paymentOptionChoice || (onlineChoicePattern.test(message)
      ? '1'
      : (capitecChoicePattern.test(message) ? '3' : (eftChoicePattern.test(message) ? '2' : '')))
    const paymentOptionsPrompt = 'Can I process this order for you?\n\nChoose one option:\n1️⃣ Agent Pay Online (I process now and send your payment link)\n2️⃣ EFT / Bank transfer details\n3️⃣ Capitec transfer details\n4️⃣ Change order details first'

    // Detect when the bot just asked for order details (product, name, phone, etc.)
    const recentAssistantText = (messageHistory || [])
      .filter((m: any) => {
        const s = (m?.sender || '').toLowerCase()
        return s === 'agent' || s === 'ai' || s === 'bot' || s === 'assistant'
      })
      .slice(-2)
      .map((m: any) => String(m.content || ''))
      .join(' ')
      .toLowerCase()
    const botAskedForOrderDetails = /which product|how many|your (full )?name|cellphone|phone number|collection location|place the order/i.test(recentAssistantText)

    const paymentFollowUpActive = (paymentRequestPattern.test(message) || Boolean(paymentChoice)) && hasRecentCommerceSignals
    const orderIntentActive = orderIntentPattern.test(message) || (orderFollowUpPattern.test(message) && hasRecentCommerceSignals) || botAskedForOrderDetails || paymentFollowUpActive
    let extractedOrderForFallback: ReturnType<typeof extractOrderDetails> = null
    let forcedOrderResponse = ''

    if (orderIntentActive) {
      const extractedOrder = extractOrderDetails(message, messageHistory)
      extractedOrderForFallback = extractedOrder

      if (!extractedOrder) {
        enhancedSystemPrompt += '\n\n[ORDER INTENT DETECTED] The customer wants to place an order but key details are missing. Ask for the product first, then collect full name, cellphone number, and collection location (PEP store or mall). Do not use fallback for this.'
      } else {
        const missingOrderFields = getMissingInfo(extractedOrder)
        if (missingOrderFields.length > 0) {
          enhancedSystemPrompt += `\n\n[ORDER DETAILS PARTIAL] Product: ${extractedOrder.productName}. Missing: ${missingOrderFields.join(', ')}. Ask only for these missing fields and continue order flow.`
        } else if (paymentChoice === '1') {
          const persistPhone = phone || extractedOrder.customerPhone || `test-ui-${params.id}`
          const orderResult = await createOrderFromConversation(persistPhone, extractedOrder)
          if (orderResult.success) {
            await notifyDispatchPendingOrder({
              conversationId,
              orderId: orderResult.orderId,
              phone: persistPhone,
              orderRef: orderResult.orderRef,
              productName: extractedOrder.productName,
              quantity: extractedOrder.quantity,
              customerName: extractedOrder.customerName,
              deliveryLocation: extractedOrder.deliveryLocation
            })
            if (orderResult.paymentUrl) {
              forcedOrderResponse = `Great choice ✅\nOrder placed successfully!\nReference: ${orderResult.orderRef || 'pending'}\nPayment portal: ${orderResult.paymentUrl}\nDispatch has been notified. Please complete payment using this link, then share your POP.`
            } else {
              forcedOrderResponse = `Order placed successfully ✅\nReference: ${orderResult.orderRef || 'pending'}\nPayment portal link is temporarily unavailable. Please choose option 2 (EFT) or option 3 (Capitec transfer), then share your POP.`
            }
          } else {
            forcedOrderResponse = `Sorry, I couldn't place the order right now: ${orderResult.error || 'Unknown error'}. Please try again or choose option 2 (EFT) / option 3 (Capitec transfer).`
          }
        } else if (paymentChoice === '2') {
          const persistPhone = phone || extractedOrder.customerPhone || `test-ui-${params.id}`
          const orderResult = await createOrderFromConversation(persistPhone, extractedOrder)
          if (orderResult.success) {
            await notifyDispatchPendingOrder({
              conversationId,
              orderId: orderResult.orderId,
              phone: persistPhone,
              orderRef: orderResult.orderRef,
              productName: extractedOrder.productName,
              quantity: extractedOrder.quantity,
              customerName: extractedOrder.customerName,
              deliveryLocation: extractedOrder.deliveryLocation
            })
            forcedOrderResponse = `Order placed successfully ✅\nReference: ${orderResult.orderRef || 'pending'}\nEFT / Bank Transfer details:\n- Bank: Capitec Bank\n- Account Name: Miss Mokoatle\n- Account Number: 1506845620\nDispatch has been notified. After payment, please share your POP so we can process your order.`
          } else {
            forcedOrderResponse = `Sorry, I couldn't place the order right now: ${orderResult.error || 'Unknown error'}. Please try again.`
          }
        } else if (paymentChoice === '3') {
          const persistPhone = phone || extractedOrder.customerPhone || `test-ui-${params.id}`
          const orderResult = await createOrderFromConversation(persistPhone, extractedOrder)
          if (orderResult.success) {
            await notifyDispatchPendingOrder({
              conversationId,
              orderId: orderResult.orderId,
              phone: persistPhone,
              orderRef: orderResult.orderRef,
              productName: extractedOrder.productName,
              quantity: extractedOrder.quantity,
              customerName: extractedOrder.customerName,
              deliveryLocation: extractedOrder.deliveryLocation
            })
            forcedOrderResponse = `Order placed successfully ✅\nReference: ${orderResult.orderRef || 'pending'}\nCapitec transfer details:\n- Capitec linked number: 0625842441\n- Account Name: Miss Mokoatle\nDispatch has been notified. After payment, please share your POP so we can process your order.`
          } else {
            forcedOrderResponse = `Sorry, I couldn't place the order right now: ${orderResult.error || 'Unknown error'}. Please try again.`
          }
        } else if (paymentOptionChoice === '4') {
          forcedOrderResponse = 'No problem. Tell me what you want to change: 1) quantity, 2) collection location, or 3) product.'
        } else if (paymentRequestPattern.test(message)) {
          forcedOrderResponse = paymentOptionsPrompt
        } else if (orderConfirmPattern.test(message)) {
          forcedOrderResponse = paymentOptionsPrompt
        } else if (!orderConfirmPattern.test(message)) {
          forcedOrderResponse = `Great, thank you for the order details.\n${paymentOptionsPrompt}`
        }
      }
    }

    console.log('[AgentChat] Enhanced system prompt built, length:', enhancedSystemPrompt.length)

    // Call AI service (OpenRouter or Gemini)
    let aiResponse = ''
    if (forcedOrderResponse) {
      aiResponse = forcedOrderResponse
    }
    
    // Build message history for context
    const messages = [{ role: 'system', content: enhancedSystemPrompt }]
    
    // Add conversation history if available
    if (messageHistory.length > 0) {
      messageHistory.forEach((msg: any) => {
        messages.push({
          role: msg.sender === 'agent' || msg.sender === 'ai' || msg.sender === 'bot' ? 'assistant' : 'user',
          content: msg.content
        })
      })
    }
    
    // Add current message
    messages.push({ role: 'user', content: message })
    
    // Try OpenRouter first
    const openrouterKey = process.env.OPENROUTER_API_KEY
    const openrouterMaxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || '900')
    if (openrouterKey && !aiResponse) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openrouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://engage-africa.io'
          },
          body: JSON.stringify({
            model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
            messages: messages,
            max_tokens: Number.isFinite(openrouterMaxTokens) && openrouterMaxTokens > 0 ? openrouterMaxTokens : 900,
            temperature: 0.5
          })
        })

        const data = await response.json()
        if (data.choices?.[0]?.message?.content) {
          aiResponse = data.choices[0].message.content
          console.log('[AgentChat] OpenRouter response received')
        } else {
          console.warn('[AgentChat] OpenRouter returned no content:', JSON.stringify(data).slice(0, 300))
        }
      } catch (err: any) {
        console.error('[AgentChat] OpenRouter error:', err.message)
      }
    }

    // Fallback to Gemini
    if (!aiResponse && process.env.GEMINI_API_KEY) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })

        const conversationTranscript = messages
          .filter((m: any) => m.role !== 'system')
          .map((m: any) => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${m.content}`)
          .join('\n')
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${enhancedSystemPrompt}\n\nConversation:\n${conversationTranscript}\n\nAssistant:` }] }]
        })
        
        aiResponse = result.response.text()
        console.log('[AgentChat] Gemini response received')
      } catch (err: any) {
        console.error('[AgentChat] Gemini error:', err.message)
      }
    }

    // Fallback response if AI fails — commerce-aware deterministic replies
    if (!aiResponse || !aiResponse.trim()) {
      console.log('[AgentChat] AI returned empty — using deterministic fallback', { orderIntentActive, needsProductContext, isShortOpener })
      if (orderIntentActive) {
        if (!extractedOrderForFallback) {
          aiResponse = 'Absolutely — I can place the order for you. Which product would you like, and how many bottles/items should I place?'
        } else {
          const missingOrderFields = getMissingInfo(extractedOrderForFallback)
          if (missingOrderFields.length > 0) {
            aiResponse = `Perfect. I can continue your order for ${extractedOrderForFallback.productName}. Please share your ${missingOrderFields[0]} first.`
          } else if (orderConfirmPattern.test(message)) {
            aiResponse = 'Can I process this order for you?\n\nChoose one option:\n1️⃣ Agent Pay Online (I process now and send your payment link)\n2️⃣ EFT / Bank transfer details\n3️⃣ Capitec transfer details\n4️⃣ Change order details first'
          } else {
            aiResponse = 'Great, thank you for the order details.\nCan I process this order for you?\n\nChoose one option:\n1️⃣ Agent Pay Online (I process now and send your payment link)\n2️⃣ EFT / Bank transfer details\n3️⃣ Capitec transfer details\n4️⃣ Change order details first'
          }
        }
      } else if (needsProductContext && productFallbackList) {
        aiResponse = `Here are the products currently available:\n${productFallbackList}\nTell me which one you want and I can help you place the order.`
      } else if (needsProductContext) {
        aiResponse = 'I can help with products. Tell me the concern you want to treat (or your budget), and I will recommend options.'
      } else if (isShortOpener) {
        aiResponse = 'Hi there! How can I help you today?'
      } else {
        aiResponse = `Hello! I'm ${agent.name}. I received your message: "${message}". How can I help you today?`
      }
    }

    // Save AI response to database
    const persistedPhone = phone || `test-ui-${params.id}`

    await supabaseAdmin.from('messages').insert({
      agent_id: params.id,
      content: aiResponse,
      sender: 'agent',
      phone: persistedPhone,
      conversation_id: conversationId
    })

    // Send response back via WhatsApp if phone number provided
    if (phone && !testMode) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/whatsapp/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, message: aiResponse })
        })
        console.log('[AgentChat] WhatsApp response sent to', phone)
      } catch (err: any) {
        console.error('[AgentChat] Failed to send WhatsApp response:', err.message)
      }
    } else if (testMode) {
      console.log('[AgentChat] testMode=true, skipping WhatsApp send')
    }

    return NextResponse.json({
      success: true,
      response: aiResponse,
      agent: agent.name
    })

  } catch (error: any) {
    console.error('[AgentChat] Error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

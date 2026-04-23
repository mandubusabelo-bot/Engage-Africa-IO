import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import {
  buildCommerceSystemPrompt,
  runAgentOrchestrator,
  type OrchestratorMessage
} from '@/lib/agentOrchestrator'
import { extractOrderDetails, createOrderFromConversation } from '@/lib/orderService'

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

    // Build commerce tool-calling system prompt on top of agent rules
    const commerceSystemPrompt = buildCommerceSystemPrompt(enhancedSystemPrompt, {
      agentName: agent.agent_name || agent.name || 'Assistant',
      agentId: params.id,
      conversationId,
      phone
    })

    // Build full message history for the LLM
    const orchestratorMessages: OrchestratorMessage[] = [
      { role: 'system', content: commerceSystemPrompt }
    ]

    if (messageHistory.length > 0) {
      messageHistory.forEach((msg: any) => {
        orchestratorMessages.push({
          role: msg.sender === 'agent' || msg.sender === 'ai' || msg.sender === 'bot' ? 'assistant' : 'user',
          content: String(msg.content || '')
        })
      })
    }

    orchestratorMessages.push({ role: 'user', content: message })

    // ── PAYMENT STATE: deterministic handler — more reliable than LLM tool calls ──
    const agentMsgs = messageHistory.filter((m: any) =>
      m.sender === 'agent' || m.sender === 'ai' || m.sender === 'bot'
    )
    const lastAgentContent: string = agentMsgs[agentMsgs.length - 1]?.content || ''
    const isAtPaymentOptionsStep =
      lastAgentContent.includes('I can make the payment') ||
      (lastAgentContent.includes('EFT') && lastAgentContent.includes('Capitec'))

    if (isAtPaymentOptionsStep) {
      const lc = message.toLowerCase().trim()
      let paymentReply = ''

      if (/\b(2|eft|bank transfer|bank|transfer)\b/.test(lc)) {
        paymentReply = `EFT details 🏦\n\nBank: Capitec Bank\nAccount name: Miss Mokoatle\nAccount number: 1506845620\n\nOnce paid, please send your Proof of Payment (POP) so we can process your order.`

      } else if (/\b(3|capitec)\b/.test(lc)) {
        paymentReply = `Capitec payment 📱\n\nAccount name: Miss Mokoatle\nCapitec linked number: 0625842441\n\nSend your payment then share your Proof of Payment (POP).`

      } else if (
        /\b(1|yes|ok|sure|please|agent|pay online|payment link|process|go ahead|generate|send|link)\b/.test(lc) ||
        lc.includes('make the payment') ||
        lc.includes('pay for me') ||
        lc.includes('make payment') ||
        lc.includes('for me') ||
        lc.length <= 5
      ) {
        const orderDetails = extractOrderDetails(message, messageHistory)
        const persistPhoneLocal = phone || `test-${params.id}`
        if (orderDetails?.productName) {
          const orderResult = await createOrderFromConversation(persistPhoneLocal, orderDetails)
          if (orderResult.success && orderResult.paymentUrl) {
            paymentReply = `Here is your secure payment link 🔗\n\n${orderResult.paymentUrl}\n\nClick to pay securely. Once paid we'll get your order ready!`
          } else if (orderResult.success) {
            paymentReply = `Your order has been placed 🎉 Ref: ${orderResult.orderRef}. Our team will contact you with payment details shortly.`
          } else {
            paymentReply = `I'm having trouble generating the link right now. Please try EFT to Capitec 1506845620 (Miss Mokoatle) or Capitec linked: 0625842441`
          }
        } else {
          paymentReply = `I couldn't find your full order details in our chat. Please confirm: product, name, phone and collection point.`
        }
      }

      if (paymentReply) {
        const persistedPhoneLocal = phone || `test-ui-${params.id}`
        await supabaseAdmin.from('messages').insert({
          agent_id: params.id,
          content: paymentReply,
          sender: 'agent',
          phone: persistedPhoneLocal,
          conversation_id: conversationId
        })
        if (phone && !testMode) {
          try {
            await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/whatsapp/send`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone, message: paymentReply })
            })
          } catch (err: any) {
            console.error('[AgentChat] WhatsApp send error:', err.message)
          }
        }
        return NextResponse.json({ success: true, response: paymentReply, agent: agent.name })
      }
    }
    // ── END PAYMENT STATE ────────────────────────────────────────────────────────

    // LLM caller: OpenRouter first, Gemini fallback
    const callLLM = async (msgs: OrchestratorMessage[]): Promise<string> => {
      const openrouterKey = process.env.OPENROUTER_API_KEY
      const openrouterMaxTokens = Number(process.env.OPENROUTER_MAX_TOKENS || '900')

      if (openrouterKey) {
        try {
          const chatMessages = msgs.map((m) => {
            if (m.role === 'tool') {
              return {
                role: 'user',
                content: `TOOL_RESULT(${m.name || 'tool'}): ${m.content}`
              }
            }
            return { role: m.role, content: m.content }
          })

          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://engage-africa.io'
            },
            body: JSON.stringify({
              model: process.env.OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free',
              messages: chatMessages,
              max_tokens: Number.isFinite(openrouterMaxTokens) && openrouterMaxTokens > 0 ? openrouterMaxTokens : 900,
              temperature: 0.4
            })
          })
          const data = await response.json()
          const content = data?.choices?.[0]?.message?.content
          if (content) return content
          console.warn('[AgentChat] OpenRouter returned no content:', JSON.stringify(data).slice(0, 300))
        } catch (err: any) {
          console.error('[AgentChat] OpenRouter error:', err.message)
        }
      }

      if (process.env.GEMINI_API_KEY) {
        try {
          const { GoogleGenerativeAI } = await import('@google/generative-ai')
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
          const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash' })

          const systemText = msgs.find((m) => m.role === 'system')?.content || ''
          const transcript = msgs
            .filter((m) => m.role !== 'system')
            .map((m) => {
              if (m.role === 'tool') return `TOOL_RESULT(${m.name || 'tool'}): ${m.content}`
              const label = m.role === 'assistant' ? 'Assistant' : 'User'
              return `${label}: ${m.content}`
            })
            .join('\n')

          const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: `${systemText}\n\nConversation:\n${transcript}\n\nAssistant:` }] }]
          })
          return result.response.text() || ''
        } catch (err: any) {
          console.error('[AgentChat] Gemini error:', err.message)
        }
      }

      return ''
    }

    const orchestrationResult = await runAgentOrchestrator(
      orchestratorMessages,
      {
        agentName: agent.agent_name || agent.name || 'Assistant',
        agentId: params.id,
        conversationId,
        phone
      },
      callLLM,
      3
    )

    let aiResponse = orchestrationResult.reply

    // ── ORDER SUMMARY DETECTION: append exact payment options if LLM returned a summary ──
    const looksLikeOrderSummary =
      !orchestrationResult.orderCreated &&
      (aiResponse.includes('Total:') || /total.*r\d+/i.test(aiResponse) || aiResponse.includes('💰')) &&
      (aiResponse.includes('Name:') || aiResponse.includes('Cell:') || aiResponse.includes('📋'))
    if (looksLikeOrderSummary &&
        !aiResponse.includes('I can make the payment') &&
        !aiResponse.includes('EFT')) {
      aiResponse += '\n\nI can make the payment for you 💳\nAlternatively, use these other options:\n1) EFT / Bank transfer\n2) Capitec transfer'
    }
    // ── END ORDER SUMMARY DETECTION ──────────────────────────────────────────────

    if (!aiResponse || !aiResponse.trim()) {
      aiResponse = `Sorry, I'm having trouble processing that right now. Please try again or type "menu" to see what I can help with.`
    }

    if (orchestrationResult.toolCalls.length > 0) {
      console.log('[AgentChat] Tool calls executed:', orchestrationResult.toolCalls.map((t) => t.tool).join(', '))
    }
    if (orchestrationResult.orderCreated) {
      console.log('[AgentChat] Order created:', orchestrationResult.orderCreated.orderRef)
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

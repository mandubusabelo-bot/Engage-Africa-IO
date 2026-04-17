import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { message, conversationId, phone } = await request.json()
    console.log(`[AgentChat] Request received for agent ${params.id}:`, { message, phone })

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
    
    if (phone || conversationId) {
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
    
    // Add fallback message guidance
    if (agent.fallback_message) {
      enhancedSystemPrompt += '\n\nIf you cannot answer: ' + agent.fallback_message
    }
    
    // Add never-say guidance
    if (agent.never_say) {
      enhancedSystemPrompt += '\n\nNEVER say or use these words/phrases: ' + agent.never_say
    }

    console.log('[AgentChat] Enhanced system prompt built, length:', enhancedSystemPrompt.length)

    // Call AI service (OpenRouter or Gemini)
    let aiResponse = ''
    
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
    if (openrouterKey) {
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
            messages: messages
          })
        })

        const data = await response.json()
        if (data.choices?.[0]?.message?.content) {
          aiResponse = data.choices[0].message.content
          console.log('[AgentChat] OpenRouter response received')
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
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: `${agent.system_prompt}\n\nUser: ${message}` }] }]
        })
        
        aiResponse = result.response.text()
        console.log('[AgentChat] Gemini response received')
      } catch (err: any) {
        console.error('[AgentChat] Gemini error:', err.message)
      }
    }

    // Fallback response if AI fails
    if (!aiResponse) {
      aiResponse = `Hello! I'm ${agent.name}. I received your message: "${message}". How can I help you today?`
    }

    // Save AI response to database
    await supabaseAdmin.from('messages').insert({
      agent_id: params.id,
      content: aiResponse,
      sender: 'agent',
      phone: phone || conversationId,
      conversation_id: conversationId
    })

    // Send response back via WhatsApp if phone number provided
    if (phone) {
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

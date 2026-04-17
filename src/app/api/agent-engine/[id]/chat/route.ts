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

    // Call AI service (OpenRouter or Gemini)
    let aiResponse = ''
    
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
            messages: [
              { role: 'system', content: agent.system_prompt || 'You are a helpful AI assistant.' },
              { role: 'user', content: message }
            ]
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

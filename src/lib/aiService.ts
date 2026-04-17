import { supabaseAdmin } from './supabase-server'

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

export async function handleIncomingWhatsApp(phone: string, message: string): Promise<void> {
  console.log(`[AI Handler] Processing message from ${phone}: ${message}`)

  // Get first available agent
  let { data: agents } = await supabaseAdmin.from('agents').select('*').eq('is_active', true).limit(1)
  if (!agents || agents.length === 0) {
    const result = await supabaseAdmin.from('agents').select('*').limit(1)
    agents = result.data
  }

  const systemPrompt = agents?.[0]?.system_prompt || 'You are a helpful AI assistant for Engage Africa. Be friendly, concise, and helpful.'
  const agentId = agents?.[0]?.id || null
  const agentName = agents?.[0]?.name || 'AI Assistant'

  console.log(`[AI Handler] Using agent: ${agentName}`)

  // Generate AI response
  const aiResponse = await getAIResponse(message, systemPrompt)
  console.log(`[AI Handler] AI response: ${aiResponse.slice(0, 100)}...`)

  // Save AI response to DB
  await supabaseAdmin.from('messages').insert({
    agent_id: agentId,
    content: aiResponse,
    sender: 'agent',
    phone: phone
  })

  // Send back via WhatsApp
  await sendWhatsAppReply(phone, aiResponse)
}

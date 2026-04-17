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

export async function handleIncomingWhatsApp(phone: string, message: string, pushName?: string): Promise<void> {
  console.log(`[AI Handler] Processing message from ${phone}: ${message}`)

  // Get or create contact
  let { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('phone', phone)
    .single()

  if (!contact) {
    // Create new contact
    const { data: newContact } = await supabaseAdmin
      .from('contacts')
      .insert({
        phone,
        name: pushName || phone.split('@')[0],
        last_message_at: new Date().toISOString()
      })
      .select()
      .single()
    contact = newContact
    console.log(`[AI Handler] New contact created: ${contact?.name}`)
  } else {
    // Update last message time and name if provided
    await supabaseAdmin
      .from('contacts')
      .update({
        last_message_at: new Date().toISOString(),
        ...(pushName && { name: pushName })
      })
      .eq('phone', phone)
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
    }
  }

  const systemPrompt = agent?.system_prompt || 'You are a helpful AI assistant for Engage Africa. Be friendly, concise, and helpful.'
  const agentName = agent?.name || 'AI Assistant'
  const contactName = contact?.name || phone.split('@')[0]

  console.log(`[AI Handler] Using agent: ${agentName} for contact: ${contactName}`)

  // Generate AI response with contact name context
  const contextualPrompt = `${systemPrompt}\n\nYou are speaking with ${contactName}.`
  const aiResponse = await getAIResponse(message, contextualPrompt)
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
}

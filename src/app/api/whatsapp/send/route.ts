import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone, message } = body

    if (!phone || !message) {
      return NextResponse.json({ success: false, error: 'Missing required fields: phone and message' }, { status: 400 })
    }

    const evolutionApiUrl = process.env.EVOLUTION_API_URL
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    // Try Evolution API first
    if (evolutionApiUrl && evolutionApiKey && instanceName) {
      try {
        const response = await fetch(`${evolutionApiUrl}/message/sendText/${instanceName}`, {
          method: 'POST',
          headers: {
            'apikey': evolutionApiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            number: phone,
            text: message
          })
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('Evolution API send failed:', data)
          // Fall through to WhatsApp Business API
        } else {
          return NextResponse.json({ success: true, data })
        }
      } catch (error) {
        console.error('Evolution API send error:', error)
        // Fall through to WhatsApp Business API
      }
    }

    // Fallback to WhatsApp Business API
    const accessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || accessToken === 'your_whatsapp_business_access_token') {
      return NextResponse.json({ success: false, error: 'No WhatsApp API configured' }, { status: 400 })
    }

    // Send message via WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json({ success: false, error: data.error?.message || 'Failed to send message' }, { status: response.status })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('WhatsApp send error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

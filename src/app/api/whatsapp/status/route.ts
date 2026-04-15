import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const rawUrl = process.env.EVOLUTION_API_URL || ''
    const evolutionApiUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    // Check if Evolution API is configured
    if (evolutionApiUrl && evolutionApiKey && instanceName) {
      try {
        // Check Evolution API instance status
        const response = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
          headers: {
            'apikey': evolutionApiKey
          }
        })

        if (response.ok) {
          const data = await response.json()
          const isConnected = data.instance?.state === 'open' || data.state === 'open'

          return NextResponse.json({
            success: true,
            data: {
              status: isConnected ? 'connected' : 'disconnected',
              mode: 'evolution_api',
              instanceName,
              state: data.instance?.state || data.state,
              warning: null
            }
          })
        }
      } catch (error) {
        console.error('Evolution API check failed:', error)
      }
    }

    // Fallback to WhatsApp Business API check
    const accessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (accessToken && phoneNumberId && accessToken !== 'your_whatsapp_business_access_token') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'connected',
          mode: 'business_api',
          phoneNumberId,
          warning: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'disconnected',
        mode: 'none',
        warning: 'WhatsApp not configured. Set up Evolution API or WhatsApp Business API credentials'
      }
    })
  } catch (error: any) {
    console.error('WhatsApp status error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

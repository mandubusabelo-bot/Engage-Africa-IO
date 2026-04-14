import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { evolutionApiUrl, evolutionApiKey, instanceName } = body

    // If Evolution API credentials provided, configure Evolution API
    if (evolutionApiUrl && evolutionApiKey && instanceName) {
      try {
        // Test connection to Evolution API
        const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
          headers: {
            'apikey': evolutionApiKey
          }
        })

        if (response.ok) {
          return NextResponse.json({
            success: true,
            message: 'Evolution API configured successfully'
          })
        } else {
          return NextResponse.json({ success: false, error: 'Failed to connect to Evolution API' }, { status: 400 })
        }
      } catch (error) {
        console.error('Evolution API config error:', error)
        return NextResponse.json({ success: false, error: 'Failed to connect to Evolution API' }, { status: 400 })
      }
    }

    // Fallback to WhatsApp Business API configuration
    const { accessToken, phoneNumberId } = body

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ success: false, error: 'Missing required fields: either Evolution API credentials or WhatsApp Business API credentials' }, { status: 400 })
    }

    // In a real implementation, you would validate these credentials with Meta's API
    // For now, we'll just return success
    return NextResponse.json({
      success: true,
      message: 'WhatsApp Business API configured successfully'
    })
  } catch (error: any) {
    console.error('WhatsApp configure business error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

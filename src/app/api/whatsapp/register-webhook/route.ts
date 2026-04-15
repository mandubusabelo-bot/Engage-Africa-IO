import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const rawUrl = process.env.EVOLUTION_API_URL || ''
    const evolutionApiUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME
    const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL

    if (!evolutionApiUrl || !evolutionApiKey || !instanceName || !webhookUrl) {
      return NextResponse.json({ success: false, error: 'Missing Evolution API config' }, { status: 400 })
    }

    const response = await fetch(`${evolutionApiUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': evolutionApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'SEND_MESSAGE']
        }
      })
    })

    const data = await response.json()
    console.log('[Evolution] Webhook set response:', JSON.stringify(data))

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      webhookUrl,
      instanceName,
      data
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

export async function POST() {
  try {
    const rawUrl = process.env.EVOLUTION_API_URL || ''
    const evolutionApiUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

    const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || `${process.env.NEXTAUTH_URL || ''}/api/whatsapp/webhook`

    const registerWebhook = async () => {
      try {
        await fetch(`${evolutionApiUrl}/webhook/set/${instanceName}`, {
          method: 'POST',
          headers: { 'apikey': evolutionApiKey!, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webhook: {
              enabled: true,
              url: webhookUrl,
              events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE', 'QRCODE_UPDATED', 'SEND_MESSAGE']
            }
          })
        })
        console.log('[Evolution] Webhook registered:', webhookUrl)
      } catch (e: any) {
        console.error('[Evolution] Webhook registration failed:', e?.message)
      }
    }

    // Try Evolution API first
    if (evolutionApiUrl && evolutionApiKey && instanceName) {
      try {
        // Check if instance exists
        const checkResponse = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
          headers: {
            'apikey': evolutionApiKey
          }
        })

        console.log('[Evolution] fetchInstances status:', checkResponse.status)

        if (checkResponse.ok) {
          const instances = await checkResponse.json()
          console.log('[Evolution] instances raw:', JSON.stringify(instances).slice(0, 500))
          const instanceExists = instances?.some((inst: any) =>
            inst.instance === instanceName ||
            inst.instance?.instanceName === instanceName ||
            inst.instanceName === instanceName
          )
          console.log('[Evolution] instanceExists:', instanceExists)

          // Delete existing instance if it exists to ensure fresh QR
          if (instanceExists) {
            console.log('[Evolution] Deleting existing instance:', instanceName)
            try {
              const deleteResponse = await fetch(`${evolutionApiUrl}/instance/logout/${instanceName}`, {
                method: 'DELETE',
                headers: {
                  'apikey': evolutionApiKey
                }
              })
              const deleteData = await deleteResponse.json()
              console.log('[Evolution] Logout response:', deleteResponse.status, JSON.stringify(deleteData))
            } catch (deleteError: any) {
              console.error('[Evolution] Logout failed:', deleteError?.message)
            }
          }

          // Create fresh instance
          const createResponse = await fetch(`${evolutionApiUrl}/instance/create`, {
            method: 'POST',
            headers: {
              'apikey': evolutionApiKey,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              instanceName,
              integration: 'WHATSAPP-BAILEYS',
              qrcode: true
            })
          })

          console.log('[Evolution] createInstance status:', createResponse.status)
          if (createResponse.ok) {
            const createData = await createResponse.json()
            console.log('[Evolution] createData:', JSON.stringify(createData).slice(0, 300))
            
            // Get QR code
            const qrResponse = await fetch(`${evolutionApiUrl}/instance/connect/${instanceName}`, {
              headers: {
                'apikey': evolutionApiKey
              }
            })

            if (qrResponse.ok) {
              const qrData = await qrResponse.json()
              return NextResponse.json({
                success: true,
                data: {
                  status: 'qr_ready',
                  mode: 'evolution_api',
                  qrCode: qrData.base64 || qrData.qrcode,
                  instanceName,
                  warning: 'Scan QR code to connect'
                }
              })
            }
          }
        }
      } catch (error: any) {
        console.error('[Evolution] initialize error:', error?.message || error)
        return NextResponse.json({
          success: false,
          error: `Evolution API error: ${error?.message || String(error)}`
        }, { status: 500 })
      }
    }

    // Fallback to WhatsApp Business API
    const accessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (accessToken && phoneNumberId && accessToken !== 'your_whatsapp_business_access_token') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'connected',
          mode: 'business_api',
          warning: null
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'disconnected',
        warning: 'WhatsApp not configured. Set up Evolution API or WhatsApp Business API credentials'
      }
    })
  } catch (error: any) {
    console.error('WhatsApp initialize error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

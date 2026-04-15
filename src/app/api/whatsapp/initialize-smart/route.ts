import { NextRequest, NextResponse } from 'next/server'

export async function POST() {
  try {
    const rawUrl = process.env.EVOLUTION_API_URL || ''
    const evolutionApiUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl
    const evolutionApiKey = process.env.EVOLUTION_API_KEY
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME

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

          if (!instanceExists) {
            // Create instance
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
          } else {
            // Instance exists, get connection state
            const stateResponse = await fetch(`${evolutionApiUrl}/instance/connectionState/${instanceName}`, {
              headers: {
                'apikey': evolutionApiKey
              }
            })

            if (stateResponse.ok) {
              const stateData = await stateResponse.json()
              const isConnected = stateData.instance?.state === 'open' || stateData.state === 'open'

              if (isConnected) {
                return NextResponse.json({
                  success: true,
                  data: {
                    status: 'connected',
                    mode: 'evolution_api',
                    instanceName,
                    warning: null
                  }
                })
              } else {
                // Get QR code for reconnection
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
                      warning: 'Scan QR code to reconnect'
                    }
                  })
                }
              }
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

import { NextRequest, NextResponse } from 'next/server'

export async function POST() {
  try {
    const evolutionApiUrl = process.env.EVOLUTION_API_URL
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

        if (checkResponse.ok) {
          const instances = await checkResponse.json()
          const instanceExists = instances?.some((inst: any) => inst.instance === instanceName)

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

            if (createResponse.ok) {
              const createData = await createResponse.json()
              
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
      } catch (error) {
        console.error('Evolution API initialize error:', error)
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

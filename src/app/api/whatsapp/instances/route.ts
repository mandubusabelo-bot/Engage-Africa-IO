import { NextRequest, NextResponse } from 'next/server'

function getEvolutionConfig() {
  const rawUrl = process.env.EVOLUTION_API_URL || ''
  const evolutionApiUrl = rawUrl && !rawUrl.startsWith('http') ? `https://${rawUrl}` : rawUrl
  const evolutionApiKey = process.env.EVOLUTION_API_KEY
  const defaultInstanceName = process.env.EVOLUTION_INSTANCE_NAME
  const webhookUrl = process.env.EVOLUTION_WEBHOOK_URL || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/whatsapp/webhook` : null)

  if (!evolutionApiUrl || !evolutionApiKey) {
    return { error: 'Missing Evolution API config (EVOLUTION_API_URL / EVOLUTION_API_KEY)' }
  }

  return { evolutionApiUrl, evolutionApiKey, defaultInstanceName, webhookUrl }
}

// Auto-register webhook for an instance
async function registerWebhookForInstance(
  evolutionApiUrl: string,
  evolutionApiKey: string,
  instanceName: string,
  webhookUrl: string
) {
  try {
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
    console.log(`[Evolution] Webhook registered for ${instanceName}:`, response.ok ? 'success' : 'failed', data)
    return { success: response.ok, data }
  } catch (error: any) {
    console.error(`[Evolution] Failed to register webhook for ${instanceName}:`, error.message)
    return { success: false, error: error.message }
  }
}

async function evolutionRequest(
  url: string,
  apiKey: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: any
) {
  const response = await fetch(url, {
    method,
    headers: {
      apikey: apiKey,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  })

  let data: any = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  return { ok: response.ok, status: response.status, data }
}

export async function GET() {
  try {
    const config = getEvolutionConfig()
    if ('error' in config) {
      return NextResponse.json({ success: false, error: config.error }, { status: 400 })
    }

    const { evolutionApiUrl, evolutionApiKey } = config
    const result = await evolutionRequest(`${evolutionApiUrl}/instance/fetchInstances`, evolutionApiKey)

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch instances', details: result.data },
        { status: result.status || 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data || [] })
  } catch (error: any) {
    console.error('[WhatsApp Instances] GET error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const config = getEvolutionConfig()
    if ('error' in config) {
      return NextResponse.json({ success: false, error: config.error }, { status: 400 })
    }

    const { evolutionApiUrl, evolutionApiKey, defaultInstanceName, webhookUrl } = config
    const body = await request.json()
    const action = body?.action as string | undefined
    const instanceName = body?.instanceName || defaultInstanceName

    if (!action) {
      return NextResponse.json({ success: false, error: 'Missing action' }, { status: 400 })
    }

    if (!instanceName && action !== 'create') {
      return NextResponse.json({ success: false, error: 'Missing instanceName' }, { status: 400 })
    }

    if (action === 'create') {
      const newInstanceName = body?.instanceName || defaultInstanceName
      if (!newInstanceName) {
        return NextResponse.json({ success: false, error: 'Missing instanceName for create' }, { status: 400 })
      }

      const result = await evolutionRequest(
        `${evolutionApiUrl}/instance/create`,
        evolutionApiKey,
        'POST',
        {
          instanceName: newInstanceName,
          integration: 'WHATSAPP-BAILEYS',
          qrcode: true
        }
      )

      // Auto-register webhook if creation succeeded
      let webhookResult = null
      if (result.ok && webhookUrl) {
        webhookResult = await registerWebhookForInstance(evolutionApiUrl, evolutionApiKey, newInstanceName, webhookUrl)
      }

      return NextResponse.json(
        { success: result.ok, action, instanceName: newInstanceName, data: result.data, webhook: webhookResult },
        { status: result.ok ? 200 : result.status || 500 }
      )
    }

    if (action === 'connect') {
      const result = await evolutionRequest(
        `${evolutionApiUrl}/instance/connect/${instanceName}`,
        evolutionApiKey,
        'GET'
      )

      // Auto-register webhook on connect (ensures webhook is set after restart/reconnect)
      let webhookResult = null
      if (result.ok && webhookUrl) {
        webhookResult = await registerWebhookForInstance(evolutionApiUrl, evolutionApiKey, instanceName, webhookUrl)
      }

      return NextResponse.json(
        { success: result.ok, action, instanceName, data: result.data, webhook: webhookResult },
        { status: result.ok ? 200 : result.status || 500 }
      )
    }

    if (action === 'logout') {
      const result = await evolutionRequest(
        `${evolutionApiUrl}/instance/logout/${instanceName}`,
        evolutionApiKey,
        'DELETE'
      )

      return NextResponse.json(
        { success: result.ok, action, instanceName, data: result.data },
        { status: result.ok ? 200 : result.status || 500 }
      )
    }

    if (action === 'restart') {
      const logoutResult = await evolutionRequest(
        `${evolutionApiUrl}/instance/logout/${instanceName}`,
        evolutionApiKey,
        'DELETE'
      )

      const connectResult = await evolutionRequest(
        `${evolutionApiUrl}/instance/connect/${instanceName}`,
        evolutionApiKey,
        'GET'
      )

      // Auto-register webhook after restart
      let webhookResult = null
      if (connectResult.ok && webhookUrl) {
        webhookResult = await registerWebhookForInstance(evolutionApiUrl, evolutionApiKey, instanceName, webhookUrl)
      }

      const success = connectResult.ok || logoutResult.ok
      return NextResponse.json(
        {
          success,
          action,
          instanceName,
          data: {
            logout: logoutResult,
            connect: connectResult
          },
          webhook: webhookResult
        },
        { status: success ? 200 : 500 }
      )
    }

    if (action === 'delete') {
      const deleteResult = await evolutionRequest(
        `${evolutionApiUrl}/instance/delete/${instanceName}`,
        evolutionApiKey,
        'DELETE'
      )

      if (deleteResult.ok) {
        return NextResponse.json({ success: true, action, instanceName, data: deleteResult.data })
      }

      const fallbackLogout = await evolutionRequest(
        `${evolutionApiUrl}/instance/logout/${instanceName}`,
        evolutionApiKey,
        'DELETE'
      )

      return NextResponse.json(
        {
          success: fallbackLogout.ok,
          action,
          instanceName,
          data: {
            deleteAttempt: deleteResult,
            logoutFallback: fallbackLogout
          }
        },
        { status: fallbackLogout.ok ? 200 : 500 }
      )
    }

    return NextResponse.json({ success: false, error: `Unsupported action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error('[WhatsApp Instances] POST error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

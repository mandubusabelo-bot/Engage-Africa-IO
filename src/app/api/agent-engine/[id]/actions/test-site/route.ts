import { NextRequest, NextResponse } from 'next/server'

// POST /api/agent-engine/[id]/actions/test-site - Test connectivity to external site
export async function POST(request: NextRequest) {
  const logs: Array<{ ts: string; level: 'info' | 'warn' | 'error' | 'success'; msg: string }> = []
  const log = (level: 'info' | 'warn' | 'error' | 'success', msg: string) => {
    logs.push({ ts: new Date().toISOString(), level, msg })
  }

  try {
    const { url: targetUrl } = await request.json()
    const siteUrl = targetUrl || process.env.NEXT_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://intandokaziherbal.co.za'
    const apiSecret = process.env.AGENT_API_SECRET

    log('info', `Testing connectivity to: ${siteUrl}`)

    // Test 1: Basic reachability
    log('info', '--- Test 1: Site reachability ---')
    try {
      const startMs = Date.now()
      const res = await fetch(siteUrl, { redirect: 'follow' })
      const elapsed = Date.now() - startMs
      log(res.ok ? 'success' : 'error', `GET ${siteUrl} → ${res.status} (${elapsed}ms)`)
      if (res.redirected) {
        log('info', `Redirected to: ${res.url}`)
      }
    } catch (err: any) {
      log('error', `Site unreachable: ${err.message}`)
    }

    // Test 2: Store page
    log('info', '--- Test 2: Store page ---')
    try {
      const baseUrl = siteUrl.replace(/\/$/, '')
      const startMs = Date.now()
      const res = await fetch(`${baseUrl}/store`, { redirect: 'follow' })
      const elapsed = Date.now() - startMs
      log(res.ok ? 'success' : 'error', `GET ${baseUrl}/store → ${res.status} (${elapsed}ms)`)
    } catch (err: any) {
      log('error', `Store page unreachable: ${err.message}`)
    }

    // Test 3: Product search API
    log('info', '--- Test 3: Product search API ---')
    if (!apiSecret) {
      log('error', 'AGENT_API_SECRET is not set in environment variables')
      log('warn', 'Product search requires x-agent-secret header to authenticate')
    } else {
      try {
        const baseUrl = siteUrl.replace(/\/$/, '')
        const searchUrl = `${baseUrl}/api/agent/products/search?q=umuthi`
        log('info', `GET ${searchUrl}`)

        const startMs = Date.now()
        const res = await fetch(searchUrl, {
          headers: {
            'x-agent-secret': apiSecret,
            'Content-Type': 'application/json'
          }
        })
        const elapsed = Date.now() - startMs

        log('info', `Response: ${res.status} (${elapsed}ms)`)

        const contentType = res.headers.get('content-type') || ''
        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => null)
          if (data) {
            log('info', `Response body: ${JSON.stringify(data).slice(0, 800)}`)
            if (data.success && data.products?.length > 0) {
              log('success', `Found ${data.products.length} products matching "umuthi"`)
              data.products.slice(0, 3).forEach((p: any, i: number) => {
                log('info', `  Product ${i + 1}: ${p.name} — R${p.price}`)
              })
            } else if (data.success) {
              log('warn', 'API returned success but no products found for "umuthi"')
            } else {
              log('error', `API error: ${data.error || 'Unknown'}`)
            }
          }
        } else {
          const text = await res.text().catch(() => '')
          log('error', `Unexpected response type (${contentType}): ${text.slice(0, 300)}`)
        }
      } catch (err: any) {
        log('error', `Product API error: ${err.message}`)
      }
    }

    // Test 4: Order prepare endpoint
    log('info', '--- Test 4: Order prepare endpoint ---')
    if (!apiSecret) {
      log('warn', 'Skipping order API test (no AGENT_API_SECRET)')
    } else {
      try {
        const baseUrl = siteUrl.replace(/\/$/, '')
        const orderUrl = `${baseUrl}/api/agent/orders/prepare`
        log('info', `OPTIONS ${orderUrl} (checking availability)`)

        const startMs = Date.now()
        const res = await fetch(orderUrl, {
          method: 'OPTIONS',
          headers: { 'x-agent-secret': apiSecret }
        })
        const elapsed = Date.now() - startMs
        log(res.status < 500 ? 'success' : 'error', `Order API responds: ${res.status} (${elapsed}ms)`)
      } catch (err: any) {
        log('error', `Order API unreachable: ${err.message}`)
      }
    }

    // Test 5: Booking availability endpoint
    log('info', '--- Test 5: Booking availability API ---')
    if (!apiSecret) {
      log('warn', 'Skipping booking API test (no AGENT_API_SECRET)')
    } else {
      try {
        const baseUrl = siteUrl.replace(/\/$/, '')
        const availUrl = `${baseUrl}/api/agent/bookings/availability?days=7`
        log('info', `GET ${availUrl}`)

        const startMs = Date.now()
        const res = await fetch(availUrl, {
          headers: {
            'x-agent-secret': apiSecret,
            'Content-Type': 'application/json'
          }
        })
        const elapsed = Date.now() - startMs

        log('info', `Response: ${res.status} (${elapsed}ms)`)

        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (data) {
            log('info', `Total available slots: ${data.total_slots ?? 'N/A'}`)
            if (data.availability) {
              const dates = Object.keys(data.availability)
              log('info', `Dates with slots: ${dates.length > 0 ? dates.slice(0, 5).join(', ') : 'None'}`)
            }
            log('success', 'Booking availability API is working')
          }
        } else {
          const text = await res.text().catch(() => '')
          log('error', `Booking availability failed: ${res.status} — ${text.slice(0, 200)}`)
        }
      } catch (err: any) {
        log('error', `Booking API error: ${err.message}`)
      }
    }

    // Test 6: Booking check by phone endpoint
    log('info', '--- Test 6: Booking check API ---')
    if (!apiSecret) {
      log('warn', 'Skipping booking check test (no AGENT_API_SECRET)')
    } else {
      try {
        const baseUrl = siteUrl.replace(/\/$/, '')
        const checkUrl = `${baseUrl}/api/agent/bookings?phone=27000000000`
        log('info', `GET ${checkUrl}`)

        const startMs = Date.now()
        const res = await fetch(checkUrl, {
          headers: {
            'x-agent-secret': apiSecret,
            'Content-Type': 'application/json'
          }
        })
        const elapsed = Date.now() - startMs
        log('info', `Response: ${res.status} (${elapsed}ms)`)

        if (res.ok) {
          const data = await res.json().catch(() => null)
          log('success', `Booking check API working — found ${data?.count ?? 0} bookings for test phone`)
        } else {
          log('error', `Booking check failed: ${res.status}`)
        }
      } catch (err: any) {
        log('error', `Booking check API error: ${err.message}`)
      }
    }

    // Test 7: Order status check endpoint
    log('info', '--- Test 7: Order status API ---')
    if (!apiSecret) {
      log('warn', 'Skipping order status test (no AGENT_API_SECRET)')
    } else {
      try {
        const baseUrl = siteUrl.replace(/\/$/, '')
        const statusUrl = `${baseUrl}/api/agent/orders/TEST-000/status`
        log('info', `GET ${statusUrl}`)

        const startMs = Date.now()
        const res = await fetch(statusUrl, {
          headers: { 'x-agent-secret': apiSecret }
        })
        const elapsed = Date.now() - startMs
        log('info', `Response: ${res.status} (${elapsed}ms)`)
        log(res.status === 404 || res.ok ? 'success' : 'error', `Order status API responds correctly (${res.status === 404 ? '404 for fake ref = correct' : res.status})`)
      } catch (err: any) {
        log('error', `Order status API error: ${err.message}`)
      }
    }

    const allSuccess = logs.every(l => l.level !== 'error')
    log(allSuccess ? 'success' : 'warn', `Site connectivity test complete — ${allSuccess ? 'ALL PASSED' : 'SOME FAILURES'}`)

    return NextResponse.json({ success: allSuccess, logs })
  } catch (error: any) {
    log('error', `Unexpected error: ${error.message}`)
    return NextResponse.json({ success: false, error: error.message, logs }, { status: 500 })
  }
}

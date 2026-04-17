import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { flowExecutor } from '@/lib/flowExecutor'
import { createHash, timingSafeEqual } from 'crypto'

// Simple in-memory idempotency store (use Redis in production)
const processedEvents = new Map<string, number>()
const IDEMPOTENCY_WINDOW = 5 * 60 * 1000 // 5 minutes

// Verify webhook signature (HMAC-SHA256)
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const expected = createHash('sha256').update(payload + secret).digest('hex')
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

// Check idempotency - return true if event was already processed recently
function isEventProcessed(eventId: string): boolean {
  const timestamp = processedEvents.get(eventId)
  if (!timestamp) return false
  
  // Clean up old entries
  if (Date.now() - timestamp > IDEMPOTENCY_WINDOW) {
    processedEvents.delete(eventId)
    return false
  }
  
  return true
}

// Mark event as processed
function markEventProcessed(eventId: string) {
  processedEvents.set(eventId, Date.now())
  
  // Clean up old entries periodically
  if (processedEvents.size > 1000) {
    const now = Date.now()
    for (const [id, timestamp] of processedEvents.entries()) {
      if (now - timestamp > IDEMPOTENCY_WINDOW) {
        processedEvents.delete(id)
      }
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flowId = params.id
    const body = await request.json()
    const rawBody = await request.text()
    
    // Get event type from header or body
    const eventType = request.headers.get('X-Webhook-Event') || body.event_type || 'generic'
    const eventId = body.id || body.event_id || `${flowId}-${Date.now()}`
    const signature = request.headers.get('X-Webhook-Signature') || ''
    
    // Fetch the flow to verify it exists and is active
    const { data: flow, error } = await supabaseAdmin
      .from('flows')
      .select('*')
      .eq('id', flowId)
      .single()

    if (error) throw error
    if (!flow) {
      return NextResponse.json({ success: false, error: 'Flow not found' }, { status: 404 })
    }
    if (!((flow as any).is_active)) {
      return NextResponse.json({ success: false, error: 'Flow is not active' }, { status: 400 })
    }

    // Check if trigger type is webhook
    const trigger = ((flow as any).trigger as any)
    if (trigger?.type !== 'webhook') {
      return NextResponse.json({ success: false, error: 'Flow is not configured for webhook triggers' }, { status: 400 })
    }

    // Verify signature if secret is configured
    const webhookSecret = trigger.webhookSecret || process.env.WEBHOOK_SECRET
    if (webhookSecret && signature) {
      if (!verifySignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 })
      }
    }

    // Check idempotency
    if (isEventProcessed(eventId)) {
      return NextResponse.json({ success: true, message: 'Event already processed', eventId })
    }

    // Execute the flow in background (respond quickly)
    markEventProcessed(eventId)
    
    // Execute asynchronously
    flowExecutor.executeFlow(flowId, {
      ...body,
      triggerType: 'webhook',
      eventType,
      eventId,
      timestamp: new Date().toISOString()
    }).catch(error => {
      console.error('Webhook flow execution error:', error)
      // In production, you might want to retry or notify
    })

    // Respond immediately (important for webhooks)
    return NextResponse.json({
      success: true,
      message: 'Webhook accepted, flow executing',
      eventId
    })
  } catch (error: any) {
    console.error('Webhook trigger error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// GET endpoint to return webhook URL info
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flowId = params.id
    const baseUrl = request.nextUrl.origin
    
    return NextResponse.json({
      success: true,
      data: {
        webhookUrl: `${baseUrl}/api/webhooks/flow/${flowId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        supportedHeaders: {
          'X-Webhook-Event': 'Event type (e.g., stripe.payment, github.push)',
          'X-Webhook-Signature': 'HMAC-SHA256 signature for verification'
        },
        idempotency: 'Events are deduplicated for 5 minutes based on event_id'
      }
    })
  } catch (error: any) {
    console.error('Get webhook URL error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { flowExecutor } from '@/lib/flowExecutor'

// Universal trigger API endpoint - can trigger any flow from any source
// This is the central trigger hub that can be called from anywhere
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { flowId, triggerType = 'api', payload = {}, context = {} } = body

    if (!flowId) {
      return NextResponse.json({ success: false, error: 'flowId is required' }, { status: 400 })
    }

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

    // Build state with trigger source information
    const state = {
      ...payload,
      ...context,
      trigger_source: triggerType,
      timestamp: new Date().toISOString()
    }

    // Execute the flow asynchronously
    flowExecutor.executeFlow(flowId, state).catch(error => {
      console.error('Universal trigger flow execution error:', error)
    })

    return NextResponse.json({
      success: true,
      message: 'Flow triggered',
      flowId,
      triggerType
    })
  } catch (error: any) {
    console.error('Universal trigger error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// GET endpoint to list available trigger types
export async function GET() {
  return NextResponse.json({
    success: true,
    triggerTypes: {
      manual: 'Manual trigger via UI or API',
      scheduled: 'Scheduled via cron expression',
      webhook: 'HTTP webhook from external services',
      event: 'Internal event system (message queues, pub/sub)',
      api: 'Universal API trigger (this endpoint)'
    },
    usage: {
      method: 'POST',
      body: {
        flowId: 'string (required)',
        triggerType: 'string (optional, default: "api")',
        payload: 'object (optional, data to pass to flow)',
        context: 'object (optional, additional context)'
      }
    },
    example: {
      flowId: 'your-flow-id',
      triggerType: 'api',
      payload: { query: 'Hello world' },
      context: { userId: '123' }
    }
  })
}

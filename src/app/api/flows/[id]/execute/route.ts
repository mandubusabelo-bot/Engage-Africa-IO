import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'
import { flowExecutor } from '@/lib/flowExecutor'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const flowId = params.id
    const body = await request.json()
    
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
    if (!flow.is_active) {
      return NextResponse.json({ success: false, error: 'Flow is not active' }, { status: 400 })
    }

    // Check if trigger type is manual
    const trigger = flow.trigger as any
    if (trigger?.type !== 'manual') {
      return NextResponse.json({ success: false, error: 'Flow is not configured for manual triggers' }, { status: 400 })
    }

    // Execute the flow
    const result = await flowExecutor.executeFlow(flowId, {
      ...body,
      triggerType: 'manual',
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Manual trigger error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

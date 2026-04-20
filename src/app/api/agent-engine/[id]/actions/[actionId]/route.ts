import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// PUT /api/agent-engine/[id]/actions/[actionId] - Update a specific action
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const updates = await request.json()
    const { id: agentId, actionId } = params

    console.log(`[PUT Action] agentId=${agentId}, actionId=${actionId}, updates=`, updates)

    // Check if this is a default action (ID starts with 'default_')
    const isDefaultAction = actionId?.startsWith('default_')
    console.log(`[PUT Action] isDefaultAction=${isDefaultAction}`)

    // Whitelist known DB columns to avoid sending unknown fields
    const allowedFields = [
      'action_type', 'trigger_condition', 'instruction', 'is_enabled',
      'priority', 'config'
    ]

    const basePayload: Record<string, any> = {
      updated_at: new Date().toISOString()
    }

    for (const key of allowedFields) {
      if (key in updates && key !== 'config') {
        basePayload[key] = updates[key]
      }
    }

    let data: any = null
    let error: any = null

    if (isDefaultAction) {
      // Create new action in database
      const actionType = updates.action_type || actionId.replace('default_', '')
      const createPayload: Record<string, any> = {
        agent_id: agentId,
        action_type: actionType,
        is_enabled: updates.is_enabled ?? false,
        trigger_condition: updates.trigger_condition || '',
        instruction: updates.instruction || '',
        priority: updates.priority || 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      if ('config' in updates) {
        createPayload.config = updates.config ?? null
      }

      console.log(`[PUT Action] Creating action with payload:`, createPayload)
      const createResult = await supabaseAdmin
        .from('agent_actions')
        .insert(createPayload)
        .select()
        .single()

      data = createResult.data
      error = createResult.error
      console.log(`[PUT Action] Create result:`, { data: data ? { id: data.id, type: data.action_type } : null, error: error?.message })
    } else {
      // Update existing action
      if ('config' in updates) {
        const payloadWithConfig = { ...basePayload, config: updates.config ?? null }
        const result = await supabaseAdmin
          .from('agent_actions')
          .update(payloadWithConfig)
          .eq('id', actionId)
          .eq('agent_id', agentId)
          .select()
          .single()

        data = result.data
        error = result.error

        // Fallback: config column may not exist
        if (error && (
          String(error.message || '').toLowerCase().includes('config') ||
          String(error.code || '') === '42703'
        )) {
          console.warn('Config column not found, retrying without config field')
          const fallback = await supabaseAdmin
            .from('agent_actions')
            .update(basePayload)
            .eq('id', actionId)
            .eq('agent_id', agentId)
            .select()
            .single()

          data = fallback.data
          error = fallback.error
        }
      } else {
        const result = await supabaseAdmin
          .from('agent_actions')
          .update(basePayload)
          .eq('id', actionId)
          .eq('agent_id', agentId)
          .select()
          .single()

        data = result.data
        error = result.error
      }
    }

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Action not found or could not be created' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Update agent action error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// GET /api/agent-engine/[id]/actions/[actionId] - Get a specific action
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const { id: agentId, actionId } = params

    const { data, error } = await supabaseAdmin
      .from('agent_actions')
      .select('*')
      .eq('id', actionId)
      .eq('agent_id', agentId)
      .single()

    if (error) throw error

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Action not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Get agent action error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// DELETE /api/agent-engine/[id]/actions/[actionId] - Delete a specific action
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; actionId: string } }
) {
  try {
    const { id: agentId, actionId } = params

    const { error } = await supabaseAdmin
      .from('agent_actions')
      .delete()
      .eq('id', actionId)
      .eq('agent_id', agentId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: 'Action deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete agent action error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

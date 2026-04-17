import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

// GET /api/agent-engine/[id]/actions - Get all actions for an agent
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: actions, error } = await supabaseAdmin
      .from('agent_actions')
      .select('*')
      .eq('agent_id', params.id)
      .order('priority', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: actions || [] })
  } catch (error: any) {
    console.error('Get agent actions error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/agent-engine/[id]/actions - Update all actions for an agent
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { actions } = await request.json()

    // Update each action
    const updatePromises = actions.map(async (action: any) => {
      const { data, error } = await supabaseAdmin
        .from('agent_actions')
        .update({
          is_enabled: action.is_enabled,
          trigger_condition: action.trigger_condition,
          instruction: action.instruction,
          priority: action.priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', action.id)
        .select()
        .single()

      if (error) throw error
      return data
    })

    const updatedActions = await Promise.all(updatePromises)

    return NextResponse.json({ success: true, data: updatedActions })
  } catch (error: any) {
    console.error('Update agent actions error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// POST /api/agent-engine/[id]/actions - Create a new action for an agent
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actionData = await request.json()

    const { data, error } = await supabaseAdmin
      .from('agent_actions')
      .insert({
        agent_id: params.id,
        action_type: actionData.action_type,
        is_enabled: actionData.is_enabled ?? false,
        trigger_condition: actionData.trigger_condition || '',
        instruction: actionData.instruction || '',
        priority: actionData.priority || 'medium'
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Create agent action error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// DELETE /api/agent-engine/[id]/actions?actionId=xxx - Delete a specific action
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const actionId = searchParams.get('actionId')

    if (!actionId) {
      return NextResponse.json({ success: false, error: 'actionId is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('agent_actions')
      .delete()
      .eq('id', actionId)
      .eq('agent_id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Action deleted' })
  } catch (error: any) {
    console.error('Delete agent action error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

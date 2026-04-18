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

    const { data, error } = await supabaseAdmin
      .from('agent_actions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId)
      .eq('agent_id', agentId)
      .select()
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

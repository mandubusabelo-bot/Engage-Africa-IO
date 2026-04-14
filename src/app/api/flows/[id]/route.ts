import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: flow, error } = await supabaseAdmin
      .from('flows')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error
    if (!flow) {
      return NextResponse.json({ success: false, error: 'Flow not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: flow })
  } catch (error: any) {
    console.error('Get flow error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.trigger !== undefined) updateData.trigger = body.trigger
    if (body.steps !== undefined) updateData.steps = body.steps
    if (body.isActive !== undefined) updateData.is_active = body.isActive
    if (body.status !== undefined) updateData.status = body.status

    const { data: flow, error } = await supabaseAdmin
      .from('flows')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error
    if (!flow) {
      return NextResponse.json({ success: false, error: 'Flow not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: flow })
  } catch (error: any) {
    console.error('Update flow error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('flows')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Flow deleted' })
  } catch (error: any) {
    console.error('Delete flow error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

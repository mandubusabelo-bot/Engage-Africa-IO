import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: agent })
  } catch (error: any) {
    console.error('Get agent error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const updates = await request.json()

    const { data: agent, error } = await supabaseAdmin
      .from('agents')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: agent })
  } catch (error: any) {
    console.error('Update agent error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

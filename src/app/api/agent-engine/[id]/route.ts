import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Add auth check back after testing
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const { data: agent, error } = await supabase
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    const { data: agent, error } = await supabase
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

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { data: flows, error } = await supabaseAdmin
      .from('flows')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: flows || [] })
  } catch (error: any) {
    console.error('Get flows error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data: flow, error } = await supabaseAdmin
      .from('flows')
      .insert({
        name: body.name,
        description: body.description,
        trigger: body.trigger || { type: 'manual' },
        steps: body.steps || [],
        is_active: body.isActive !== false,
        user_id: body.user_id || null
      } as any)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data: flow })
  } catch (error: any) {
    console.error('Create flow error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

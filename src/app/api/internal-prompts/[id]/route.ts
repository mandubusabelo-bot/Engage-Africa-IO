import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('internal_prompts')
      .update({
        label: body.label,
        description: body.description,
        template: body.template,
        channel: body.channel,
        active: body.active,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Update internal prompt error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

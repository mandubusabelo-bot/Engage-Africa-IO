import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabaseAdmin
      .from('knowledge_base')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Knowledge item deleted' })
  } catch (error: any) {
    console.error('Delete knowledge item error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('internal_prompts')
      .select('*')
      .order('channel', { ascending: true })
      .order('label', { ascending: true })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error: any) {
    console.error('Get internal prompts error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

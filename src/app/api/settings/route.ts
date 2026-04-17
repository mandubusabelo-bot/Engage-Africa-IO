import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

const defaultRuntimeSettings = {
  whatsappMode: 'auto',
  workflowEventTriggersEnabled: true,
  whatsappQrTimeoutMs: 180000
}

export async function GET(request: NextRequest) {
  try {
    const { data: row, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'runtime')
      .single()

    if (error) {
      return NextResponse.json({ success: true, data: defaultRuntimeSettings })
    }

    const runtimeSettings = {
      ...defaultRuntimeSettings,
      ...((row as any)?.value || {})
    }

    return NextResponse.json({ success: true, data: runtimeSettings })
  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json({ success: true, data: defaultRuntimeSettings })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()

    const mergedSettings = {
      ...defaultRuntimeSettings,
      ...body
    }

    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert(
        {
          key: 'runtime',
          value: mergedSettings,
          updated_at: new Date().toISOString()
        } as any,
        {
          onConflict: 'key'
        }
      )

    if (error) {
      return NextResponse.json({ success: true, data: mergedSettings })
    }

    return NextResponse.json({ success: true, data: mergedSettings })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

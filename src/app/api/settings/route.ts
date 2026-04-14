import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check back after testing
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    // Return settings from environment variables
    const settings = {
      openRouterApiKey: process.env.OPENROUTER_API_KEY ? '***' : '',
      geminiApiKey: process.env.GEMINI_API_KEY ? '***' : '',
      whatsappEnabled: false
    }

    return NextResponse.json({ success: true, data: settings })
  } catch (error: any) {
    console.error('Get settings error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    // TODO: Add auth check back after testing
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const body = await request.json()
    
    // Settings would be stored in a settings table or environment variables
    // For now, just return success
    return NextResponse.json({ success: true, data: body })
  } catch (error: any) {
    console.error('Update settings error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

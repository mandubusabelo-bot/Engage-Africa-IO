import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        status: 'disconnected',
        mode: 'none',
        warning: 'WhatsApp GCP integration not configured'
      }
    })
  } catch (error: any) {
    console.error('WhatsApp GCP status error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

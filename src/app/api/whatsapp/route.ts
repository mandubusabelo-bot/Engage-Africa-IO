import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'status') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'disconnected',
          qrCode: null,
          warning: 'WhatsApp API routes not implemented. Please configure WhatsApp Business API instead.'
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        status: 'disconnected'
      }
    })
  } catch (error: any) {
    console.error('WhatsApp API error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

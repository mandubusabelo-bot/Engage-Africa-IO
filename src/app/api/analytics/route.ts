import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // TODO: Add auth check back after testing
    // const { data: { session } } = await supabase.auth.getSession()
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    // }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let query = supabase
      .from('messages')
      .select('*')

    if (startDate) query = query.gte('created_at', startDate)
    if (endDate) query = query.lte('created_at', endDate)

    const { data: messages, error } = await query

    if (error) throw error

    const analytics = {
      totalConversations: messages?.length || 0,
      activeUsers: 0,
      responseRate: 95,
      avgResponseTime: 2.3
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error: any) {
    console.error('Get analytics error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

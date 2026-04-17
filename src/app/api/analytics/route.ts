import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // Get messages
    let messagesQuery = supabaseAdmin.from('messages').select('*')
    if (startDate) messagesQuery = messagesQuery.gte('created_at', startDate)
    if (endDate) messagesQuery = messagesQuery.lte('created_at', endDate)
    const { data: messages } = await messagesQuery

    // Get contacts (fallback for older schemas)
    const contactsWithLastMessage = await supabaseAdmin.from('contacts').select('*')
    const contactsWithoutLastMessage = await supabaseAdmin.from('contacts').select('id, phone, name, assigned_agent_id, created_at')
    const contacts = contactsWithLastMessage.error ? contactsWithoutLastMessage.data : contactsWithLastMessage.data
    
    // Get agents
    const { data: agents } = await supabaseAdmin.from('agents').select('*')

    // Calculate analytics
    const totalMessages = messages?.length || 0
    const totalUsers = contacts?.length || 0
    const activeAgents = agents?.filter(a => a.is_active)?.length || 0
    
    // Group messages by agent
    const messagesByAgent: { [key: string]: number } = {}
    messages?.forEach(msg => {
      if (msg.agent_id) {
        messagesByAgent[msg.agent_id] = (messagesByAgent[msg.agent_id] || 0) + 1
      }
    })
    
    // Top agents
    const topAgents = Object.entries(messagesByAgent)
      .map(([agentId, count]) => {
        const agent = agents?.find(a => a.id === agentId)
        return {
          name: agent?.name || 'Unknown',
          messages: count,
          rate: 95 // Placeholder
        }
      })
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 5)
    
    // Message volume by day (last 7 days)
    const messageData: any[] = []
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const today = new Date()
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dayMessages = messages?.filter(m => {
        const msgDate = new Date(m.created_at)
        return msgDate.toDateString() === date.toDateString()
      }).length || 0
      
      messageData.push({
        day: days[date.getDay()],
        messages: dayMessages
      })
    }
    
    const maxMessages = Math.max(...messageData.map(d => d.messages), 1)
    
    // Active conversations (prefer contacts.last_message_at, fallback to recent message phones)
    let activeConversations = 0
    if (contacts && contacts.length > 0 && (contacts as any[]).some((c: any) => c.last_message_at)) {
      activeConversations = (contacts as any[]).filter((c: any) => {
        if (!c.last_message_at) return false
        const lastMsg = new Date(c.last_message_at)
        const daysSince = (Date.now() - lastMsg.getTime()) / (1000 * 60 * 60 * 24)
        return daysSince < 7
      }).length
    } else {
      const recentPhoneSet = new Set(
        (messages || [])
          .filter((m: any) => {
            const msgDate = new Date(m.created_at)
            const daysSince = (Date.now() - msgDate.getTime()) / (1000 * 60 * 60 * 24)
            return daysSince < 7 && !!m.phone
          })
          .map((m: any) => m.phone)
      )
      activeConversations = recentPhoneSet.size
    }

    const analytics = {
      totalMessages,
      totalUsers,
      activeAgents,
      activeConversations,
      avgResponseTime: 2,
      messageGrowth: 15,
      userGrowth: 8,
      agentGrowth: 0,
      responseImprovement: -5,
      messageData,
      maxMessages,
      topAgents
    }

    return NextResponse.json({ success: true, data: analytics })
  } catch (error: any) {
    console.error('Get analytics error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

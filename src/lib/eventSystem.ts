import { supabaseAdmin } from './supabase-server'
import { flowExecutor } from './flowExecutor'

export class EventSystem {
  private listeners: Map<string, Set<() => void>> = new Map()

  // Subscribe to an event
  subscribe(eventType: string, callback: () => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)
  }

  // Unsubscribe from an event
  unsubscribe(eventType: string, callback: () => void) {
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.delete(callback)
    }
  }

  // Emit an event
  async emit(eventType: string, data: any = {}) {
    console.log(`Emitting event: ${eventType}`, data)
    
    // Find and execute flows that are triggered by this event
    await this.triggerEventFlows(eventType, data)
    
    // Notify local listeners
    const callbacks = this.listeners.get(eventType)
    if (callbacks) {
      callbacks.forEach(callback => callback())
    }
  }

  // Find and execute flows triggered by an event
  private async triggerEventFlows(eventType: string, data: any) {
    try {
      const { data: flows, error } = await supabaseAdmin
        .from('flows')
        .select('*')
        .eq('is_active', true)
        .not('trigger', 'is', null)

      if (error) throw error
      
      // If no flows configured, use default agent response for WhatsApp
      if (!flows || flows.length === 0) {
        if (eventType === EventTypes.WHATSAPP_INBOUND_MESSAGE && data.phone) {
          console.log('[EventSystem] No flows configured, using default agent response')
          await this.executeDefaultAgentResponse(data)
        }
        return
      }

      let flowTriggered = false
      for (const flow of flows) {
        const trigger = flow.trigger as any
        
        if (trigger?.type === 'event' && trigger?.event) {
          // Check if the flow's event matches the emitted event
          if (this.eventMatches(trigger.event, eventType)) {
            console.log(`Triggering flow "${flow.name}" for event: ${eventType}`)
            await flowExecutor.executeFlow(flow.id, {
              ...data,
              triggerType: 'event',
              eventType,
              timestamp: new Date().toISOString()
            })
            flowTriggered = true
          }
        }
      }
      
      // Fallback to default agent if no flow matched
      if (!flowTriggered && eventType === EventTypes.WHATSAPP_INBOUND_MESSAGE && data.phone) {
        console.log('[EventSystem] No matching flow, using default agent response')
        await this.executeDefaultAgentResponse(data)
      }
    } catch (error: any) {
      console.error('Error triggering event flows:', error)
    }
  }
  
  // Default agent response when no flows are configured
  private async executeDefaultAgentResponse(data: any) {
    try {
      // Get first active agent
      const { data: agents, error } = await supabaseAdmin
        .from('agents')
        .select('*')
        .eq('is_active', true)
        .limit(1)
      
      if (error || !agents || agents.length === 0) {
        console.log('[EventSystem] No active agents found for default response')
        return
      }
      
      const agent = agents[0]
      console.log(`[EventSystem] Using default agent: ${agent.name}`)
      
      // Call agent chat endpoint
      const chatUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.RAILWAY_PUBLIC_DOMAIN || ''}/api/agent-engine/${agent.id}/chat`
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: data.message,
          phone: data.phone,
          conversationId: data.phone
        })
      })
      
      const result = await response.json()
      console.log('[EventSystem] Default agent response:', result.success ? 'sent' : 'failed')
    } catch (error: any) {
      console.error('[EventSystem] Default agent response error:', error.message)
    }
  }

  // Check if a flow's event pattern matches the emitted event
  private eventMatches(flowEvent: string, emittedEvent: string): boolean {
    // Exact match
    if (flowEvent === emittedEvent) return true
    
    // Wildcard match (e.g., "whatsapp.*" matches "whatsapp.inbound_message")
    if (flowEvent.includes('*')) {
      const pattern = flowEvent.replace(/\*/g, '.*')
      const regex = new RegExp(`^${pattern}$`)
      return regex.test(emittedEvent)
    }
    
    return false
  }
}

export const eventSystem = new EventSystem()

// Common event types
export const EventTypes = {
  WHATSAPP_INBOUND_MESSAGE: 'whatsapp.inbound_message',
  WHATSAPP_OUTBOUND_MESSAGE: 'whatsapp.outbound_message',
  WHATSAPP_STATUS_UPDATE: 'whatsapp.status_update',
  AGENT_RESPONSE: 'agent.response',
  FLOW_COMPLETED: 'flow.completed',
  FLOW_FAILED: 'flow.failed',
  USER_SIGNUP: 'user.signup',
  USER_LOGIN: 'user.login'
}

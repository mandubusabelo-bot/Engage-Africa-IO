import { eventSystem } from './eventSystem'
import { supabaseAdmin } from './supabase-server'

// Workflow trigger event types
export const WorkflowTriggers = {
  CONVERSATION_OPENED: 'conversation.opened',
  CONVERSATION_CLOSED: 'conversation.closed',
  CONTACT_FIELD_UPDATED: 'contact.field_updated',
  CONTACT_TAG_UPDATED: 'contact.tag_updated',
  INCOMING_WEBHOOK: 'webhook.incoming',
  WHATSAPP_MESSAGE_RECEIVED: 'whatsapp.message_received',
  WHATSAPP_MESSAGE_SENT: 'whatsapp.message_sent',
  AGENT_ASSIGNED: 'agent.assigned',
  SCHEDULED_TIME: 'schedule.time',
} as const

export type TriggerType = typeof WorkflowTriggers[keyof typeof WorkflowTriggers]

// Trigger metadata for UI
export const TriggerMetadata = {
  [WorkflowTriggers.CONVERSATION_OPENED]: {
    label: 'Conversation Opened',
    description: 'When a new conversation starts with a contact',
    icon: '💬',
    color: 'blue'
  },
  [WorkflowTriggers.CONVERSATION_CLOSED]: {
    label: 'Conversation Closed',
    description: 'When a conversation is marked as closed',
    icon: '✅',
    color: 'green'
  },
  [WorkflowTriggers.CONTACT_FIELD_UPDATED]: {
    label: 'Contact Field Updated',
    description: 'When a contact field is modified',
    icon: '✏️',
    color: 'purple'
  },
  [WorkflowTriggers.CONTACT_TAG_UPDATED]: {
    label: 'Contact Tag Updated',
    description: 'When tags are added or removed from a contact',
    icon: '🏷️',
    color: 'pink'
  },
  [WorkflowTriggers.INCOMING_WEBHOOK]: {
    label: 'Incoming Webhook',
    description: 'When an external webhook is received',
    icon: '🔗',
    color: 'cyan'
  },
  [WorkflowTriggers.WHATSAPP_MESSAGE_RECEIVED]: {
    label: 'WhatsApp Message Received',
    description: 'When an inbound WhatsApp message arrives',
    icon: '📥',
    color: 'green'
  },
  [WorkflowTriggers.WHATSAPP_MESSAGE_SENT]: {
    label: 'WhatsApp Message Sent',
    description: 'After sending a WhatsApp message',
    icon: '📤',
    color: 'blue'
  },
  [WorkflowTriggers.AGENT_ASSIGNED]: {
    label: 'Agent Assigned',
    description: 'When an agent is assigned to a contact',
    icon: '👤',
    color: 'orange'
  },
  [WorkflowTriggers.SCHEDULED_TIME]: {
    label: 'Scheduled Time',
    description: 'At a specific time or interval',
    icon: '⏰',
    color: 'yellow'
  }
}

// Emit trigger events
export async function emitConversationOpened(contactId: string, phone: string) {
  console.log(`[Trigger] Conversation opened: ${phone}`)
  await eventSystem.emit(WorkflowTriggers.CONVERSATION_OPENED, {
    contactId,
    phone,
    timestamp: new Date().toISOString()
  })
}

export async function emitConversationClosed(contactId: string, reason?: string) {
  console.log(`[Trigger] Conversation closed: ${contactId}`)
  await eventSystem.emit(WorkflowTriggers.CONVERSATION_CLOSED, {
    contactId,
    reason,
    timestamp: new Date().toISOString()
  })
}

export async function emitContactFieldUpdated(contactId: string, field: string, oldValue: any, newValue: any) {
  console.log(`[Trigger] Contact field updated: ${field}`)
  await eventSystem.emit(WorkflowTriggers.CONTACT_FIELD_UPDATED, {
    contactId,
    field,
    oldValue,
    newValue,
    timestamp: new Date().toISOString()
  })
}

export async function emitContactTagUpdated(contactId: string, tags: string[], action: 'added' | 'removed') {
  console.log(`[Trigger] Contact tags ${action}:`, tags)
  await eventSystem.emit(WorkflowTriggers.CONTACT_TAG_UPDATED, {
    contactId,
    tags,
    action,
    timestamp: new Date().toISOString()
  })
}

export async function emitAgentAssigned(contactId: string, agentId: string, agentName: string) {
  console.log(`[Trigger] Agent assigned: ${agentName} to contact ${contactId}`)
  await eventSystem.emit(WorkflowTriggers.AGENT_ASSIGNED, {
    contactId,
    agentId,
    agentName,
    timestamp: new Date().toISOString()
  })
}

export async function emitWhatsAppMessageReceived(phone: string, message: string, contactName?: string) {
  console.log(`[Trigger] WhatsApp message received from ${contactName || phone}`)
  await eventSystem.emit(WorkflowTriggers.WHATSAPP_MESSAGE_RECEIVED, {
    phone,
    message,
    contactName,
    timestamp: new Date().toISOString()
  })
}

export async function emitWhatsAppMessageSent(phone: string, message: string) {
  console.log(`[Trigger] WhatsApp message sent to ${phone}`)
  await eventSystem.emit(WorkflowTriggers.WHATSAPP_MESSAGE_SENT, {
    phone,
    message,
    timestamp: new Date().toISOString()
  })
}

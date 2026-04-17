import { supabase } from './supabase'

const API_URL = '/api'

const getToken = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || 'demo-token'
  } catch (error) {
    console.error('Error getting Supabase session:', error)
    return 'demo-token'
  }
}

const handleResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') || ''
  const raw = await response.text()

  if (!contentType.includes('application/json')) {
    const preview = raw.slice(0, 80).replace(/\s+/g, ' ')
    throw new Error(`API returned non-JSON response (${response.status}). Preview: ${preview}`)
  }

  const data = JSON.parse(raw)
  if (!response.ok) {
    throw new Error(data.error || 'API request failed')
  }
  return data
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    return handleResponse(response)
  },

  async deleteAgent(agentId: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${agentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    return handleResponse(response)
  },

  async register(email: string, password: string, name: string) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    })
    return handleResponse(response)
  },

  // Agents
  async getAgents() {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async getAgent(id: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async createAgent(agentData: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentData)
    })
    return handleResponse(response)
  },

  async updateAgent(agentId: string, updates: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${agentId}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    })
    return handleResponse(response)
  },

  async chatWithAgent(agentId: string, message: string, conversationId?: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${agentId}/chat`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message, conversationId })
    })
    return handleResponse(response)
  },

  // Knowledge Base
  async getAgentKnowledge(agentId: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${agentId}/knowledge`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async addAgentKnowledge(agentId: string, knowledgeData: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${agentId}/knowledge`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(knowledgeData)
    })
    return handleResponse(response)
  },

  async uploadAgentKnowledgeFile(agentId: string, formData: FormData) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/upload/knowledge/${agentId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    })
    return handleResponse(response)
  },

  async deleteAgentKnowledge(agentId: string, knowledgeId: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/agent-engine/${agentId}/knowledge/${knowledgeId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  // Messages
  async getMessages() {
    const response = await fetch(`${API_URL}/messages`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  async sendMessage(agentId: string, content: string, sender: 'user' | 'bot' = 'user', phone?: string, name?: string) {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
      body: JSON.stringify({ agentId, content, sender, phone, name })
    })
    return handleResponse(response)
  },

  async deleteMessages(phone: string) {
    const response = await fetch(`${API_URL}/messages?phone=${encodeURIComponent(phone)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  // WhatsApp
  async getWhatsAppStatus() {
    const response = await fetch(`${API_URL}/whatsapp/status`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  async getWhatsAppGcpStatus() {
    const response = await fetch(`${API_URL}/whatsapp/gcp-status`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  async initializeWhatsAppSmart() {
    const response = await fetch(`${API_URL}/whatsapp/initialize-smart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      }
    })
    return handleResponse(response)
  },

  async configureWhatsAppBusiness(config: { accessToken: string; phoneNumberId: string }) {
    const response = await fetch(`${API_URL}/whatsapp/configure-business`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
      body: JSON.stringify(config)
    })
    return handleResponse(response)
  },

  async sendWhatsAppMessage(phone: string, message: string) {
    const response = await fetch(`${API_URL}/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
      body: JSON.stringify({ phone, message })
    })
    return handleResponse(response)
  },

  // Contacts
  async getContacts() {
    const token = await getToken()
    const response = await fetch(`${API_URL}/contacts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async createContact(data: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/contacts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async getContact(id: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/contacts/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async updateContact(id: string, data: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/contacts/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  // Analytics
  async getAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    
    const response = await fetch(`${API_URL}/analytics?${params}`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  // Flows
  async getFlows() {
    const token = await getToken()
    const response = await fetch(`${API_URL}/flows`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async getWorkflows() {
    const token = await getToken()
    const response = await fetch(`${API_URL}/flows`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const result = await handleResponse(response)
    // Transform field names for frontend compatibility
    if (result.success && result.data) {
      result.data = result.data.map((f: any) => ({
        ...f,
        isActive: f.is_active !== false,
        runCount: f.run_count || 0
      }))
    }
    return result
  },

  async createWorkflow(data: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/flows`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        isActive: data.isActive !== false
      })
    })
    return handleResponse(response)
  },

  async updateWorkflow(id: string, data: any) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/flows/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async deleteWorkflow(id: string) {
    const token = await getToken()
    const response = await fetch(`${API_URL}/flows/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return handleResponse(response)
  },

  async getWebhookUrl(flowId: string) {
    const response = await fetch(`${API_URL}/webhooks/flow/${flowId}`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  async getFlowRuns(flowId: string, limit = 20) {
    const response = await fetch(`${API_URL}/flows/${flowId}/runs?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  // Templates
  async getTemplates() {
    const response = await fetch(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  async createTemplate(data: any) {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  },

  async deleteTemplate(id: string) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  // Settings
  async getSettings() {
    const response = await fetch(`${API_URL}/settings`, {
      headers: { 'Authorization': `Bearer ${await getToken()}` }
    })
    return handleResponse(response)
  },

  async updateSettings(data: any) {
    const response = await fetch(`${API_URL}/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getToken()}`
      },
      body: JSON.stringify(data)
    })
    return handleResponse(response)
  }
}

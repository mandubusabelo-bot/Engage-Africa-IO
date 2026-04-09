const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getToken = () => localStorage.getItem('token') || 'demo-token';

const handleResponse = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
};

export const api = {
  // Auth
  async login(email: string, password: string) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return handleResponse(response);
  },

  async register(email: string, password: string, name: string) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    });
    return handleResponse(response);
  },

  // Agents
  async getAgents() {
    const response = await fetch(`${API_URL}/agents`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async createAgent(data: any) {
    const response = await fetch(`${API_URL}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async updateAgent(id: string, data: any) {
    const response = await fetch(`${API_URL}/agents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteAgent(id: string) {
    const response = await fetch(`${API_URL}/agents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  // Flows
  async getFlows() {
    const response = await fetch(`${API_URL}/flows`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async createFlow(data: any) {
    const response = await fetch(`${API_URL}/flows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async updateFlow(id: string, data: any) {
    const response = await fetch(`${API_URL}/flows/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteFlow(id: string) {
    const response = await fetch(`${API_URL}/flows/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  // Templates
  async getTemplates() {
    const response = await fetch(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async createTemplate(data: any) {
    const response = await fetch(`${API_URL}/templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async updateTemplate(id: string, data: any) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteTemplate(id: string) {
    const response = await fetch(`${API_URL}/templates/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  // Knowledge Base
  async uploadKnowledge(formData: FormData) {
    const response = await fetch(`${API_URL}/knowledge/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });
    return handleResponse(response);
  },

  async getKnowledge(agentId: string) {
    const response = await fetch(`${API_URL}/knowledge/${agentId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async addKnowledge(data: any) {
    const response = await fetch(`${API_URL}/knowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  async deleteKnowledge(id: string) {
    const response = await fetch(`${API_URL}/knowledge/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async updateKnowledge(id: string, data: any) {
    const response = await fetch(`${API_URL}/knowledge/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    return handleResponse(response);
  },

  // Messages
  async getMessages() {
    const response = await fetch(`${API_URL}/messages`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async sendMessage(agentId: string, content: string, sender: 'user' | 'bot' = 'user', phone?: string, name?: string) {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ agentId, content, sender, phone, name })
    });
    return handleResponse(response);
  },

  // WhatsApp
  async getWhatsAppStatus() {
    const response = await fetch(`${API_URL}/whatsapp/status`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async initializeWhatsApp() {
    const response = await fetch(`${API_URL}/whatsapp/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return handleResponse(response);
  },

  async disconnectWhatsApp() {
    const response = await fetch(`${API_URL}/whatsapp/disconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      }
    });
    return handleResponse(response);
  },

  async sendWhatsAppMessage(to: string, message: string) {
    const response = await fetch(`${API_URL}/whatsapp/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ to, message })
    });
    return handleResponse(response);
  },

  async optimizeAgentText(text: string, field: string) {
    const response = await fetch(`${API_URL}/agents/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ text, field })
    });
    return handleResponse(response);
  },

  async testAgent(agentId: string, message: string) {
    const response = await fetch(`${API_URL}/agents/${agentId}/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ message })
    });
    return handleResponse(response);
  },

  // Analytics
  async getAnalytics(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_URL}/analytics?${params}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  // Agent Actions
  async getAgentActions(agentId: string) {
    const response = await fetch(`${API_URL}/actions/agent/${agentId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  },

  async createAgentAction(action: any) {
    const response = await fetch(`${API_URL}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(action)
    });
    return handleResponse(response);
  },

  async updateAgentAction(actionId: string, updates: any) {
    const response = await fetch(`${API_URL}/actions/${actionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(updates)
    });
    return handleResponse(response);
  },

  async deleteAgentAction(actionId: string) {
    const response = await fetch(`${API_URL}/actions/${actionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    return handleResponse(response);
  }
};

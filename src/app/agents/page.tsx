'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Bot, Plus, Edit, Power, MessageSquare, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import InlineToast from '@/components/InlineToast'

interface Agent {
  id: string
  name: string
  description: string
  instructions: string
  personality: string
  language: string
  status?: string
  is_active?: boolean
  message_count: number
  response_rate: number
}

export default function Agents() {
  const router = useRouter()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    instructions: '',
    personality: 'professional',
    language: 'english'
  })
  const [editingAgent, setEditingAgent] = useState<any>(null)
  const [uploading, setUploading] = useState(false)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadAgents()
  }, [])

  const loadAgents = async () => {
    try {
      setLoading(true)
      const response = await api.getAgents()
      if (response.success && response.data) {
        setAgents(response.data)
      }
    } catch (error) {
      console.error('Failed to load agents:', error)
    } finally {
      setLoading(false)
    }
  }

  const isAgentActive = (agent: Agent) => {
    if (typeof agent.is_active === 'boolean') return agent.is_active
    return (agent.status || '').toLowerCase() === 'active'
  }

  const handleCreateAgent = async () => {
    try {
      setUploading(true)
      const response = await api.createAgent(newAgent)
      if (response.success) {
        await loadAgents()
        setShowCreateModal(false)
        setNewAgent({
          name: '',
          description: '',
          instructions: '',
          personality: 'professional',
          language: 'english'
        })
      }
    } catch (error) {
      console.error('Failed to create agent:', error)
      alert('Failed to create agent. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleEditAgent = (agent: any) => {
    setEditingAgent(agent)
    setNewAgent({
      name: agent.name,
      description: agent.description || '',
      instructions: agent.instructions || '',
      personality: agent.personality || 'professional',
      language: agent.language || 'english'
    })
    setShowEditModal(true)
  }

  const handleUpdateAgent = async () => {
    try {
      setUploading(true)
      const response = await api.updateAgent(editingAgent.id, newAgent)
      if (response.success) {
        await loadAgents()
        setShowEditModal(false)
        setEditingAgent(null)
        setNewAgent({
          name: '',
          description: '',
          instructions: '',
          personality: 'professional',
          language: 'english'
        })
      }
    } catch (error) {
      console.error('Failed to update agent:', error)
      alert('Failed to update agent. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const toggleAgentStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id)
    if (!agent) return
    
    const nextIsActive = !isAgentActive(agent)
    const previous = agents
    setAgents((current) => current.map((a) => a.id === id ? { ...a, is_active: nextIsActive } : a))

    try {
      await api.updateAgent(id, { is_active: nextIsActive })
      showToast(nextIsActive ? 'Agent activated for chats' : 'Agent paused', 'success')
    } catch (error) {
      setAgents(previous)
      console.error('Failed to toggle agent status:', error)
      showToast('Failed to update agent status.', 'error')
    }
  }

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Delete this agent? This action cannot be undone.')) return

    const previous = agents
    setAgents((current) => current.filter((agent) => agent.id !== id))

    try {
      await api.deleteAgent(id)
      showToast('Agent deleted', 'success')
    } catch (error) {
      setAgents(previous)
      console.error('Failed to delete agent:', error)
      showToast('Failed to delete agent', 'error')
    }
  }

  return (
    <Layout>
      {toast && (
        <InlineToast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100">AI Agents</h1>
            <p className="text-slate-400 mt-1">Manage your AI-powered customer service agents</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 transition-colors"
          >
            <Plus size={16} />
            Create Agent
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="text-cyan-300" size={24} />
              <h3 className="text-sm font-medium text-slate-400">Total Agents</h3>
            </div>
            <p className="text-3xl font-bold text-slate-100">{agents.length}</p>
          </div>
          <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <Power className="text-emerald-300" size={24} />
              <h3 className="text-sm font-medium text-slate-400">Active Agents</h3>
            </div>
            <p className="text-3xl font-bold text-slate-100">
              {agents.filter((a) => isAgentActive(a)).length}
            </p>
          </div>
          <div className="bg-slate-950/60 p-6 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="text-indigo-300" size={24} />
              <h3 className="text-sm font-medium text-slate-400">Total Messages</h3>
            </div>
            <p className="text-3xl font-bold text-slate-100">
              {agents.reduce((sum, a) => sum + (a.message_count || 0), 0)}
            </p>
          </div>
        </div>

        {loading && (
          <div className="mb-6 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
            Loading agents...
          </div>
        )}

        {/* Agents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map(agent => (
            <div 
              key={agent.id} 
              className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 sm:p-6 hover:border-slate-700 transition-colors"
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-2xl ${
                    isAgentActive(agent) ? 'bg-cyan-500/20 border border-cyan-400/30' : 'bg-slate-800 border border-slate-700'
                  }`}>
                    🤖
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-100 text-sm sm:text-base break-words">{agent.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      isAgentActive(agent)
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {isAgentActive(agent) ? 'active' : 'inactive'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleAgentStatus(agent.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isAgentActive(agent)
                      ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  <Power size={18} />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-400 mb-3 sm:mb-4 line-clamp-2">{agent.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-slate-800">
                <div>
                  <p className="text-xs text-slate-500">Messages</p>
                  <p className="text-sm sm:text-lg font-bold text-slate-100">{agent.message_count || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Response Rate</p>
                  <p className="text-sm sm:text-lg font-bold text-slate-100">{agent.response_rate || 0}%</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => router.push(`/agents/${agent.id}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-200 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                >
                  <Edit size={14} />
                  Manage
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-lg hover:bg-rose-500/20 transition-colors"
                  title="Delete agent"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {isAgentActive(agent) && (
                <p className="mt-3 text-xs text-emerald-300">
                  Active for live chat routing
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
            <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-4 sm:mb-6">Create New Agent</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    rows={3}
                    placeholder="Describe what this agent does and its purpose..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Instructions</label>
                  <textarea
                    value={newAgent.instructions}
                    onChange={(e) => setNewAgent({...newAgent, instructions: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    rows={4}
                    placeholder="Give step-by-step instructions on how the agent should behave and respond..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Personality</label>
                    <select
                      value={newAgent.personality}
                      onChange={(e) => setNewAgent({...newAgent, personality: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                    <select
                      value={newAgent.language}
                      onChange={(e) => setNewAgent({...newAgent, language: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    >
                      <option value="english">English</option>
                      <option value="swahili">Swahili</option>
                      <option value="zulu">Zulu</option>
                      <option value="xhosa">Xhosa</option>
                      <option value="afrikaans">Afrikaans</option>
                      <option value="french">French</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-900 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAgent}
                  disabled={!newAgent.name || !newAgent.description || uploading}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-cyan-500 text-slate-950 rounded-lg font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {uploading ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Agent Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 sm:p-4">
            <div className="w-full max-w-2xl max-h-[95vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mb-4 sm:mb-6">Edit Agent</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    rows={3}
                    placeholder="Describe what this agent does and its purpose..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Instructions</label>
                  <textarea
                    value={newAgent.instructions}
                    onChange={(e) => setNewAgent({...newAgent, instructions: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    rows={4}
                    placeholder="Give step-by-step instructions on how the agent should behave and respond..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Personality</label>
                    <select
                      value={newAgent.personality}
                      onChange={(e) => setNewAgent({...newAgent, personality: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                    <select
                      value={newAgent.language}
                      onChange={(e) => setNewAgent({...newAgent, language: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 focus:ring-2 focus:ring-cyan-500/40 outline-none text-sm sm:text-base"
                    >
                      <option value="english">English</option>
                      <option value="swahili">Swahili</option>
                      <option value="zulu">Zulu</option>
                      <option value="xhosa">Xhosa</option>
                      <option value="afrikaans">Afrikaans</option>
                      <option value="french">French</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-8">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-900 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAgent}
                  disabled={!newAgent.name || !newAgent.description || uploading}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-cyan-500 text-slate-950 rounded-lg font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {uploading ? 'Updating...' : 'Update Agent'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

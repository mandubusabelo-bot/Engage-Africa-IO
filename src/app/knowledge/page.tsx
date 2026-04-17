'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { BookOpen, Plus, Trash2, Edit2, Save, X, Globe, Bot } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface KnowledgeItem {
  id: string
  title: string
  content: string
  agent_id: string | null
  created_at: string
}

interface Agent {
  id: string
  name: string
}

export default function KnowledgePage() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    agent_id: null as string | null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load knowledge base
      const { data: kb, error: kbError } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (!kbError && kb) {
        setKnowledge(kb)
      }
      
      // Load agents
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select('id, name')
      
      if (!agentsError && agentsData) {
        setAgents(agentsData)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!formData.title || !formData.content) return
    
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title: formData.title,
          content: formData.content,
          agent_id: formData.agent_id
        })
      
      if (!error) {
        setShowAddModal(false)
        setFormData({ title: '', content: '', agent_id: null })
        loadData()
      }
    } catch (error) {
      console.error('Failed to add knowledge:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this knowledge item?')) return
    
    try {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id)
      
      if (!error) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to delete knowledge:', error)
    }
  }

  const getAgentName = (agentId: string | null) => {
    if (!agentId) return 'Global (All Agents)'
    return agents.find(a => a.id === agentId)?.name || 'Unknown Agent'
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BookOpen size={28} />
              Knowledge Base
            </h1>
            <p className="text-gray-400 mt-1">
              Manage AI knowledge sources for your agents
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
            Add Knowledge
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{knowledge.length}</div>
            <div className="text-gray-400 text-sm">Total Items</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {knowledge.filter(k => k.agent_id === null).length}
            </div>
            <div className="text-gray-400 text-sm">Global Knowledge</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">
              {knowledge.filter(k => k.agent_id !== null).length}
            </div>
            <div className="text-gray-400 text-sm">Agent-Specific</div>
          </div>
        </div>

        {/* Knowledge List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading knowledge base...</div>
          ) : knowledge.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <BookOpen size={48} className="mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Knowledge Items</h3>
              <p className="text-gray-400 mb-4">
                Add knowledge to help your AI agents provide accurate information
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Add First Knowledge Item
              </button>
            </div>
          ) : (
            knowledge.map((item) => (
              <div key={item.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{item.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      {item.agent_id ? (
                        <>
                          <Bot size={16} />
                          <span>{getAgentName(item.agent_id)}</span>
                        </>
                      ) : (
                        <>
                          <Globe size={16} />
                          <span>Global (All Agents)</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 text-gray-300 text-sm whitespace-pre-wrap">
                  {item.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Add Knowledge</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="e.g., Company Information"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Assign to Agent
                  </label>
                  <select
                    value={formData.agent_id || ''}
                    onChange={(e) => setFormData({ ...formData, agent_id: e.target.value || null })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Global (All Agents)</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={10}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter knowledge content that the AI should use to answer questions..."
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!formData.title || !formData.content}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Save size={18} />
                    Add Knowledge
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

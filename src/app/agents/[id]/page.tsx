'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { Bot, BookOpen, Plus, Trash2, Save, ArrowLeft, Power } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface KnowledgeItem {
  id: string
  title: string
  content: string
  created_at: string
}

export default function AgentDetail() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<any>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddKnowledge, setShowAddKnowledge] = useState(false)
  const [showLinkKnowledge, setShowLinkKnowledge] = useState(false)
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '' })
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState('')
  const [activeTab, setActiveTab] = useState<'settings' | 'knowledge'>('settings')

  useEffect(() => {
    loadData()
  }, [agentId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load agent
      const { data: agentData } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single()

      if (agentData) {
        setAgent(agentData)
      }

      // Load agent's knowledge
      const { data: kb } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false })

      if (kb) {
        setKnowledge(kb)
      }

      // Load all global knowledge for linking
      const { data: globalKb } = await supabase
        .from('knowledge_base')
        .select('*')
        .is('agent_id', null)
        .order('created_at', { ascending: false })

      if (globalKb) {
        setAllKnowledge(globalKb)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return

    try {
      const { error } = await supabase
        .from('knowledge_base')
        .insert({
          title: newKnowledge.title,
          content: newKnowledge.content,
          agent_id: agentId
        })

      if (!error) {
        setShowAddKnowledge(false)
        setNewKnowledge({ title: '', content: '' })
        loadData()
      }
    } catch (error) {
      console.error('Failed to add knowledge:', error)
    }
  }

  const handleLinkKnowledge = async () => {
    if (!selectedKnowledgeId) return

    try {
      // Get the global knowledge item
      const { data: globalItem } = await supabase
        .from('knowledge_base')
        .select('*')
        .eq('id', selectedKnowledgeId)
        .single()

      if (globalItem) {
        // Create a copy for this agent
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            title: globalItem.title,
            content: globalItem.content,
            agent_id: agentId
          })

        if (!error) {
          setShowLinkKnowledge(false)
          setSelectedKnowledgeId('')
          loadData()
        }
      }
    } catch (error) {
      console.error('Failed to link knowledge:', error)
    }
  }

  const handleDeleteKnowledge = async (id: string) => {
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

  const handleUpdateAgent = async (updates: any) => {
    try {
      const { error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', agentId)

      if (!error) {
        loadData()
      }
    } catch (error) {
      console.error('Failed to update agent:', error)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="text-slate-400">Loading...</div>
        </div>
      </Layout>
    )
  }

  if (!agent) {
    return (
      <Layout>
        <div className="p-8">
          <div className="text-slate-400">Agent not found</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.push('/agents')}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <p className="text-slate-400 text-sm">{agent.description}</p>
          </div>
          <button
            onClick={() => handleUpdateAgent({ is_active: !agent.is_active })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              agent.is_active
                ? 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Power size={18} />
            {agent.is_active ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveTab('knowledge')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'knowledge'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <BookOpen size={18} />
            Knowledge Base ({knowledge.length})
          </button>
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Agent Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    value={agent.system_prompt || ''}
                    onChange={(e) => setAgent({ ...agent, system_prompt: e.target.value })}
                    onBlur={() => handleUpdateAgent({ system_prompt: agent.system_prompt })}
                    rows={6}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Enter the system prompt for this agent..."
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Base Tab */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddKnowledge(true)}
                className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                Add New Knowledge
              </button>
              <button
                onClick={() => setShowLinkKnowledge(true)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <BookOpen size={18} />
                Link Existing Knowledge
              </button>
            </div>

            {/* Knowledge List */}
            <div className="space-y-3">
              {knowledge.length === 0 ? (
                <div className="bg-slate-900 rounded-lg p-8 text-center">
                  <BookOpen size={48} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-400">No knowledge items yet</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Add knowledge to help this agent provide accurate responses
                  </p>
                </div>
              ) : (
                knowledge.map((item) => (
                  <div key={item.id} className="bg-slate-900 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{item.title}</h4>
                      <button
                        onClick={() => handleDeleteKnowledge(item.id)}
                        className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-slate-400 text-sm whitespace-pre-wrap">{item.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Add Knowledge Modal */}
        {showAddKnowledge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-xl font-bold text-white mb-4">Add Knowledge</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Title
                  </label>
                  <input
                    type="text"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Product Information"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Content
                  </label>
                  <textarea
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                    rows={10}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="Enter the knowledge content..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddKnowledge(false)
                    setNewKnowledge({ title: '', content: '' })
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddKnowledge}
                  disabled={!newKnowledge.title || !newKnowledge.content}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Knowledge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Link Knowledge Modal */}
        {showLinkKnowledge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-white mb-4">Link Existing Knowledge</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Select Knowledge Base
                  </label>
                  <select
                    value={selectedKnowledgeId}
                    onChange={(e) => setSelectedKnowledgeId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Choose a knowledge base...</option>
                    {allKnowledge.map((kb) => (
                      <option key={kb.id} value={kb.id}>
                        {kb.title}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedKnowledgeId && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-sm">
                      {allKnowledge.find(kb => kb.id === selectedKnowledgeId)?.content.substring(0, 200)}...
                    </p>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowLinkKnowledge(false)
                    setSelectedKnowledgeId('')
                  }}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLinkKnowledge}
                  disabled={!selectedKnowledgeId}
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Link Knowledge
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

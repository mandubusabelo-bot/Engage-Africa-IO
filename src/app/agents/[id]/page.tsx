'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { 
  Bot, BookOpen, Plus, Trash2, Save, ArrowLeft, Power, 
  MessageSquare, Settings, Sparkles, Play, X, ChevronDown,
  RefreshCw, TestTube, Variable, Clock, User, Brain,
  Shield, AlertCircle, CheckCircle, Sliders
} from 'lucide-react'
import { api } from '@/lib/api'
import InlineToast from '@/components/InlineToast'
import VariablePicker from '@/components/VariablePicker'

interface KnowledgeItem {
  id: string
  title: string
  content: string
  created_at: string
  search_strategy?: 'always' | 'relevant' | 'never'
  confidence_threshold?: number
  last_trained_at?: string
  is_enabled?: boolean
}

interface AgentAction {
  id: string
  action_type: string
  is_enabled: boolean
  trigger_condition: string
  instruction: string
  priority: 'low' | 'medium' | 'high'
}

const ACTION_TYPES = [
  { type: 'close_conversation', label: 'Close conversations', icon: CheckCircle },
  { type: 'assign_to_agent', label: 'Assign to agent/team', icon: User },
  { type: 'update_lifecycle', label: 'Update lifecycle stages', icon: RefreshCw },
  { type: 'update_contact_field', label: 'Update contact fields', icon: Sliders },
  { type: 'update_tags', label: 'Update tags', icon: Sparkles },
  { type: 'trigger_workflow', label: 'Trigger workflows', icon: Play },
  { type: 'add_comment', label: 'Add comments', icon: MessageSquare },
  { type: 'handle_call', label: 'Handle calls', icon: User },
  { type: 'http_request', label: 'Make HTTP requests', icon: Brain },
]

export default function AgentDetail() {
  const params = useParams()
  const router = useRouter()
  const agentId = params.id as string

  const [agent, setAgent] = useState<any>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([])
  const [allKnowledge, setAllKnowledge] = useState<KnowledgeItem[]>([])
  const [actions, setActions] = useState<AgentAction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Tab state - expanded tabs
  const [activeTab, setActiveTab] = useState<'identity' | 'actions' | 'knowledge' | 'memory' | 'behavior'>('identity')
  
  // Modal states
  const [showAddKnowledge, setShowAddKnowledge] = useState(false)
  const [showLinkKnowledge, setShowLinkKnowledge] = useState(false)
  const [showTestDrawer, setShowTestDrawer] = useState(false)
  const [showTestActionDrawer, setShowTestActionDrawer] = useState<string | null>(null)
  const [showKbTestModal, setShowKbTestModal] = useState(false)
  
  // Form states
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '' })
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState('')
  const [kbTestQuery, setKbTestQuery] = useState('')
  const [kbTestResults, setKbTestResults] = useState<any>(null)
  
  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  
  // Refs for textareas with variable insertion
  const greetingRef = useRef<HTMLTextAreaElement>(null)
  const fallbackRef = useRef<HTMLTextAreaElement>(null)
  const unknownAnswerRef = useRef<HTMLTextAreaElement>(null)
  const inactivityRef = useRef<HTMLTextAreaElement>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Helper to insert variable at cursor position in textarea
  const insertVariableAtCursor = (
    ref: React.RefObject<HTMLTextAreaElement>,
    variable: string,
    fieldName: string
  ) => {
    const textarea = ref.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const value = textarea.value
    const newValue = value.substring(0, start) + variable + value.substring(end)
    
    // Update agent state
    setAgent((prev: any) => ({ ...prev, [fieldName]: newValue }))
    
    // Restore cursor position after the inserted variable
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + variable.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const loadData = useCallback(async () => {
    try {
      setLoading(true)

      // Load agent
      const agentRes = await api.getAgent(agentId)
      if (agentRes.success && agentRes.data) {
        setAgent(agentRes.data)
      }

      // Load agent's knowledge
      const kbRes = await fetch(`/api/knowledge-base?agentId=${agentId}`)
      const kbJson = await kbRes.json()
      if (kbJson.success) {
        setKnowledge(kbJson.data || [])
      }

      // Load all global knowledge for linking
      const globalRes = await fetch('/api/knowledge-base?scope=global')
      const globalJson = await globalRes.json()
      if (globalJson.success) {
        setAllKnowledge(globalJson.data || [])
      }

      // Load agent actions
      try {
        const actionsRes = await fetch(`/api/agent-engine/${agentId}/actions`)
        const actionsJson = await actionsRes.json()
        if (actionsJson.success) {
          setActions(actionsJson.data || [])
        }
      } catch {
        // Fallback: create default actions
        const defaultActions: AgentAction[] = ACTION_TYPES.map((type, index) => ({
          id: `action_${index}`,
          action_type: type.type,
          is_enabled: false,
          trigger_condition: '',
          instruction: '',
          priority: 'medium'
        }))
        setActions(defaultActions)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }, [agentId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleAddKnowledge = async () => {
    if (!newKnowledge.title || !newKnowledge.content) return

    try {
      const response = await fetch('/api/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newKnowledge.title,
          content: newKnowledge.content,
          agent_id: agentId
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowAddKnowledge(false)
        setNewKnowledge({ title: '', content: '' })
        loadData()
        showToast('Knowledge item added', 'success')
      }
    } catch (error) {
      console.error('Failed to add knowledge:', error)
      showToast('Failed to add knowledge', 'error')
    }
  }

  const handleLinkKnowledge = async () => {
    if (!selectedKnowledgeId) return

    try {
      // Get the global knowledge item
      const globalItem = allKnowledge.find((k) => k.id === selectedKnowledgeId)

      if (globalItem) {
        // Create a copy for this agent
        const response = await fetch('/api/knowledge-base', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: globalItem.title,
            content: globalItem.content,
            agent_id: agentId
          })
        })

        const result = await response.json()

        if (result.success) {
          setShowLinkKnowledge(false)
          setSelectedKnowledgeId('')
          loadData()
          showToast('Knowledge linked to agent', 'success')
        }
      }
    } catch (error) {
      console.error('Failed to link knowledge:', error)
      showToast('Failed to link knowledge', 'error')
    }
  }

  const handleDeleteKnowledge = async (id: string) => {
    if (!confirm('Delete this knowledge item?')) return

    try {
      const response = await fetch(`/api/knowledge-base/${id}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        loadData()
        showToast('Knowledge deleted', 'success')
      }
    } catch (error) {
      console.error('Failed to delete knowledge:', error)
      showToast('Failed to delete knowledge', 'error')
    }
  }

  const handleUpdateAgent = async (updates: any) => {
    const previous = agent
    setAgent((current: any) => ({ ...(current || {}), ...updates }))

    try {
      const response = await api.updateAgent(agentId, updates)

      if (response.success) {
        loadData()
        showToast('Agent settings updated', 'success')
      }
    } catch (error) {
      setAgent(previous)
      console.error('Failed to update agent:', error)
      showToast('Failed to update agent', 'error')
    }
  }

  const handleUpdateAction = async (actionId: string, updates: Partial<AgentAction>) => {
    const previousActions = actions
    setActions(current => current.map(a => a.id === actionId ? { ...a, ...updates } : a))

    try {
      const response = await fetch(`/api/agent-engine/${agentId}/actions/${actionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      const result = await response.json()
      if (!result.success) throw new Error('Failed to update')
      showToast('Action updated', 'success')
    } catch (error) {
      setActions(previousActions)
      console.error('Failed to update action:', error)
      showToast('Failed to update action', 'error')
    }
  }

  const handleUpdateKbSettings = async (kbId: string, settings: Partial<KnowledgeItem>) => {
    const previousKnowledge = knowledge
    setKnowledge(current => current.map(k => k.id === kbId ? { ...k, ...settings } : k))

    try {
      const response = await fetch(`/api/knowledge-base/${kbId}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      const result = await response.json()
      if (!result.success) throw new Error('Failed to update')
      showToast('Knowledge settings updated', 'success')
    } catch (error) {
      setKnowledge(previousKnowledge)
      console.error('Failed to update KB settings:', error)
      showToast('Failed to update settings', 'error')
    }
  }

  const handleReindexKnowledge = async (kbId: string) => {
    try {
      const response = await fetch(`/api/knowledge-base/${kbId}/reindex`, {
        method: 'POST'
      })
      const result = await response.json()
      if (result.success) {
        setKnowledge(current => current.map(k => 
          k.id === kbId ? { ...k, last_trained_at: new Date().toISOString() } : k
        ))
        showToast('Knowledge re-indexed', 'success')
      }
    } catch (error) {
      console.error('Failed to reindex:', error)
      showToast('Failed to re-index', 'error')
    }
  }

  const handleTestKnowledge = async () => {
    if (!kbTestQuery.trim()) return
    try {
      const response = await fetch(`/api/agent-engine/${agentId}/test-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: kbTestQuery })
      })
      const result = await response.json()
      setKbTestResults(result.data || null)
    } catch (error) {
      console.error('Failed to test knowledge:', error)
      showToast('Failed to test knowledge', 'error')
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

  // Helper to get action label
  const getActionLabel = (type: string) => {
    const action = ACTION_TYPES.find(a => a.type === type)
    return action?.label || type
  }

  // Helper to get action icon
  const getActionIcon = (type: string) => {
    const action = ACTION_TYPES.find(a => a.type === type)
    return action?.icon || Settings
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
      <div className="p-6 max-w-7xl mx-auto">
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTestDrawer(true)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
            >
              <TestTube size={18} />
              Test Agent
            </button>
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
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto">
          {[
            { id: 'identity', label: 'Identity', icon: Bot },
            { id: 'actions', label: 'Actions', icon: Settings },
            { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
            { id: 'memory', label: 'Memory', icon: Brain },
            { id: 'behavior', label: 'Behavior', icon: Sliders },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* IDENTITY TAB */}
        {activeTab === 'identity' && (
          <div className="space-y-6">
            {/* Agent Identity & System Prompt Section */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="text-cyan-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Agent Identity & System Prompt</h3>
              </div>
              
              <div className="space-y-4">
                {/* Agent Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Agent Name
                  </label>
                  <input
                    type="text"
                    value={agent.agent_name || agent.name || ''}
                    onChange={(e) => setAgent({ ...agent, agent_name: e.target.value })}
                    onBlur={() => handleUpdateAgent({ agent_name: agent.agent_name })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Thandi, EngageBot"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    This name is automatically injected into the system prompt as: Your name is (contact name variable)...
                  </p>
                </div>

                {/* System Prompt */}
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
                    placeholder="Enter the core system prompt for this agent..."
                  />
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">
                      {(agent.system_prompt || '').length} characters
                    </span>
                    <span className="text-slate-500">Min 6 rows</span>
                  </div>
                </div>

                {/* Tone Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tone
                  </label>
                  <select
                    value={agent.tone || 'professional'}
                    onChange={(e) => handleUpdateAgent({ tone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="casual">Casual</option>
                    <option value="formal">Formal</option>
                    <option value="bilingual">Bilingual (EN + isiZulu)</option>
                  </select>
                </div>

                {/* Fallback Message */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Fallback Message (when no answer available)
                  </label>
                  <div className="relative">
                    <textarea
                      ref={fallbackRef}
                      value={agent.fallback_message || ''}
                      onChange={(e) => setAgent({ ...agent, fallback_message: e.target.value })}
                      onBlur={() => handleUpdateAgent({ fallback_message: agent.fallback_message })}
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 pr-24"
                      placeholder="What the agent says when it has no answer..."
                    />
                    <div className="absolute top-2 right-2">
                      <VariablePicker 
                        onInsert={(v) => insertVariableAtCursor(fallbackRef, v, 'fallback_message')}
                      />
                    </div>
                  </div>
                </div>

                {/* Never Say Field */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Never Say (comma-separated words/phrases to avoid)
                  </label>
                  <input
                    type="text"
                    value={agent.never_say || ''}
                    onChange={(e) => setAgent({ ...agent, never_say: e.target.value })}
                    onBlur={() => handleUpdateAgent({ never_say: agent.never_say })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., can't help, not my job, whatever"
                  />
                </div>
              </div>
            </div>

            {/* Greeting Configuration */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="text-emerald-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Greeting Configuration</h3>
              </div>
              
              <div className="space-y-4">
                {/* Opening Greeting */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Opening Greeting (first message only)
                  </label>
                  <div className="relative">
                    <textarea
                      ref={greetingRef}
                      value={agent.greeting_message || ''}
                      onChange={(e) => setAgent({ ...agent, greeting_message: e.target.value })}
                      onBlur={() => handleUpdateAgent({ greeting_message: agent.greeting_message })}
                      rows={3}
                      maxLength={320}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 pr-24"
                      placeholder="The EXACT first message sent when a new conversation starts..."
                    />
                    <div className="absolute top-2 right-2">
                      <VariablePicker 
                        onInsert={(v) => insertVariableAtCursor(greetingRef, v, 'greeting_message')}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-slate-500">
                      {(agent.greeting_message || '').length}/320 characters
                    </span>
                    <span className="text-amber-400">
                      This fires once via event system, NOT through LLM
                    </span>
                  </div>
                  
                  {/* Preview Bubble */}
                  {(agent.greeting_message || '') && (
                    <div className="mt-3 p-3 bg-slate-800 rounded-lg border border-slate-700">
                      <p className="text-xs text-slate-500 mb-1">Preview:</p>
                      <div className="flex justify-start">
                        <div className="bg-cyan-500/20 border border-cyan-500/30 rounded-lg rounded-tl-none px-4 py-2 max-w-md">
                          <p className="text-sm text-white">
                            {agent.greeting_message?.replace(/\{\{contact\.name\}\}/g, 'John')}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Read-only system prompt additions */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                  <p className="text-xs font-medium text-slate-400 mb-2">Auto-appended to system prompt (read-only):</p>
                  <p className="text-xs text-slate-500 italic">
                    &quot;IMPORTANT: You have already greeted the contact at the start of this conversation. Do NOT greet again, do NOT say hello or hi again, do NOT introduce yourself again. Continue the conversation naturally from wherever it left off.&quot;
                  </p>
                </div>

                {/* Follow-up Behavior */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    When contact says hi/hello after first message
                  </label>
                  <select
                    value={agent.follow_up_behavior || 'natural'}
                    onChange={(e) => handleUpdateAgent({ follow_up_behavior: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="natural">Respond naturally without re-greeting (recommended)</option>
                    <option value="acknowledge">Acknowledge briefly (&quot;Good to hear from you again!&quot;)</option>
                    <option value="help">Ask how you can help without greeting</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Conversation Continuity */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Conversation Continuity</h3>
              </div>
              
              <div className="space-y-4">
                {/* Suppress intro toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Suppress intro on returning contacts</label>
                    <p className="text-xs text-slate-500">Skip greeting for contacts who recently chatted</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ suppress_intro_returning: !agent.suppress_intro_returning })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.suppress_intro_returning !== false ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.suppress_intro_returning !== false ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {/* Returning contact message */}
                {(agent.suppress_intro_returning !== false) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Returning contact message
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={agent.returning_contact_message || ''}
                        onChange={(e) => setAgent({ ...agent, returning_contact_message: e.target.value })}
                        onBlur={() => handleUpdateAgent({ returning_contact_message: agent.returning_contact_message })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                        placeholder="Welcome back, {{contact.name}}! How can I help?"
                      />
                    </div>
                  </div>
                )}

                {/* Returning contact window */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Returning contact window (hours)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={agent.returning_contact_window_hours || 24}
                    onChange={(e) => handleUpdateAgent({ returning_contact_window_hours: parseInt(e.target.value) })}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Within this window, returning contacts get the short message</p>
                </div>

                {/* Remember last topic */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Remember last topic</label>
                    <p className="text-xs text-slate-500">Inject previous topic into context</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ remember_last_topic: !agent.remember_last_topic })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.remember_last_topic !== false ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.remember_last_topic !== false ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                {/* Inject summary on reassign */}
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Inject conversation summary on reassign</label>
                    <p className="text-xs text-slate-500">Send 1-paragraph summary when conversation is transferred</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ inject_summary_on_reassign: !agent.inject_summary_on_reassign })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.inject_summary_on_reassign !== false ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.inject_summary_on_reassign !== false ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ACTIONS TAB */}
        {activeTab === 'actions' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="text-cyan-400" size={20} />
                  <h3 className="text-lg font-semibold text-white">Action Instructions</h3>
                </div>
                <p className="text-sm text-slate-500">
                  Configure when and how the agent performs actions
                </p>
              </div>

              <div className="space-y-4">
                {actions.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No actions configured</p>
                ) : (
                  actions.map((action) => {
                    const Icon = getActionIcon(action.action_type)
                    return (
                      <div 
                        key={action.id} 
                        className={`bg-slate-800 rounded-lg p-4 border transition-colors ${
                          action.is_enabled ? 'border-cyan-500/30' : 'border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <Icon size={18} className={action.is_enabled ? 'text-cyan-400' : 'text-slate-500'} />
                          <span className="font-medium text-white flex-1">
                            {getActionLabel(action.action_type)}
                          </span>
                          <button
                            onClick={() => handleUpdateAction(action.id, { is_enabled: !action.is_enabled })}
                            className={`relative w-12 h-6 rounded-full transition-colors ${
                              action.is_enabled ? 'bg-cyan-500' : 'bg-slate-700'
                            }`}
                          >
                            <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                              action.is_enabled ? 'translate-x-6' : ''
                            }`} />
                          </button>
                        </div>

                        {action.is_enabled && (
                          <div className="space-y-3 mt-4 pt-4 border-t border-slate-700">
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">
                                Trigger Condition
                              </label>
                              <input
                                type="text"
                                value={action.trigger_condition}
                                onChange={(e) => handleUpdateAction(action.id, { trigger_condition: e.target.value })}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                placeholder="When to trigger this action (e.g., user says 'close my ticket')"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-400 mb-1">
                                Action Instruction
                              </label>
                              <textarea
                                value={action.instruction}
                                onChange={(e) => handleUpdateAction(action.id, { instruction: e.target.value })}
                                rows={2}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                                placeholder="What the agent should do when triggered"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">
                                  Priority
                                </label>
                                <select
                                  value={action.priority}
                                  onChange={(e) => handleUpdateAction(action.id, { priority: e.target.value as any })}
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                </select>
                              </div>
                              <button
                                onClick={() => setShowTestActionDrawer(action.id)}
                                className="mt-5 flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                              >
                                <Play size={14} />
                                Test Action
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* KNOWLEDGE TAB */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {/* Global Knowledge Test */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="text-cyan-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Knowledge Base Settings</h3>
              </div>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={kbTestQuery}
                  onChange={(e) => setKbTestQuery(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="Test knowledge search..."
                />
                <button
                  onClick={handleTestKnowledge}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-medium transition-colors"
                >
                  Search
                </button>
              </div>

              {kbTestResults && (
                <div className="bg-slate-800 rounded-lg p-3 mt-2">
                  <p className="text-xs text-slate-400 mb-2">Search Results:</p>
                  <pre className="text-xs text-slate-300 overflow-auto max-h-40">
                    {JSON.stringify(kbTestResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Knowledge List */}
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Knowledge Items ({knowledge.length})</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowLinkKnowledge(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <BookOpen size={16} />
                    Link Global
                  </button>
                  <button
                    onClick={() => setShowAddKnowledge(true)}
                    className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Add New
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {knowledge.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No knowledge items yet</p>
                    <p className="text-sm mt-1">Add knowledge to help this agent provide accurate responses</p>
                  </div>
                ) : (
                  knowledge.map((item) => (
                    <div key={item.id} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">{item.title}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.content.substring(0, 100)}...
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleReindexKnowledge(item.id)}
                            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                            title="Re-index"
                          >
                            <RefreshCw size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteKnowledge(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-3 pt-3 border-t border-slate-700">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Search Strategy</label>
                          <select
                            value={item.search_strategy || 'always'}
                            onChange={(e) => handleUpdateKbSettings(item.id, { search_strategy: e.target.value as any })}
                            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="always">Always</option>
                            <option value="relevant">Relevant Only</option>
                            <option value="never">Never</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Confidence Threshold</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.1}
                              value={item.confidence_threshold ?? 0.7}
                              onChange={(e) => handleUpdateKbSettings(item.id, { confidence_threshold: parseFloat(e.target.value) })}
                              className="w-24"
                            />
                            <span className="text-xs text-slate-400 w-8">
                              {Math.round((item.confidence_threshold ?? 0.7) * 100)}%
                            </span>
                          </div>
                        </div>
                        {item.last_trained_at && (
                          <div className="text-xs text-slate-500">
                            <span className="block text-slate-600">Last trained</span>
                            {new Date(item.last_trained_at).toLocaleDateString()}
                          </div>
                        )}
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs text-slate-500">Enabled</span>
                          <button
                            onClick={() => handleUpdateKbSettings(item.id, { is_enabled: item.is_enabled !== false })}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                              item.is_enabled !== false ? 'bg-cyan-500' : 'bg-slate-700'
                            }`}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              item.is_enabled !== false ? 'translate-x-5' : ''
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* MEMORY TAB */}
        {activeTab === 'memory' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="text-purple-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Conversation Context Memory</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Remember contact name</label>
                    <p className="text-xs text-slate-500">Store and reuse contact names in conversation</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ memory_remember_name: !agent.memory_remember_name })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.memory_remember_name !== false ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.memory_remember_name !== false ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Remember last product discussed</label>
                    <p className="text-xs text-slate-500">Track products mentioned in conversation</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ memory_remember_product: !agent.memory_remember_product })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.memory_remember_product !== false ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.memory_remember_product !== false ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-slate-800">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Remember open issues</label>
                    <p className="text-xs text-slate-500">Track unresolved issues mentioned</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ memory_remember_issues: !agent.memory_remember_issues })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.memory_remember_issues !== false ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.memory_remember_issues !== false ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                <div className="pt-3">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Maximum conversation turns to remember
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={agent.memory_max_turns || 10}
                    onChange={(e) => handleUpdateAgent({ memory_max_turns: parseInt(e.target.value) })}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Older turns will be summarized or dropped from context
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BEHAVIOR TAB */}
        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Sliders className="text-amber-400" size={20} />
                <h3 className="text-lg font-semibold text-white">Response Behavior</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Max Response Length (tokens)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={2000}
                    step={50}
                    value={agent.max_response_tokens || 300}
                    onChange={(e) => handleUpdateAgent({ max_response_tokens: parseInt(e.target.value) })}
                    className="w-40 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Higher values allow longer responses</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Response Language
                  </label>
                  <select
                    value={agent.response_language || 'auto'}
                    onChange={(e) => handleUpdateAgent({ response_language: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto">Auto-detect (match user)</option>
                    <option value="en">English</option>
                    <option value="zu">isiZulu</option>
                    <option value="af">Afrikaans</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    When agent doesn't know the answer
                  </label>
                  <select
                    value={agent.unknown_answer_action || 'fallback'}
                    onChange={(e) => handleUpdateAgent({ unknown_answer_action: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="fallback">Show fallback message</option>
                    <option value="escalate">Escalate to human agent</option>
                    <option value="search">Search knowledge base again</option>
                  </select>
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Custom message for unknown answers
                  </label>
                  <textarea
                    ref={unknownAnswerRef}
                    value={agent.unknown_answer_message || ''}
                    onChange={(e) => setAgent({ ...agent, unknown_answer_message: e.target.value })}
                    onBlur={() => handleUpdateAgent({ unknown_answer_message: agent.unknown_answer_message })}
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 pr-24"
                    placeholder="I don't have that information right now..."
                  />
                  <div className="absolute top-8 right-2">
                    <VariablePicker 
                      onInsert={(v) => insertVariableAtCursor(unknownAnswerRef, v, 'unknown_answer_message')}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-800">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Ask one question at a time</label>
                    <p className="text-xs text-slate-500">Prevent multiple questions in one message</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ ask_one_question: !agent.ask_one_question })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.ask_one_question ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.ask_one_question ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-slate-800">
                  <div>
                    <label className="text-sm font-medium text-slate-300">Confirm before closing conversation</label>
                    <p className="text-xs text-slate-500">Ask user confirmation before ending chat</p>
                  </div>
                  <button
                    onClick={() => handleUpdateAgent({ confirm_before_close: !agent.confirm_before_close })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      agent.confirm_before_close ? 'bg-cyan-500' : 'bg-slate-700'
                    }`}
                  >
                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      agent.confirm_before_close ? 'translate-x-6' : ''
                    }`} />
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Inactivity timeout message
                  </label>
                  <div className="relative">
                    <textarea
                      ref={inactivityRef}
                      value={agent.inactivity_message || ''}
                      onChange={(e) => setAgent({ ...agent, inactivity_message: e.target.value })}
                      onBlur={() => handleUpdateAgent({ inactivity_message: agent.inactivity_message })}
                      rows={2}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500 pr-24"
                      placeholder="Just checking in — are you still there?"
                    />
                    <div className="absolute top-2 right-2">
                      <VariablePicker 
                        onInsert={(v) => insertVariableAtCursor(inactivityRef, v, 'inactivity_message')}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODALS */}

        {/* Add Knowledge Modal */}
        {showAddKnowledge && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl p-6 w-full max-w-2xl border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-4">Add Knowledge</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
                  <input
                    type="text"
                    value={newKnowledge.title}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Product Information"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                  <textarea
                    value={newKnowledge.content}
                    onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                    rows={8}
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
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-medium transition-colors disabled:opacity-50"
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
            <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-800">
              <h3 className="text-xl font-bold text-white mb-4">Link Global Knowledge</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Knowledge Base</label>
                  <select
                    value={selectedKnowledgeId}
                    onChange={(e) => setSelectedKnowledgeId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Choose a knowledge base...</option>
                    {allKnowledge.map((kb) => (
                      <option key={kb.id} value={kb.id}>{kb.title}</option>
                    ))}
                  </select>
                </div>
                {selectedKnowledgeId && (
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-slate-400 text-sm line-clamp-3">
                      {allKnowledge.find(k => k.id === selectedKnowledgeId)?.content}
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
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  Link Knowledge
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Drawer */}
        {showTestDrawer && (
          <AgentTestDrawer
            agent={agent}
            onClose={() => setShowTestDrawer(false)}
          />
        )}

        {/* Test Action Drawer */}
        {showTestActionDrawer && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowTestActionDrawer(null)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-md bg-slate-900 border-l border-slate-800 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">
                  Test: {getActionLabel(actions.find(a => a.id === showTestActionDrawer)?.action_type || '')}
                </h3>
                <button
                  onClick={() => setShowTestActionDrawer(null)}
                  className="p-2 hover:bg-slate-800 rounded-lg"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-4">
                This would run a simulation of the action trigger condition against sample messages.
              </p>
              <div className="bg-slate-800 rounded-lg p-4">
                <p className="text-xs text-slate-500">Action test panel coming soon...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

// Agent Test Drawer Component
function AgentTestDrawer({ agent, onClose }: { agent: any; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'agent'; content: string; source?: string }>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  const [greetingSent, setGreetingSent] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendGreeting = () => {
    if (agent.greeting_message && !greetingSent) {
      setMessages([{
        role: 'agent',
        content: agent.greeting_message.replace(/\{\{contact\.name\}\}/g, 'Test User'),
        source: 'greeting'
      }])
      setGreetingSent(true)
    }
  }

  const resetConversation = () => {
    setMessages([])
    setGreetingSent(false)
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setIsLoading(true)

    // Simulate agent response (in real implementation, call API)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: `This is a simulated response. In production, this would call the agent API with your message: "${userMessage}"`,
        source: 'llm'
      }])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-lg bg-slate-900 border-l border-slate-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TestTube className="text-cyan-400" size={20} />
            <h3 className="font-semibold text-white">Test Agent</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetConversation}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset conversation"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare size={48} className="mx-auto mb-3 opacity-30" />
              <p>Start a test conversation</p>
              <button
                onClick={sendGreeting}
                disabled={greetingSent}
                className="mt-4 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 rounded-lg font-medium transition-colors"
              >
                {greetingSent ? 'Greeting sent' : 'Send Greeting'}
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-slate-800 border border-slate-700 text-white'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                    {msg.source && (
                      <p className="text-xs mt-1 opacity-70">
                        Source: {msg.source}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <div className="border-t border-slate-800 p-4 bg-slate-950 max-h-48 overflow-y-auto">
            <p className="text-xs font-medium text-slate-500 mb-2">System Prompt (Debug):</p>
            <pre className="text-xs text-slate-400 whitespace-pre-wrap">
              {agent.system_prompt || 'No system prompt set'}
            </pre>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a test message..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-700 text-slate-950 disabled:text-slate-500 rounded-lg font-medium transition-colors"
            >
              <Play size={18} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
            >
              <AlertCircle size={12} />
              {showDebug ? 'Hide' : 'Show'} debug info
            </button>
            <span className="text-xs text-slate-600">
              Greeting sent: {greetingSent ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

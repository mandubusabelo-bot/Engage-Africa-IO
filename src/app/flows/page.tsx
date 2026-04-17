'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { Plus, Play, Pause, Copy, Trash2, Sparkles, Zap, ChevronDown, Settings } from 'lucide-react'
import { api } from '@/lib/api'
import FlowBuilder from '@/components/FlowBuilder'
import InlineToast from '@/components/InlineToast'

interface WorkflowStep {
  id: string
  name: string
  type: 'agent_chat' | 'scraper' | 'data_processing' | 'notification' | 'condition' | 'delay'
  config: Record<string, any>
  nextSteps?: string[]
}

interface Flow {
  id: string
  name: string
  description: string
  isActive: boolean
  trigger: {
    type: 'manual' | 'scheduled' | 'webhook' | 'event'
    schedule?: string
    webhookUrl?: string
    event?: string
  }
  steps: WorkflowStep[]
  runCount: number
}

const FLOW_TEMPLATES = {
  welcome_and_route: {
    label: 'Welcome + Route',
    description: 'Greets contact and routes to selected agent.',
    steps: [
      {
        id: 'step_welcome_1',
        name: 'Welcome Message',
        type: 'agent_chat',
        config: { message: 'Hi! Thanks for reaching out. We are reviewing your request now.' }
      },
      {
        id: 'step_welcome_2',
        name: 'Wait 10 Seconds',
        type: 'delay',
        config: { duration: 10, unit: 'seconds' }
      },
      {
        id: 'step_welcome_3',
        name: 'Notify Team',
        type: 'notification',
        config: { channel: 'email', message: 'New contact entered welcome flow.' }
      }
    ]
  },
  lead_qualification: {
    label: 'Lead Qualification',
    description: 'Checks message and branches for sales follow-up.',
    steps: [
      {
        id: 'step_lead_1',
        name: 'Check Intent',
        type: 'condition',
        config: { field: 'message', operator: 'contains', value: 'price' }
      },
      {
        id: 'step_lead_2',
        name: 'Sales Agent Reply',
        type: 'agent_chat',
        config: { message: 'Great question. Let me connect you with sales details.' }
      },
      {
        id: 'step_lead_3',
        name: 'Webhook to CRM',
        type: 'webhook',
        config: { url: '', method: 'POST', headers: {} }
      }
    ]
  }
}

export default function Flows() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('trigger')
  const [editingTrigger, setEditingTrigger] = useState(false)
  const [triggerConfig, setTriggerConfig] = useState({ type: 'manual', schedule: '', event: '' })
  const [flowRuns, setFlowRuns] = useState<any[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadFlows()
  }, [])

  useEffect(() => {
    if (!selectedFlowId && flows.length > 0) {
      setSelectedFlowId(flows[0].id)
      setSelectedNodeId('trigger')
    }
    if (selectedFlowId && !flows.find((flow) => flow.id === selectedFlowId)) {
      setSelectedFlowId(flows[0]?.id || null)
      setSelectedNodeId('trigger')
    }
  }, [flows, selectedFlowId])

  const loadFlows = async () => {
    try {
      setLoading(true)
      const response = await api.getWorkflows()
      if (response.success && response.data) {
        setFlows(response.data.map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description || '',
          isActive: f.is_active !== false,
          trigger: f.trigger || { type: 'manual' },
          steps: Array.isArray(f.steps) ? f.steps : [],
          runCount: f.run_count || 0
        })))
      }
    } catch (error) {
      console.error('Failed to load flows:', error)
    } finally {
      setLoading(false)
    }
  }

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    template: 'welcome_and_route',
    trigger: 'manual',
    schedule: '',
    event: ''
  })

  const selectedFlow = flows.find((flow) => flow.id === selectedFlowId) || null
  const selectedNode = selectedFlow?.steps.find((step) => step.id === selectedNodeId) || null

  useEffect(() => {
    if (selectedFlowId && selectedFlow?.trigger?.type === 'webhook') {
      api.getWebhookUrl(selectedFlowId).then(response => {
        if (response.success) {
          setWebhookUrl(response.data.webhookUrl)
        }
      })
    }
  }, [selectedFlowId, selectedFlow])

  useEffect(() => {
    if (!selectedFlowId) {
      setFlowRuns([])
      return
    }

    api.getFlowRuns(selectedFlowId, 20)
      .then((response) => {
        if (response.success) {
          setFlowRuns(response.data || [])
        }
      })
      .catch(() => setFlowRuns([]))
  }, [selectedFlowId, flows])

  const getStepColor = (type: WorkflowStep['type']) => {
    switch (type) {
      case 'agent_chat':
        return 'text-cyan-400 border-cyan-500'
      case 'condition':
        return 'text-amber-400 border-amber-500'
      case 'notification':
        return 'text-indigo-400 border-indigo-500'
      case 'delay':
        return 'text-violet-400 border-violet-500'
      case 'scraper':
        return 'text-emerald-400 border-emerald-500'
      default:
        return 'text-slate-300 border-slate-700'
    }
  }

  const getTriggerLabel = (flow: Flow) => {
    if (flow.trigger.type === 'scheduled') {
      return `Scheduled · ${flow.trigger.schedule || 'cron not set'}`
    }
    if (flow.trigger.type === 'webhook') {
      return `Webhook · ${flow.trigger.webhookUrl || 'generated endpoint'}`
    }
    if (flow.trigger.type === 'event') {
      return `Event · ${flow.trigger.event || 'event key not set'}`
    }
    return 'Manual'
  }

  const handleCreateFlow = async () => {
    try {
      const template = FLOW_TEMPLATES[newFlow.template as keyof typeof FLOW_TEMPLATES] || FLOW_TEMPLATES.welcome_and_route
      const steps: WorkflowStep[] = template.steps.map((step, index) => ({
        ...(step as any),
        id: `step_${Date.now()}_${index + 1}`
      }))

      const response = await api.createWorkflow({
        name: newFlow.name,
        description: newFlow.description,
        isActive: true,
        trigger: {
          type: newFlow.trigger as any,
          ...(newFlow.trigger === 'scheduled' && newFlow.schedule ? { schedule: newFlow.schedule } : {}),
          ...(newFlow.trigger === 'event' && newFlow.event ? { event: newFlow.event } : {})
        },
        steps
      })

      if (response.success) {
        await loadFlows()
        setShowCreateModal(false)
        setNewFlow({ name: '', description: '', template: 'welcome_and_route', trigger: 'manual', schedule: '', event: '' })
        showToast('Flow created from template', 'success')
      }
    } catch (error) {
      console.error('Failed to create flow:', error)
      showToast('Failed to create flow. Please try again.', 'error')
    }
  }

  const toggleFlowStatus = async (id: string) => {
    const flow = flows.find(f => f.id === id)
    if (!flow) return

    const previous = flows
    setFlows((current) => current.map((f) => f.id === id ? { ...f, isActive: !f.isActive } : f))
    
    try {
      await api.updateWorkflow(id, { isActive: !flow.isActive })
      showToast(!flow.isActive ? 'Flow activated' : 'Flow paused', 'success')
    } catch (error) {
      setFlows(previous)
      console.error('Failed to toggle flow status:', error)
      showToast('Failed to update flow status.', 'error')
    }
  }

  const duplicateFlow = async (id: string) => {
    const flowToDuplicate = flows.find(f => f.id === id)
    if (flowToDuplicate) {
      try {
        const idMap = flowToDuplicate.steps.reduce<Record<string, string>>((acc, step, index) => {
          acc[step.id] = `step_${Date.now()}_${index}`
          return acc
        }, {})

        await api.createWorkflow({
          name: `${flowToDuplicate.name} (Copy)`,
          description: flowToDuplicate.description,
          isActive: false,
          trigger: flowToDuplicate.trigger,
          steps: flowToDuplicate.steps.map((step) => ({
            ...step,
            id: idMap[step.id],
            nextSteps: step.nextSteps?.map((nextStepId) => idMap[nextStepId]).filter(Boolean)
          }))
        })
        await loadFlows()
        showToast('Flow duplicated', 'success')
      } catch (error) {
        console.error('Failed to duplicate flow:', error)
        showToast('Failed to duplicate flow.', 'error')
      }
    }
  }

  const handleSaveFlowSteps = async (steps: any[]) => {
    if (!selectedFlowId) return
    const normalizedSteps = steps.map((step, index) => ({
      ...step,
      name: step.name || `Step ${index + 1}`
    }))
    await api.updateWorkflow(selectedFlowId, { steps: normalizedSteps })
    await loadFlows()
    showToast('Flow steps saved', 'success')
  }

  const deleteFlow = async (id: string) => {
    if (confirm('Are you sure you want to delete this flow?')) {
      const previous = flows
      setFlows((current) => current.filter((f) => f.id !== id))
      try {
        await api.deleteWorkflow(id)
        showToast('Flow deleted', 'success')
      } catch (error) {
        setFlows(previous)
        console.error('Failed to delete flow:', error)
        showToast('Failed to delete flow.', 'error')
      }
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
      <div className="h-full flex flex-col">
        <div className="h-14 border-b border-slate-800 bg-[#0a101c] px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm">
            <span className="rounded-md border border-slate-700 bg-slate-900/60 px-2 py-1 text-slate-300">Workflow</span>
            <span className="text-slate-100 font-semibold">{selectedFlow?.name || 'No workflow selected'}</span>
            <span className="text-slate-500 hidden md:inline">{selectedFlow?.description || 'Choose a workflow from the right panel to inspect its connected nodes'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 text-xs">Save</button>
            <button
              onClick={() => selectedFlowId && toggleFlowStatus(selectedFlowId)}
              disabled={!selectedFlow}
              className="px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 text-xs disabled:opacity-50"
            >
              {selectedFlow?.isActive ? 'Pause' : 'Activate'}
            </button>
            <button className="px-3 py-1.5 rounded-md bg-cyan-500 text-slate-900 text-xs font-semibold">Publish</button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <div className="flex-1 relative overflow-hidden border-r border-slate-800 bg-[#0b1020]" style={{ backgroundImage: 'radial-gradient(rgba(99,116,153,0.22) 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
            <div className="absolute left-6 top-6 right-6 flex justify-between items-start">
              <div className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-300">
                Steps: {selectedFlow?.steps.length || 0} · Runs: {selectedFlow?.runCount || 0}
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-cyan-400"
              >
                <Plus size={14} />
                New Flow
              </button>
            </div>

            <div className="h-full overflow-auto pt-24 pb-10 px-4">
              <div className="mx-auto w-full max-w-sm space-y-5">
                <button onClick={() => setSelectedNodeId('trigger')} className={`w-full rounded-xl border px-4 py-3 text-left ${selectedNodeId === 'trigger' ? 'border-pink-500 bg-slate-950' : 'border-slate-700 bg-slate-950/70'}`}>
                  <div className="text-pink-400 text-xs font-semibold flex items-center gap-2"><Zap size={12} /> Trigger</div>
                  <p className="mt-1 text-sm text-slate-200">{selectedFlow ? getTriggerLabel(selectedFlow) : 'No trigger configured'}</p>
                </button>
                {selectedFlow?.steps.map((step) => (
                  <div key={step.id}>
                    <div className="mx-auto h-6 w-px bg-slate-700" />
                    <button
                      onClick={() => setSelectedNodeId(step.id)}
                      className={`w-full rounded-xl border px-4 py-3 text-left ${selectedNodeId === step.id ? getStepColor(step.type).split(' ')[1] + ' bg-slate-950' : 'border-slate-700 bg-slate-950/70'}`}
                    >
                      <div className={`text-xs font-semibold ${getStepColor(step.type).split(' ')[0]}`}>{step.name}</div>
                      <p className="mt-1 text-sm text-slate-300">
                        {step.nextSteps?.length ? `Connected to ${step.nextSteps.length} next node${step.nextSteps.length > 1 ? 's' : ''}` : 'No next node'}
                      </p>
                    </button>
                  </div>
                ))}
                {!loading && (!selectedFlow || selectedFlow.steps.length === 0) && (
                  <div className="mx-auto rounded-lg border border-dashed border-slate-700 bg-slate-950/70 p-4 text-center text-xs text-slate-400">
                    This workflow has no steps yet.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 mb-4">
              <h3 className="text-xs text-slate-400 mb-2">Execution History</h3>
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {flowRuns.length === 0 ? (
                  <div className="text-xs text-slate-500">No recent runs found for this flow.</div>
                ) : flowRuns.map((run) => (
                  <div key={run.id} className="rounded-md border border-slate-800 bg-slate-900 p-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={run.status === 'success' ? 'text-emerald-300' : run.status === 'failed' ? 'text-rose-300' : 'text-amber-300'}>
                        {(run.status || 'running').toUpperCase()}
                      </span>
                      <span className="text-slate-500">{run.trigger_type || 'manual'}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {run.started_at ? new Date(run.started_at).toLocaleString() : 'Unknown start time'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="w-full max-w-[360px] bg-[#0a0f1c] p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2"><Sparkles size={14} className="text-cyan-400" /> Node Settings</h2>
              <button className="p-2 rounded-md border border-slate-700 text-slate-400 hover:text-slate-100"><Settings size={14} /></button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 mb-4">
              <label className="text-xs text-slate-400 mb-2">Trigger Type</label>
              <div className="space-y-3">
                <select
                  value={selectedFlow?.trigger?.type || 'manual'}
                  onChange={async (e) => {
                    if (selectedFlowId) {
                      const newType = e.target.value
                      const triggerUpdate: any = { type: newType }
                      if (newType === 'scheduled') {
                        triggerUpdate.schedule = '0 */6 * * *'
                      }
                      if (newType === 'event') {
                        triggerUpdate.event = 'whatsapp.inbound_message'
                      }
                      await api.updateWorkflow(selectedFlowId, { trigger: triggerUpdate })
                      loadFlows()
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 text-sm focus:ring-2 focus:ring-cyan-500/40 outline-none"
                >
                  <option value="manual">Manual Trigger</option>
                  <option value="scheduled">Scheduled (CRON)</option>
                  <option value="webhook">Webhook</option>
                  <option value="event">Event</option>
                </select>
                
                {selectedFlow?.trigger?.type === 'scheduled' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CRON Schedule</label>
                    <input
                      type="text"
                      value={selectedFlow.trigger.schedule || ''}
                      onChange={async (e) => {
                        if (selectedFlowId) {
                          await api.updateWorkflow(selectedFlowId, { 
                            trigger: { 
                              type: 'scheduled', 
                              schedule: e.target.value 
                            } 
                          })
                          loadFlows()
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/40 outline-none"
                      placeholder="e.g., 0 */6 * * * (Every 6 hours)"
                    />
                  </div>
                )}
                
                {selectedFlow?.trigger?.type === 'event' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Event Key</label>
                    <input
                      type="text"
                      value={selectedFlow.trigger.event || ''}
                      onChange={async (e) => {
                        if (selectedFlowId) {
                          await api.updateWorkflow(selectedFlowId, { 
                            trigger: { 
                              type: 'event', 
                              event: e.target.value 
                            } 
                          })
                          loadFlows()
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 text-xs focus:ring-2 focus:ring-cyan-500/40 outline-none"
                      placeholder="e.g., whatsapp.inbound_message"
                    />
                  </div>
                )}
                
                {selectedFlow?.trigger?.type === 'webhook' && (
                  <div className="mt-3 p-3 bg-slate-900 rounded-lg">
                    <p className="text-xs text-slate-400 mb-2">Webhook URL:</p>
                    <p className="text-xs text-cyan-300 font-mono break-all">{webhookUrl || 'Loading...'}</p>
                    <button
                      onClick={async () => {
                        if (selectedFlowId) {
                          const response = await api.getWebhookUrl(selectedFlowId)
                          if (response.success) {
                            setWebhookUrl(response.data.webhookUrl)
                          }
                        }
                      }}
                      className="mt-2 text-xs text-slate-400 hover:text-slate-300"
                    >
                      Refresh URL
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 mb-4">
              <h3 className="text-xs text-slate-400 mb-2">Selected Node</h3>
              <div className="rounded-md border border-slate-700 bg-slate-900/80 p-3">
                {selectedNodeId === 'trigger' ? (
                  <>
                    <p className="text-sm text-slate-200 font-medium">Trigger</p>
                    <p className="mt-1 text-xs text-slate-500">{selectedFlow ? getTriggerLabel(selectedFlow) : 'No trigger configured'}</p>
                  </>
                ) : selectedNode ? (
                  <>
                    <p className="text-sm text-slate-200 font-medium">{selectedNode.name}</p>
                    <p className="mt-1 text-xs text-slate-500">Type: {selectedNode.type}</p>
                    <pre className="mt-2 max-h-28 overflow-auto rounded bg-slate-950 p-2 text-[11px] text-slate-400">{JSON.stringify(selectedNode.config || {}, null, 2)}</pre>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">Select a node to view details.</p>
                )}
              </div>
            </div>

            {selectedFlow && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 mb-4">
                <FlowBuilder
                  key={`${selectedFlow.id}-${selectedFlow.steps.length}`}
                  flowId={selectedFlow.id}
                  initialSteps={selectedFlow.steps as any}
                  onSave={handleSaveFlowSteps}
                />
              </div>
            )}

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <h3 className="text-xs text-slate-400 mb-2">Existing Flows</h3>
              <div className="space-y-2">
                {flows.map((flow) => (
                  <div
                    key={flow.id}
                    onClick={() => {
                      setSelectedFlowId(flow.id)
                      setSelectedNodeId('trigger')
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left cursor-pointer ${selectedFlowId === flow.id ? 'border-cyan-500/60 bg-slate-900' : 'border-slate-800 bg-slate-900/70'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-100 font-medium">{flow.name}</p>
                        <p className="text-xs text-slate-500">{flow.steps.length} steps · {getTriggerLabel(flow)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={(event) => { event.stopPropagation(); toggleFlowStatus(flow.id); }} className="p-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800">
                          {flow.isActive ? <Pause size={12} /> : <Play size={12} />}
                        </button>
                        <button onClick={(event) => { event.stopPropagation(); duplicateFlow(flow.id); }} className="p-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"><Copy size={12} /></button>
                        <button onClick={(event) => { event.stopPropagation(); deleteFlow(flow.id); }} className="p-1.5 rounded-md border border-rose-700/60 text-rose-300 hover:bg-rose-950/40"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {!loading && flows.length === 0 && (
                  <div className="text-xs text-slate-500 border border-dashed border-slate-700 rounded-lg p-3">No flows yet. Create your first workflow.</div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#0b1220] border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-6">Create New Flow</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Flow Name</label>
                  <input
                    type="text"
                    value={newFlow.name}
                    onChange={(e) => setNewFlow({...newFlow, name: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    placeholder="e.g., Welcome Flow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={newFlow.description}
                    onChange={(e) => setNewFlow({...newFlow, description: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    rows={3}
                    placeholder="Describe what this flow does..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Template</label>
                  <select
                    value={newFlow.template}
                    onChange={(e) => setNewFlow({ ...newFlow, template: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                  >
                    {Object.entries(FLOW_TEMPLATES).map(([key, template]) => (
                      <option key={key} value={key}>{template.label}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    {FLOW_TEMPLATES[newFlow.template as keyof typeof FLOW_TEMPLATES]?.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Trigger Type</label>
                  <select
                    value={newFlow.trigger}
                    onChange={(e) => setNewFlow({...newFlow, trigger: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                  >
                    <option value="manual">Manual Trigger</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="webhook">Webhook</option>
                    <option value="event">Event</option>
                  </select>
                </div>

                {newFlow.trigger === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Schedule (cron)</label>
                    <input
                      type="text"
                      value={newFlow.schedule}
                      onChange={(e) => setNewFlow({ ...newFlow, schedule: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                      placeholder="e.g., 0 */6 * * *"
                    />
                  </div>
                )}

                {newFlow.trigger === 'event' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Event Key</label>
                    <input
                      type="text"
                      value={newFlow.event}
                      onChange={(e) => setNewFlow({ ...newFlow, event: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                      placeholder="e.g., whatsapp.inbound_message"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFlow}
                  disabled={!newFlow.name || !newFlow.description}
                  className="flex-1 px-6 py-3 bg-cyan-500 text-slate-900 rounded-lg font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Flow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

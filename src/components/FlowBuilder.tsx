'use client'

import { useState } from 'react'
import { Plus, Trash2, Save, MessageSquare, Clock, GitBranch, Webhook, Bot, X } from 'lucide-react'

interface FlowStep {
  id: string
  type: 'agent_chat' | 'delay' | 'condition' | 'webhook' | 'notification'
  config: any
  order: number
}

interface FlowBuilderProps {
  flowId: string
  initialSteps: FlowStep[]
  onSave: (steps: FlowStep[]) => Promise<void>
}

const STEP_TYPES = [
  { type: 'agent_chat', label: 'Agent Chat', icon: Bot, color: 'cyan' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'yellow' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'purple' },
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'blue' },
  { type: 'notification', label: 'Notification', icon: MessageSquare, color: 'green' }
]

export default function FlowBuilder({ flowId, initialSteps, onSave }: FlowBuilderProps) {
  const [steps, setSteps] = useState<FlowStep[]>(initialSteps)
  const [showAddStep, setShowAddStep] = useState(false)
  const [editingStep, setEditingStep] = useState<FlowStep | null>(null)
  const [saving, setSaving] = useState(false)

  const addStep = (type: string) => {
    const newStep: FlowStep = {
      id: `step_${Date.now()}`,
      type: type as any,
      config: getDefaultConfig(type),
      order: steps.length
    }
    setSteps([...steps, newStep])
    setEditingStep(newStep)
    setShowAddStep(false)
  }

  const deleteStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })))
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newSteps.length) return

    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]]
    newSteps.forEach((step, i) => step.order = i)
    setSteps(newSteps)
  }

  const updateStepConfig = (id: string, config: any) => {
    setSteps(steps.map(s => s.id === id ? { ...s, config } : s))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(steps)
    } finally {
      setSaving(false)
    }
  }

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'agent_chat':
        return { agentId: '', message: '' }
      case 'delay':
        return { duration: 5, unit: 'seconds' }
      case 'condition':
        return { field: '', operator: 'equals', value: '' }
      case 'webhook':
        return { url: '', method: 'POST', headers: {} }
      case 'notification':
        return { message: '', channel: 'email' }
      default:
        return {}
    }
  }

  const getStepIcon = (type: string) => {
    const stepType = STEP_TYPES.find(t => t.type === type)
    return stepType?.icon || MessageSquare
  }

  const getStepColor = (type: string) => {
    const stepType = STEP_TYPES.find(t => t.type === type)
    return stepType?.color || 'gray'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Flow Steps</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddStep(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Add Step
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Flow'}
          </button>
        </div>
      </div>

      {/* Steps List */}
      <div className="space-y-3">
        {steps.length === 0 ? (
          <div className="bg-slate-900 rounded-lg p-8 text-center border-2 border-dashed border-slate-700">
            <p className="text-slate-400">No steps yet. Add your first step to build the flow.</p>
          </div>
        ) : (
          steps.map((step, index) => {
            const Icon = getStepIcon(step.type)
            const color = getStepColor(step.type)
            
            return (
              <div key={step.id} className="relative">
                {/* Connection Line */}
                {index < steps.length - 1 && (
                  <div className="absolute left-6 top-full w-0.5 h-3 bg-slate-700 z-0" />
                )}
                
                {/* Step Card */}
                <div className={`bg-slate-900 rounded-lg p-4 border-2 border-${color}-500/20 hover:border-${color}-500/40 transition-colors relative z-10`}>
                  <div className="flex items-start gap-3">
                    {/* Step Number & Icon */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg bg-${color}-500/10 border border-${color}-500/30 flex items-center justify-center`}>
                      <Icon size={20} className={`text-${color}-400`} />
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-white capitalize">{step.type.replace('_', ' ')}</h4>
                          <p className="text-xs text-slate-500">Step {index + 1}</p>
                        </div>
                        <div className="flex gap-1">
                          {index > 0 && (
                            <button
                              onClick={() => moveStep(index, 'up')}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            >
                              ↑
                            </button>
                          )}
                          {index < steps.length - 1 && (
                            <button
                              onClick={() => moveStep(index, 'down')}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            onClick={() => setEditingStep(step)}
                            className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteStep(step.id)}
                            className="p-1 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      
                      {/* Step Config Preview */}
                      <div className="text-sm text-slate-400">
                        {step.type === 'agent_chat' && <span>Agent: {step.config.agentId || 'Not set'}</span>}
                        {step.type === 'delay' && <span>Wait: {step.config.duration} {step.config.unit}</span>}
                        {step.type === 'condition' && <span>If {step.config.field} {step.config.operator} {step.config.value}</span>}
                        {step.type === 'webhook' && <span>{step.config.method} {step.config.url || 'URL not set'}</span>}
                        {step.type === 'notification' && <span>{step.config.channel}: {step.config.message?.substring(0, 50)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Add Step Modal */}
      {showAddStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Step</h3>
              <button
                onClick={() => setShowAddStep(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {STEP_TYPES.map((stepType) => {
                const Icon = stepType.icon
                return (
                  <button
                    key={stepType.type}
                    onClick={() => addStep(stepType.type)}
                    className={`p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border-2 border-${stepType.color}-500/20 hover:border-${stepType.color}-500/40 transition-colors text-left`}
                  >
                    <Icon size={24} className={`text-${stepType.color}-400 mb-2`} />
                    <div className="font-medium text-white text-sm">{stepType.label}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      {editingStep && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white capitalize">
                Edit {editingStep.type.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setEditingStep(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Agent Chat Config */}
              {editingStep.type === 'agent_chat' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Agent ID</label>
                    <input
                      type="text"
                      value={editingStep.config.agentId || ''}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, agentId: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      placeholder="Enter agent ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                    <textarea
                      value={editingStep.config.message || ''}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, message: e.target.value })}
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      placeholder="Enter message to send"
                    />
                  </div>
                </>
              )}

              {/* Delay Config */}
              {editingStep.type === 'delay' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Duration</label>
                    <input
                      type="number"
                      value={editingStep.config.duration || 5}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, duration: parseInt(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Unit</label>
                    <select
                      value={editingStep.config.unit || 'seconds'}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, unit: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="seconds">Seconds</option>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Condition Config */}
              {editingStep.type === 'condition' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Field</label>
                    <input
                      type="text"
                      value={editingStep.config.field || ''}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, field: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      placeholder="e.g., message, phone"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Operator</label>
                    <select
                      value={editingStep.config.operator || 'equals'}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, operator: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="equals">Equals</option>
                      <option value="contains">Contains</option>
                      <option value="starts_with">Starts With</option>
                      <option value="ends_with">Ends With</option>
                      <option value="greater_than">Greater Than</option>
                      <option value="less_than">Less Than</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Value</label>
                    <input
                      type="text"
                      value={editingStep.config.value || ''}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, value: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      placeholder="Comparison value"
                    />
                  </div>
                </>
              )}

              {/* Webhook Config */}
              {editingStep.type === 'webhook' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">URL</label>
                    <input
                      type="url"
                      value={editingStep.config.url || ''}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, url: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      placeholder="https://example.com/webhook"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Method</label>
                    <select
                      value={editingStep.config.method || 'POST'}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, method: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                </>
              )}

              {/* Notification Config */}
              {editingStep.type === 'notification' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Channel</label>
                    <select
                      value={editingStep.config.channel || 'email'}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, channel: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="slack">Slack</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                    <textarea
                      value={editingStep.config.message || ''}
                      onChange={(e) => updateStepConfig(editingStep.id, { ...editingStep.config, message: e.target.value })}
                      rows={4}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                      placeholder="Notification message"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingStep(null)}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

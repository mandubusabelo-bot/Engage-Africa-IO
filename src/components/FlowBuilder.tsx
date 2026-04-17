'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Plus, Trash2, Save, MessageSquare, Clock, GitBranch, Webhook, Bot, X,
  Play, ZoomIn, ZoomOut, Maximize, AlertCircle, CheckCircle, LayoutTemplate,
  Settings, ChevronDown, ChevronRight, Undo, Sparkles
} from 'lucide-react'
import { api } from '@/lib/api'
import InlineToast from './InlineToast'

interface FlowBuilderProps {
  flowId: string
  initialSteps: FlowStep[]
  onSave: (steps: FlowStep[]) => Promise<void>
}

interface FlowStep {
  id: string
  type: 'trigger' | 'agent_chat' | 'delay' | 'condition' | 'webhook' | 'notification'
  config: any
  order: number
  position?: { x: number; y: number }
}

// Node Types Configuration
const NODE_TYPES: NodeTypes = {
  trigger: TriggerNode,
  agent_chat: AgentNode,
  condition: ConditionNode,
  delay: DelayNode,
  webhook: WebhookNode,
  notification: NotificationNode,
}

// Custom Node Components with Connection Handles
function TriggerNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`bg-slate-800 border-2 rounded-xl p-4 w-64 transition-all ${
      selected ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-600'
    }`}>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
          <Play size={20} className="text-emerald-400" />
        </div>
        <div>
          <h4 className="font-semibold text-white">{data.label}</h4>
          <p className="text-xs text-slate-400">{data.config?.trigger || 'Message received'}</p>
        </div>
      </div>
    </div>
  )
}

function AgentNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`bg-slate-800 border-2 rounded-xl p-4 w-64 transition-all ${
      selected ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-cyan-500/40'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-cyan-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-cyan-500" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
          <Bot size={20} className="text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{data.label}</h4>
          <p className="text-xs text-slate-400 truncate">{data.config?.agentName || 'Select agent...'}</p>
        </div>
      </div>
      {data.config?.message && (
        <p className="mt-2 text-xs text-slate-500 line-clamp-2">{data.config.message}</p>
      )}
    </div>
  )
}

function ConditionNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`bg-slate-800 border-2 rounded-xl p-4 w-64 transition-all ${
      selected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-purple-500/40'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-purple-500" />
      <Handle type="source" position={Position.Bottom} id="yes" className="w-3 h-3 bg-emerald-500 -ml-8" />
      <Handle type="source" position={Position.Bottom} id="no" className="w-3 h-3 bg-red-500 ml-8" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
          <GitBranch size={20} className="text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{data.label}</h4>
          <p className="text-xs text-slate-400">
            {data.config?.field} {data.config?.operator} {data.config?.value}
          </p>
        </div>
      </div>
      <div className="flex justify-between mt-3 text-xs">
        <span className="text-emerald-400 flex items-center gap-1">
          <ChevronRight size={12} /> Yes
        </span>
        <span className="text-red-400 flex items-center gap-1">
          No <ChevronRight size={12} />
        </span>
      </div>
    </div>
  )
}

function DelayNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`bg-slate-800 border-2 rounded-xl p-4 w-64 transition-all ${
      selected ? 'border-amber-500 shadow-lg shadow-amber-500/20' : 'border-amber-500/40'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
          <Clock size={20} className="text-amber-400" />
        </div>
        <div>
          <h4 className="font-semibold text-white">{data.label}</h4>
          <p className="text-xs text-slate-400">
            Wait {data.config?.duration} {data.config?.unit}
          </p>
        </div>
      </div>
    </div>
  )
}

function WebhookNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`bg-slate-800 border-2 rounded-xl p-4 w-64 transition-all ${
      selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-blue-500/40'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
          <Webhook size={20} className="text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{data.label}</h4>
          <p className="text-xs text-slate-400 truncate">{data.config?.method || 'POST'}</p>
        </div>
      </div>
      {data.config?.url && (
        <p className="mt-2 text-xs text-slate-500 truncate">{data.config.url}</p>
      )}
    </div>
  )
}

function NotificationNode({ data, selected }: { data: any; selected?: boolean }) {
  return (
    <div className={`bg-slate-800 border-2 rounded-xl p-4 w-64 transition-all ${
      selected ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-green-500/40'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-green-500" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/40 flex items-center justify-center">
          <MessageSquare size={20} className="text-green-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{data.label}</h4>
          <p className="text-xs text-slate-400">{data.config?.channel || 'Email'}</p>
        </div>
      </div>
    </div>
  )
}

const STEP_TYPES = [
  { type: 'trigger', label: 'Trigger', icon: Play, color: 'emerald', category: 'Start' },
  { type: 'agent_chat', label: 'Agent Chat', icon: Bot, color: 'cyan', category: 'Actions' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'purple', category: 'Logic' },
  { type: 'delay', label: 'Delay', icon: Clock, color: 'amber', category: 'Logic' },
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'blue', category: 'Actions' },
  { type: 'notification', label: 'Notification', icon: MessageSquare, color: 'green', category: 'Actions' }
] as const

// Main Flow Canvas Component (internal)
function FlowCanvas({
  flowId,
  initialSteps,
  onSave,
}: FlowBuilderProps) {
  // Convert initial steps to nodes and edges
  const stepsToFlow = (steps: FlowStep[]): { nodes: Node[]; edges: Edge[] } => {
    const nodes: Node[] = steps.map((step, index) => ({
      id: step.id,
      type: step.type,
      position: step.position || { x: 100 + (index % 3) * 300, y: 100 + Math.floor(index / 3) * 200 },
      data: {
        label: STEP_TYPES.find(t => t.type === step.type)?.label || step.type,
        config: step.config,
        stepId: step.id,
      },
    }))

    // Create edges from step order
    const edges: Edge[] = []
    for (let i = 0; i < steps.length - 1; i++) {
      const current = steps[i]
      const next = steps[i + 1]
      
      if (current.type === 'condition') {
        edges.push(
          { id: `e-${current.id}-${next.id}-yes`, source: current.id, target: next.id, sourceHandle: 'yes', label: 'Yes', className: 'stroke-emerald-500' },
          { id: `e-${current.id}-${next.id}-no`, source: current.id, target: next.id, sourceHandle: 'no', label: 'No', className: 'stroke-red-500' }
        )
      } else {
        edges.push({
          id: `e-${current.id}-${next.id}`,
          source: current.id,
          target: next.id,
          animated: true,
          className: 'stroke-cyan-500',
        })
      }
    }

    return { nodes, edges }
  }

  const { nodes: initialNodes, edges: initialEdges } = stepsToFlow(initialSteps)
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showNodePanel, setShowNodePanel] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  
  const { fitView, zoomIn, zoomOut } = useReactFlow()
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)

  // Load agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await api.getAgents()
        if (response.success && response.data) {
          setAgents(response.data.map((agent: any) => ({ id: agent.id, name: agent.name })))
        }
      } catch {
        setAgents([])
      }
    }
    loadAgents()
  }, [])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (hasChanges) {
      autoSaveRef.current = setTimeout(() => {
        handleSave(true)
      }, 30000)
    }
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [nodes, edges, hasChanges])

  // Track changes
  useEffect(() => {
    setHasChanges(true)
  }, [nodes, edges])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true, className: 'stroke-cyan-500' }, eds))
    },
    [setEdges]
  )

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowNodePanel(true)
  }, [])

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type,
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: {
        label: STEP_TYPES.find(t => t.type === type)?.label || type,
        config: getDefaultConfig(type),
      },
    }
    setNodes((nds) => [...nds, newNode])
    setShowNodePanel(false)
  }

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      })
    )
  }

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
      setShowNodePanel(false)
    }
  }

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'trigger':
        return { trigger: 'message_received' }
      case 'agent_chat':
        return { agentId: '', agentName: '', message: '' }
      case 'delay':
        return { duration: 5, unit: 'minutes' }
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

  const validateFlow = (): string[] => {
    const errors: string[] = []
    
    // Check for trigger node
    const triggerNodes = nodes.filter(n => n.type === 'trigger')
    if (triggerNodes.length === 0) {
      errors.push('Flow must have at least one trigger node')
    }
    if (triggerNodes.length > 1) {
      errors.push('Flow should have only one trigger node')
    }

    // Check for orphaned nodes
    nodes.forEach((node) => {
      if (node.type === 'trigger') return
      const hasIncoming = edges.some(e => e.target === node.id)
      if (!hasIncoming) {
        errors.push(`${node.data.label} (${node.id}) has no incoming connection`)
      }
    })

    // Check for disconnected end nodes
    nodes.forEach((node) => {
      if (node.type === 'notification') return
      const hasOutgoing = edges.some(e => e.source === node.id)
      if (!hasOutgoing) {
        errors.push(`${node.data.label} (${node.id}) has no outgoing connection`)
      }
    })

    // Check condition nodes have both yes and no outputs
    nodes.filter(n => n.type === 'condition').forEach((node) => {
      const yesEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'yes')
      const noEdge = edges.find(e => e.source === node.id && e.sourceHandle === 'no')
      if (!yesEdge) errors.push(`Condition ${node.id} missing Yes connection`)
      if (!noEdge) errors.push(`Condition ${node.id} missing No connection`)
    })

    return errors
  }

  const handleSave = async (isAuto = false) => {
    const errors = validateFlow()
    setValidationErrors(errors)
    
    if (errors.length > 0 && !isAuto) {
      setToast({ message: `Flow has ${errors.length} validation errors`, type: 'error' })
      return
    }

    try {
      // Convert nodes back to steps
      const steps: FlowStep[] = nodes.map((node, index) => ({
        id: node.id,
        type: node.type as any,
        config: node.data.config,
        order: index,
        position: node.position,
      }))

      await onSave(steps)
      setHasChanges(false)
      if (!isAuto) {
        setToast({ message: 'Flow saved successfully', type: 'success' })
      }
    } catch {
      if (!isAuto) {
        setToast({ message: 'Failed to save flow', type: 'error' })
      }
    }
  }

  const applyTemplate = (templateId: string) => {
    const templates: Record<string, { nodes: Node[]; edges: Edge[] }> = {
      welcome: {
        nodes: [
          { id: 'trigger_1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'New Message', config: { trigger: 'message_received' } } },
          { id: 'agent_1', type: 'agent_chat', position: { x: 100, y: 250 }, data: { label: 'Welcome Agent', config: { agentId: '', message: 'Hello! Welcome to our service.' } } },
        ],
        edges: [{ id: 'e1', source: 'trigger_1', target: 'agent_1', animated: true, className: 'stroke-cyan-500' }],
      },
      support: {
        nodes: [
          { id: 'trigger_1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'New Message', config: { trigger: 'message_received' } } },
          { id: 'agent_1', type: 'agent_chat', position: { x: 100, y: 250 }, data: { label: 'Support Agent', config: { agentId: '', message: '' } } },
          { id: 'cond_1', type: 'condition', position: { x: 100, y: 400 }, data: { label: 'Resolved?', config: { field: 'sentiment', operator: 'equals', value: 'resolved' } } },
          { id: 'notify_1', type: 'notification', position: { x: 300, y: 550 }, data: { label: 'Notify Team', config: { channel: 'email', message: 'Ticket needs attention' } } },
        ],
        edges: [
          { id: 'e1', source: 'trigger_1', target: 'agent_1', animated: true, className: 'stroke-cyan-500' },
          { id: 'e2-yes', source: 'agent_1', target: 'cond_1', animated: true, className: 'stroke-cyan-500' },
          { id: 'e3-no', source: 'cond_1', target: 'notify_1', sourceHandle: 'no', label: 'No', className: 'stroke-red-500' },
        ],
      },
    }

    const template = templates[templateId]
    if (template) {
      setNodes(template.nodes)
      setEdges(template.edges)
      setShowTemplates(false)
      setToast({ message: 'Template applied', type: 'success' })
    }
  }

  return (
    <div className="h-full flex flex-col">
      {toast && <InlineToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNodePanel(true)}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
          >
            <Plus size={16} />
            Add Node
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
          >
            <LayoutTemplate size={16} />
            Templates
          </button>
          <div className="w-px h-6 bg-slate-700 mx-1" />
          <button onClick={() => zoomOut()} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
            <ZoomOut size={18} />
          </button>
          <button onClick={() => fitView()} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
            <Maximize size={18} />
          </button>
          <button onClick={() => zoomIn()} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400">
            <ZoomIn size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle size={12} />
              Unsaved changes
            </span>
          )}
          {validationErrors.length > 0 && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              {validationErrors.length} errors
            </span>
          )}
          <button
            onClick={() => handleSave()}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium transition-colors text-sm"
          >
            <Save size={16} />
            Save
          </button>
        </div>
      </div>

      {/* Validation Panel */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border-b border-red-500/20 p-2">
          <div className="flex items-center gap-2 text-xs text-red-400">
            <AlertCircle size={14} />
            <span>Validation Errors:</span>
          </div>
          <ul className="mt-1 text-xs text-red-400/80 ml-6">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Flow Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={NODE_TYPES}
          fitView
          attributionPosition="bottom-right"
          className="bg-slate-950"
        >
          <Background color="#334155" gap={16} />
          <Controls className="bg-slate-800 border-slate-700" />
          <MiniMap
            className="bg-slate-900 border border-slate-700 rounded-lg"
            nodeColor={(node) => {
              switch (node.type) {
                case 'trigger': return '#10b981'
                case 'agent_chat': return '#06b6d4'
                case 'condition': return '#a855f7'
                case 'delay': return '#f59e0b'
                case 'webhook': return '#3b82f6'
                case 'notification': return '#22c55e'
                default: return '#64748b'
              }
            }}
          />
        </ReactFlow>
      </div>

      {/* Add Node Panel */}
      {showNodePanel && !selectedNode && (
        <div className="absolute inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNodePanel(false)} />
          <div className="absolute left-4 top-20 w-64 bg-slate-900 rounded-xl border border-slate-800 shadow-2xl p-4">
            <h3 className="font-semibold text-white mb-4">Add Node</h3>
            <div className="space-y-2">
              {STEP_TYPES.map((stepType) => {
                const Icon = stepType.icon
                const hasTrigger = nodes.some(n => n.type === 'trigger')
                if (stepType.type === 'trigger' && hasTrigger) return null
                
                return (
                  <button
                    key={stepType.type}
                    onClick={() => addNode(stepType.type)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-${stepType.color}-500/20 border border-${stepType.color}-500/40 flex items-center justify-center`}>
                      <Icon size={16} className={`text-${stepType.color}-400`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{stepType.label}</p>
                      <p className="text-xs text-slate-500">{stepType.category}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Node Config Panel */}
      {selectedNode && showNodePanel && (
        <div className="absolute right-0 top-0 h-full w-80 bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto z-50">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-cyan-400" />
              <h3 className="font-semibold text-white">Node Settings</h3>
            </div>
            <button
              onClick={() => {
                setSelectedNode(null)
                setShowNodePanel(false)
              }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Node Label */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Label</label>
              <input
                type="text"
                value={selectedNode.data.label as string}
                onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Trigger Config */}
            {selectedNode.type === 'trigger' && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Trigger Type</label>
                <select
                  value={((selectedNode.data.config as Record<string, any>) as Record<string, any>)?.trigger || 'message_received'}
                  onChange={(e) => updateNodeData(selectedNode.id, { config: { ...((selectedNode.data.config as Record<string, any>) as Record<string, any> || {}), trigger: e.target.value } })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                >
                  <option value="message_received">Message Received</option>
                  <option value="contact_created">Contact Created</option>
                  <option value="webhook_called">Webhook Called</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>
            )}

            {/* Agent Chat Config */}
            {selectedNode.type === 'agent_chat' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Select Agent</label>
                  <select
                    value={((selectedNode.data.config as Record<string, any>) as Record<string, any>)?.agentId || ''}
                    onChange={(e) => {
                      const agent = agents.find(a => a.id === e.target.value)
                      updateNodeData(selectedNode.id, { 
                        config: { 
                          ...((selectedNode.data.config as Record<string, any>) as Record<string, any> || {}), 
                          agentId: e.target.value,
                          agentName: agent?.name || ''
                        } 
                      })
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="">Choose an agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>{agent.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Initial Message</label>
                  <textarea
                    value={(selectedNode.data.config as Record<string, any>)?.message || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), message: e.target.value } })}
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="Optional: Message to send when starting this agent"
                  />
                </div>
              </>
            )}

            {/* Condition Config */}
            {selectedNode.type === 'condition' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Field</label>
                  <input
                    type="text"
                    value={((selectedNode.data.config as Record<string, any>) as Record<string, any>)?.field || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...((selectedNode.data.config as Record<string, any>) as Record<string, any> || {}), field: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="e.g., message.content"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Operator</label>
                  <select
                    value={(selectedNode.data.config as Record<string, any>)?.operator || 'equals'}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), operator: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="starts_with">Starts With</option>
                    <option value="ends_with">Ends With</option>
                    <option value="greater_than">Greater Than</option>
                    <option value="less_than">Less Than</option>
                    <option value="regex">Matches Regex</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Value</label>
                  <input
                    type="text"
                    value={(selectedNode.data.config as Record<string, any>)?.value || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), value: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="Value to compare"
                  />
                </div>
              </>
            )}

            {/* Delay Config */}
            {selectedNode.type === 'delay' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration</label>
                  <input
                    type="number"
                    min={1}
                    value={(selectedNode.data.config as Record<string, any>)?.duration || 5}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), duration: parseInt(e.target.value) } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Unit</label>
                  <select
                    value={(selectedNode.data.config as Record<string, any>)?.unit || 'minutes'}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), unit: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                  >
                    <option value="seconds">Seconds</option>
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
              </>
            )}

            {/* Webhook Config */}
            {selectedNode.type === 'webhook' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">URL</label>
                  <input
                    type="url"
                    value={(selectedNode.data.config as Record<string, any>)?.url || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), url: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Method</label>
                  <select
                    value={(selectedNode.data.config as Record<string, any>)?.method || 'POST'}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), method: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
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
            {selectedNode.type === 'notification' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Channel</label>
                  <select
                    value={(selectedNode.data.config as Record<string, any>)?.channel || 'email'}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), channel: e.target.value } })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
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
                    value={(selectedNode.data.config as Record<string, any>)?.message || ''}
                    onChange={(e) => updateNodeData(selectedNode.id, { config: { ...(selectedNode.data.config as Record<string, any>), message: e.target.value } })}
                    rows={4}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                    placeholder="Notification message..."
                  />
                </div>
              </>
            )}

            {/* Delete Button */}
            <button
              onClick={() => deleteNode(selectedNode.id)}
              className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg transition-colors mt-6"
            >
              <Trash2 size={16} />
              Delete Node
            </button>
          </div>
        </div>
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTemplates(false)} />
          <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <LayoutTemplate size={20} className="text-cyan-400" />
                Flow Templates
              </h3>
              <button
                onClick={() => setShowTemplates(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => applyTemplate('welcome')}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-left transition-colors"
              >
                <Sparkles size={24} className="text-cyan-400 mb-2" />
                <h4 className="font-medium text-white">Welcome Flow</h4>
                <p className="text-xs text-slate-500 mt-1">Simple greeting with agent response</p>
              </button>
              <button
                onClick={() => applyTemplate('support')}
                className="p-4 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-left transition-colors"
              >
                <MessageSquare size={24} className="text-emerald-400 mb-2" />
                <h4 className="font-medium text-white">Support Ticket</h4>
                <p className="text-xs text-slate-500 mt-1">Agent with conditional escalation</p>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Wrapper component with provider
export default function FlowBuilder(props: FlowBuilderProps) {
  return (
    <ReactFlowProvider>
      <div className="h-[600px] w-full">
        <FlowCanvas {...props} />
      </div>
    </ReactFlowProvider>
  )
}

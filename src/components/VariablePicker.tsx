'use client'

import { useState, useRef } from 'react'
import { ChevronDown, X, User, MessageSquare, Bot, Clock } from 'lucide-react'

interface VariablePickerProps {
  onInsert: (variable: string) => void
  className?: string
}

const VARIABLE_CATEGORIES = [
  {
    name: 'Contact',
    icon: User,
    variables: [
      { key: 'contact.name', label: 'Name', description: 'Contact full name' },
      { key: 'contact.email', label: 'Email', description: 'Contact email address' },
      { key: 'contact.phone', label: 'Phone', description: 'Contact phone number' },
      { key: 'contact.city', label: 'City', description: 'Contact city' },
    ]
  },
  {
    name: 'Conversation',
    icon: MessageSquare,
    variables: [
      { key: 'conversation.id', label: 'ID', description: 'Conversation ID' },
      { key: 'conversation.channel', label: 'Channel', description: 'Channel (whatsapp, web, etc)' },
      { key: 'conversation.label', label: 'Label', description: 'Assigned label' },
      { key: 'conversation.assigned_team', label: 'Team', description: 'Assigned team' },
    ]
  },
  {
    name: 'Agent',
    icon: Bot,
    variables: [
      { key: 'agent.name', label: 'Name', description: 'Agent name' },
      { key: 'agent.availability', label: 'Availability', description: 'Is agent available' },
    ]
  },
  {
    name: 'System',
    icon: Clock,
    variables: [
      { key: 'current_time', label: 'Current Time', description: 'Current time' },
      { key: 'current_date', label: 'Current Date', description: 'Current date' },
      { key: 'business_hours_active', label: 'Business Hours', description: 'Are business hours active' },
    ]
  }
]

export default function VariablePicker({ onInsert, className = '' }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const buttonRef = useRef<HTMLButtonElement>(null)

  const filteredCategories = VARIABLE_CATEGORIES.map(category => ({
    ...category,
    variables: category.variables.filter(v => 
      v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.variables.length > 0)

  const handleInsert = (variableKey: string) => {
    onInsert(`{{${variableKey}}}`)
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-cyan-300 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors"
      >
        Insert Variable
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">Insert Variable</h3>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search variables..."
                className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Variable Categories */}
            <div className="max-h-80 overflow-y-auto">
              {filteredCategories.map((category) => (
                <div key={category.name} className="border-b border-slate-800 last:border-0">
                  <div className="px-4 py-2 bg-slate-950/50 flex items-center gap-2">
                    <category.icon size={14} className="text-slate-400" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      {category.name}
                    </span>
                  </div>
                  <div className="p-2">
                    {category.variables.map((variable) => (
                      <button
                        key={variable.key}
                        onClick={() => handleInsert(variable.key)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-white group-hover:text-cyan-300">
                            {variable.label}
                          </span>
                          <code className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                            {'{{' + variable.key + '}}'}
                          </code>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {variable.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredCategories.length === 0 && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No variables found matching &quot;{searchQuery}&quot;
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-slate-950 border-t border-slate-800 text-xs text-slate-500">
              Click to insert at cursor position
            </div>
          </div>
        </>
      )}
    </div>
  )
}

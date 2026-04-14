'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { FileText, Plus, Search, Copy, Trash2, Edit, Sparkles, Zap, MessageSquare, Clock } from 'lucide-react'
import { api } from '@/lib/api'

interface Template {
  id: string
  name: string
  category: string
  content: string
  variables?: string[]
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'General',
    content: ''
  })

  const starterTemplates = [
    {
      name: 'Welcome Message',
      category: 'Onboarding',
      content: 'Hello {{name}}! Welcome to our service. We\'re excited to have you on board. Let us know if you need any help getting started.',
      icon: Sparkles,
      color: 'cyan'
    },
    {
      name: 'Quick Response',
      category: 'Support',
      content: 'Thanks for reaching out! We\'ve received your message and will get back to you within {{response_time}} hours.',
      icon: Zap,
      color: 'amber'
    },
    {
      name: 'Follow-up',
      category: 'Sales',
      content: 'Hi {{name}}, just wanted to follow up on our conversation. Do you have any questions about our {{product}}?',
      icon: MessageSquare,
      color: 'green'
    },
    {
      name: 'Appointment Reminder',
      category: 'Scheduling',
      content: 'Reminder: Your appointment is scheduled for {{date}} at {{time}}. Please let us know if you need to reschedule.',
      icon: Clock,
      color: 'purple'
    }
  ]

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await api.getTemplates()
      if (response.success && response.data) {
        setTemplates(response.data)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTemplate = async () => {
    try {
      const response = await api.createTemplate(newTemplate)
      if (response.success) {
        await loadTemplates()
        setShowCreateModal(false)
        setNewTemplate({ name: '', category: 'General', content: '' })
      }
    } catch (error) {
      console.error('Failed to create template:', error)
      alert('Failed to create template. Please try again.')
    }
  }

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setNewTemplate({
      name: template.name,
      category: template.category,
      content: template.content
    })
    setShowCreateModal(true)
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return
    try {
      const response = await api.createTemplate({
        ...newTemplate,
        id: editingTemplate.id
      })
      if (response.success) {
        await loadTemplates()
        setShowCreateModal(false)
        setEditingTemplate(null)
        setNewTemplate({ name: '', category: 'General', content: '' })
      }
    } catch (error) {
      console.error('Failed to update template:', error)
      alert('Failed to update template. Please try again.')
    }
  }

  const handleDuplicateTemplate = async (template: Template) => {
    try {
      await api.createTemplate({
        name: `${template.name} (Copy)`,
        category: template.category,
        content: template.content
      })
      await loadTemplates()
    } catch (error) {
      console.error('Failed to duplicate template:', error)
      alert('Failed to duplicate template.')
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await api.deleteTemplate(id)
        await loadTemplates()
      } catch (error) {
        console.error('Failed to delete template:', error)
        alert('Failed to delete template.')
      }
    }
  }

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredStarterTemplates = starterTemplates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Layout>
      <div className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-100">Message Templates</h1>
            <p className="text-slate-400 mt-1 text-sm md:text-base">Create and manage reusable message templates for quick responses.</p>
          </div>
          <button
            onClick={() => {
              setEditingTemplate(null)
              setNewTemplate({ name: '', category: 'General', content: '' })
              setShowCreateModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-semibold transition"
          >
            <Plus size={18} />
            Create Template
          </button>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/40 outline-none"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          </div>
        ) : (
          <>
            {filteredStarterTemplates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-100 mb-4">Starter Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {filteredStarterTemplates.map((template, index) => {
                    const Icon = template.icon
                    return (
                      <div
                        key={index}
                        className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition cursor-pointer"
                        onClick={() => {
                          setEditingTemplate(null)
                          setNewTemplate({
                            name: template.name,
                            category: template.category,
                            content: template.content
                          })
                          setShowCreateModal(true)
                        }}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2.5 bg-${template.color}-500/10 rounded-lg`}>
                            <Icon className={`w-5 h-5 text-${template.color}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-100 truncate">{template.name}</h3>
                            <p className="text-xs text-slate-400">{template.category}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-3">{template.content}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {filteredTemplates.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-100 mb-4">Your Templates</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-green-500/10 rounded-lg">
                            <FileText className="w-5 h-5 text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-100 truncate">{template.name}</h3>
                            <p className="text-xs text-slate-400">{template.category}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditTemplate(template)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit size={14} className="text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDuplicateTemplate(template)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={14} className="text-slate-400" />
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={14} className="text-rose-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-slate-400 line-clamp-3">{template.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {filteredStarterTemplates.length === 0 && filteredTemplates.length === 0 && (
              <div className="text-center py-12 bg-slate-900/80 border border-slate-800 rounded-xl">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-100 mb-2">No templates found</h3>
                <p className="text-slate-400 mb-6">
                  {searchQuery ? 'Try a different search term' : 'Create your first message template to get started'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => {
                      setEditingTemplate(null)
                      setNewTemplate({ name: '', category: 'General', content: '' })
                      setShowCreateModal(true)
                    }}
                    className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg font-semibold transition"
                  >
                    Create Your First Template
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-6">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    placeholder="e.g., Welcome Message"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Onboarding">Onboarding</option>
                    <option value="Support">Support</option>
                    <option value="Sales">Sales</option>
                    <option value="Scheduling">Scheduling</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
                  <textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    rows={5}
                    placeholder="Use {{variable}} for dynamic content"
                  />
                  <p className="text-xs text-slate-500 mt-1">Use {{variable}} for dynamic content placeholders</p>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingTemplate(null)
                    setNewTemplate({ name: '', category: 'General', content: '' })
                  }}
                  className="flex-1 px-6 py-3 border border-slate-700 text-slate-300 rounded-lg font-semibold hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                  disabled={!newTemplate.name || !newTemplate.content}
                  className="flex-1 px-6 py-3 bg-cyan-500 text-slate-900 rounded-lg font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

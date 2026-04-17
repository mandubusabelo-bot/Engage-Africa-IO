'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { Search, UserPlus, Phone, Mail, Tag, Clock, MoreVertical, Filter } from 'lucide-react'
import { api } from '@/lib/api'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  assigned_agent_id?: string
  assigned_agent_name?: string
  tags?: string[]
  lifecycle?: string
  last_message_at?: string
  created_at: string
}

interface Agent {
  id: string
  name: string
}

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterLifecycle, setFilterLifecycle] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load contacts
      const contactsRes = await api.getContacts()
      if (contactsRes.success) {
        setContacts(contactsRes.data || [])
      }
      
      // Load agents for assignment
      const agentsRes = await api.getAgents()
      if (agentsRes.success) {
        setAgents(agentsRes.data?.map((a: any) => ({ id: a.id, name: a.name })) || [])
      }
    } catch (error) {
      console.error('Failed to load contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getLifecycleColor = (lifecycle?: string) => {
    switch (lifecycle) {
      case 'hot_lead': return 'bg-orange-500'
      case 'new_lead': return 'bg-blue-500'
      case 'customer': return 'bg-green-500'
      case 'cold_lead': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         contact.phone?.includes(searchQuery)
    const matchesLifecycle = filterLifecycle === 'all' || contact.lifecycle === filterLifecycle
    return matchesSearch && matchesLifecycle
  })

  return (
    <Layout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Contacts</h1>
            <p className="text-gray-400 mt-1">Manage your WhatsApp contacts and assign agents</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <UserPlus size={20} />
            Add Contact
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-400" />
            <select
              value={filterLifecycle}
              onChange={(e) => setFilterLifecycle(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Contacts</option>
              <option value="hot_lead">Hot Lead</option>
              <option value="new_lead">New Lead</option>
              <option value="customer">Customer</option>
              <option value="cold_lead">Cold Lead</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">{contacts.length}</div>
            <div className="text-gray-400 text-sm">Total Contacts</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-400">
              {contacts.filter(c => c.lifecycle === 'hot_lead').length}
            </div>
            <div className="text-gray-400 text-sm">Hot Leads</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {contacts.filter(c => c.lifecycle === 'new_lead').length}
            </div>
            <div className="text-gray-400 text-sm">New Leads</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-400">
              {contacts.filter(c => c.lifecycle === 'customer').length}
            </div>
            <div className="text-gray-400 text-sm">Customers</div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Contact</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Phone</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Lifecycle</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Assigned Agent</th>
                <th className="px-6 py-3 text-left text-gray-300 font-medium">Last Activity</th>
                <th className="px-6 py-3 text-right text-gray-300 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    Loading contacts...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No contacts found. Start a WhatsApp conversation to add contacts automatically.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {contact.name?.substring(0, 2).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="text-white font-medium">{contact.name || 'Unknown'}</div>
                          <div className="text-gray-400 text-sm">{contact.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone size={16} className="text-gray-400" />
                        {contact.phone?.replace('@s.whatsapp.net', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium text-white ${getLifecycleColor(contact.lifecycle)}`}>
                        {contact.lifecycle?.replace('_', ' ') || 'New Lead'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-300">
                        {contact.assigned_agent_name || 
                         agents.find(a => a.id === contact.assigned_agent_id)?.name || 
                         'Auto-assigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-400 text-sm">
                        <Clock size={16} />
                        {contact.last_message_at 
                          ? new Date(contact.last_message_at).toLocaleDateString()
                          : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-gray-400 hover:text-white transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  )
}

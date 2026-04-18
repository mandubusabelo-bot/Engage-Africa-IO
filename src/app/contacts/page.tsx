'use client'

import { useState, useEffect, Fragment } from 'react'
import Layout from '@/components/Layout'
import { Search, UserPlus, Phone, Mail, Tag, Clock, MoreVertical, Filter, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import InlineToast from '@/components/InlineToast'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  street_address?: string
  city?: string
  province?: string
  postal_code?: string
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
  const [actionContactId, setActionContactId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null)
  const [newContact, setNewContact] = useState({ 
    name: '', 
    phone: '', 
    email: '',
    street_address: '',
    city: '',
    province: '',
    postal_code: '',
    lifecycle: 'new_lead' 
  })
  const [editingContact, setEditingContact] = useState<Contact | null>(null)

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

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

  const handleAssignAgent = async (contactId: string, assigned_agent_id: string) => {
    const previous = contacts
    setContacts((current) => current.map((contact) => (
      contact.id === contactId
        ? {
            ...contact,
            assigned_agent_id: assigned_agent_id || undefined,
            assigned_agent_name: agents.find((a) => a.id === assigned_agent_id)?.name || null
          }
        : contact
    )))

    try {
      await api.updateContact(contactId, { assigned_agent_id: assigned_agent_id || null })
      showToast('Contact assignment updated', 'success')
    } catch (error) {
      setContacts(previous)
      showToast('Failed to assign contact', 'error')
    }
  }

  const handleLifecycleChange = async (contactId: string, lifecycle: string) => {
    const previous = contacts
    setContacts((current) => current.map((contact) => (
      contact.id === contactId ? { ...contact, lifecycle } : contact
    )))

    try {
      await api.updateContact(contactId, { lifecycle })
      showToast('Contact status updated', 'success')
    } catch (error) {
      setContacts(previous)
      showToast('Failed to update contact status', 'error')
    }
  }

  const handleUpdateContactField = async (contactId: string, field: string, value: string) => {
    const previous = contacts
    setContacts((current) => current.map((contact) => (
      contact.id === contactId ? { ...contact, [field]: value } : contact
    )))

    try {
      await api.updateContact(contactId, { [field]: value || null })
      showToast('Contact updated', 'success')
    } catch (error) {
      setContacts(previous)
      showToast('Failed to update contact', 'error')
    }
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact? This will also delete all messages.')) {
      return
    }

    const previous = contacts
    setContacts((current) => current.filter((contact) => contact.id !== contactId))
    setActionContactId(null)

    try {
      await api.deleteContact(contactId)
      showToast('Contact deleted', 'success')
    } catch (error) {
      setContacts(previous)
      showToast('Failed to delete contact', 'error')
    }
  }

  const handleCreateContact = async () => {
    if (!newContact.phone.trim()) {
      showToast('Phone is required', 'error')
      return
    }

    const normalizedPhone = newContact.phone.includes('@')
      ? newContact.phone
      : `${newContact.phone.replace(/\D/g, '')}@s.whatsapp.net`

    try {
      const response = await api.createContact({
        name: newContact.name || normalizedPhone.split('@')[0],
        phone: normalizedPhone,
        email: newContact.email || null,
        street_address: newContact.street_address || null,
        city: newContact.city || null,
        province: newContact.province || null,
        postal_code: newContact.postal_code || null,
        lifecycle: newContact.lifecycle
      })

      if (response.success && response.data) {
        setContacts((current) => [response.data, ...current])
        setShowAddModal(false)
        setNewContact({ 
          name: '', 
          phone: '', 
          email: '',
          street_address: '',
          city: '',
          province: '',
          postal_code: '',
          lifecycle: 'new_lead' 
        })
        showToast('Contact added', 'success')
      }
    } catch (error) {
      showToast('Failed to add contact', 'error')
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
                  <Fragment key={contact.id}>
                    <tr key={contact.id} className="hover:bg-gray-750">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                            {contact.name?.substring(0, 2).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-white font-medium">{contact.name || 'Unknown'}</div>
                            <div className="text-gray-400 text-sm">{contact.email || 'No email'}</div>
                            {(contact.street_address || contact.city) && (
                              <div className="text-gray-500 text-xs mt-1">
                                {contact.street_address}{contact.street_address && contact.city ? ', ' : ''}{contact.city}
                              </div>
                            )}
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
                        <button
                          onClick={() => setActionContactId(actionContactId === contact.id ? null : contact.id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </td>
                    </tr>
                    {actionContactId === contact.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-3 bg-gray-850 border-t border-gray-700">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Assign Agent</label>
                              <select
                                value={contact.assigned_agent_id || ''}
                                onChange={(e) => handleAssignAgent(contact.id, e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                              >
                                <option value="">Unassigned</option>
                                {agents.map((agent) => (
                                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Lifecycle / Group</label>
                              <select
                                value={contact.lifecycle || 'new_lead'}
                                onChange={(e) => handleLifecycleChange(contact.id, e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                              >
                                <option value="hot_lead">Hot Lead</option>
                                <option value="new_lead">New Lead</option>
                                <option value="customer">Customer</option>
                                <option value="cold_lead">Cold Lead</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Email</label>
                              <input
                                type="email"
                                value={contact.email || ''}
                                onChange={(e) => handleUpdateContactField(contact.id, 'email', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                placeholder="email@example.com"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Street Address / Collection</label>
                              <input
                                type="text"
                                value={contact.street_address || ''}
                                onChange={(e) => handleUpdateContactField(contact.id, 'street_address', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                placeholder="PEP Store Pinetown"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">City</label>
                              <input
                                type="text"
                                value={contact.city || ''}
                                onChange={(e) => handleUpdateContactField(contact.id, 'city', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                placeholder="Pinetown"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Province</label>
                              <input
                                type="text"
                                value={contact.province || ''}
                                onChange={(e) => handleUpdateContactField(contact.id, 'province', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                placeholder="KwaZulu-Natal"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-400 mb-1">Postal Code / Store Code</label>
                              <input
                                type="text"
                                value={contact.postal_code || ''}
                                onChange={(e) => handleUpdateContactField(contact.id, 'postal_code', e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm"
                                placeholder="P1234"
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => handleDeleteContact(contact.id)}
                                className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-2 text-sm transition-colors"
                              >
                                <Trash2 size={16} />
                                Delete Contact
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-950 p-6">
              <h2 className="text-xl font-semibold text-slate-100 mb-4">Add Contact</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Name</label>
                  <input
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Phone</label>
                  <input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    placeholder="e.g. 27821234567"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Email (optional)</label>
                  <input
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Street Address / Collection</label>
                  <input
                    value={newContact.street_address}
                    onChange={(e) => setNewContact({ ...newContact, street_address: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    placeholder="PEP Store Pinetown"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">City</label>
                    <input
                      value={newContact.city}
                      onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                      placeholder="Pinetown"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-300 mb-1">Province</label>
                    <input
                      value={newContact.province}
                      onChange={(e) => setNewContact({ ...newContact, province: e.target.value })}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                      placeholder="KwaZulu-Natal"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Postal Code / Store Code</label>
                  <input
                    value={newContact.postal_code}
                    onChange={(e) => setNewContact({ ...newContact, postal_code: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                    placeholder="P1234"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">Lifecycle</label>
                  <select
                    value={newContact.lifecycle}
                    onChange={(e) => setNewContact({ ...newContact, lifecycle: e.target.value })}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  >
                    <option value="new_lead">New Lead</option>
                    <option value="hot_lead">Hot Lead</option>
                    <option value="customer">Customer</option>
                    <option value="cold_lead">Cold Lead</option>
                  </select>
                </div>
              </div>
              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-slate-700 px-4 py-2 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateContact}
                  className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

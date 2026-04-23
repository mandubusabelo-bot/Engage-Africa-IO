'use client'

import { useState, useEffect, useCallback } from 'react'
import Layout from '@/components/Layout'
import { Search, Send, Paperclip, Smile, MoreVertical, Phone, Video, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'

interface Conversation {
  id: string
  name: string
  lastMessage: string
  time: string
  unread: number
  avatar: string
}

interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  time: string
}

const normalizePhone = (value?: string | null) => (value || '').trim().toLowerCase()

const displayPhone = (value?: string | null) => (value || '').replace('@s.whatsapp.net', '').replace('@c.us', '')

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, any[]>>({})
  const [loading, setLoading] = useState(true)

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true)
      
      // Load contacts first to get names
      const contactsMap = new Map<string, string>()
      try {
        const contactsRes = await api.getContacts()
        if (contactsRes.success && contactsRes.data) {
          contactsRes.data.forEach((c: any) => {
            contactsMap.set(normalizePhone(c.phone), c.name || displayPhone(c.phone))
          })
        }
      } catch (contactsError) {
        console.warn('Contacts unavailable, using phone fallback in messages UI')
      }
      
      const response = await api.getMessages()
      if (response.success && response.data) {
        // Group messages by phone number to create conversations
        const messagesByPhone: { [key: string]: any[] } = {}
        const latestMessageNameByPhone = new Map<string, string>()
        
        response.data.forEach((msg: any) => {
          const phone = displayPhone(msg.phone) || 'unknown'
          if (!messagesByPhone[phone]) {
            messagesByPhone[phone] = []
          }
          messagesByPhone[phone].push(msg)

          const normalized = normalizePhone(phone)
          if (!latestMessageNameByPhone.has(normalized) && msg.name && msg.name.trim()) {
            latestMessageNameByPhone.set(normalized, msg.name.trim())
          }
        })

        // Create conversations from grouped messages
        const convos: Conversation[] = Object.entries(messagesByPhone).map(([phone, msgs]) => {
          const sortedMsgs = [...msgs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          const lastMsg = sortedMsgs[sortedMsgs.length - 1]
          // Get contact name or format phone
          const normalizedPhone = normalizePhone(phone)
          const contactName = contactsMap.get(normalizedPhone)
          const messageName = latestMessageNameByPhone.get(normalizedPhone)
          const displayName = contactName || messageName || displayPhone(phone)
          
          return {
            id: phone,
            name: displayName,
            lastMessage: lastMsg.content.substring(0, 50),
            time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            avatar: displayName.substring(0, 2).toUpperCase()
          }
        })

        setConversations(convos)
        setMessagesByConversation(messagesByPhone)
        if (convos.length > 0 && !selectedConversation) {
          setSelectedConversation(convos[0].id)
          loadConversationMessages(convos[0].id, messagesByPhone[convos[0].id])
        }

        if (selectedConversation && messagesByPhone[selectedConversation]) {
          loadConversationMessages(selectedConversation, messagesByPhone[selectedConversation])
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedConversation])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  const loadConversationMessages = (phone: string, msgs: any[]) => {
    const formattedMessages: Message[] = msgs.map(msg => {
      // Classify strictly: agent/ai/bot or agent_id present => agent; otherwise user
      const isAgent = Boolean(msg.agent_id) || ['ai', 'assistant', 'bot', 'agent'].includes((msg.sender || '').toLowerCase())
      return {
        id: msg.id,
        text: msg.content,
        // User messages on RIGHT (cyan), Agent messages on LEFT (green)
        sender: isAgent ? 'agent' : 'user',
        time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    })
    setMessages(formattedMessages)
  }

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      try {
        // Send message via WhatsApp
        await api.sendWhatsAppMessage(selectedConversation, newMessage)
        
        // Add to local state
        const message: Message = {
          id: String(messages.length + 1),
          text: newMessage,
          sender: 'agent',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        setMessages([...messages, message])
        setNewMessage('')
      } catch (error) {
        console.error('Failed to send message:', error)
        alert('Failed to send message. Please try again.')
      }
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentConversation = conversations.find(c => c.id === selectedConversation)

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
        {/* Conversations List */}
        <div className="w-full lg:w-80 bg-slate-950/60 border-r border-slate-800 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/40 outline-none"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv.id)
                  loadConversationMessages(conv.id, messagesByConversation[conv.id] || [])
                }}
                className={`p-4 border-b border-slate-800 cursor-pointer hover:bg-slate-900 transition-colors ${
                  selectedConversation === conv.id ? 'bg-slate-900' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-200 font-semibold">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-slate-100 truncate">{conv.name}</h3>
                      <span className="text-xs text-slate-500">{conv.time}</span>
                    </div>
                    <p className="text-sm text-slate-400 truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center text-slate-950 text-xs font-bold">
                      {conv.unread}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-[#070b14] min-h-0">
          {/* Chat Header */}
          <div className="bg-slate-950/60 border-b border-slate-800 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-200 font-semibold">
                  {currentConversation?.avatar}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-100">{currentConversation?.name}</h2>
                  <p className="text-xs text-emerald-300">Active now</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Phone size={20} className="text-slate-400" />
                </button>
                <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                  <Video size={20} className="text-slate-400" />
                </button>
                <button 
                  onClick={async () => {
                    if (confirm('Delete all messages in this conversation?')) {
                      try {
                        await api.deleteMessages(selectedConversation)
                        await loadMessages()
                      } catch (error) {
                        alert('Failed to delete messages')
                      }
                    }
                  }}
                  className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-slate-900/70' : 'text-slate-500'
                  }`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="bg-slate-950/60 border-t border-slate-800 p-4">
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Paperclip size={20} className="text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <Smile size={20} className="text-slate-400" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/40 outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-cyan-500 text-slate-950 rounded-lg hover:bg-cyan-400 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

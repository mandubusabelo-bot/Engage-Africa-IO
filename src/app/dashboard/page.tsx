'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { MessageSquare, Users, TrendingUp, Clock, Plus, User, Bot, Zap, FileText, QrCode, Smartphone, RefreshCw } from 'lucide-react'
import { api } from '@/lib/api'

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState({
    totalMessages: 0,
    activeAgents: 0,
    responseRate: 0,
    avgResponseTime: 0
  })
  const [recentMessages, setRecentMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null)
  const [initializingWhatsApp, setInitializingWhatsApp] = useState(false)
  const [whatsAppNotice, setWhatsAppNotice] = useState<string>('')
  const [showWhatsAppBusinessConfig, setShowWhatsAppBusinessConfig] = useState(false)
  const [whatsappBusinessConfig, setWhatsappBusinessConfig] = useState({
    accessToken: '',
    phoneNumberId: ''
  })
  const [evolutionApiConfig, setEvolutionApiConfig] = useState({
    apiUrl: '',
    apiKey: '',
    instanceName: ''
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  const handleInitializeWhatsApp = async () => {
    try {
      setInitializingWhatsApp(true)
      setWhatsAppNotice('')
      const response = await api.initializeWhatsAppSmart()
      if (response.success) {
        setWhatsappStatus(response.data || null)
        if (response.data?.warning) {
          setWhatsAppNotice(response.data.warning)
        }
        if (!response.data?.qrCode) {
          await handleRefreshWhatsApp()
        }
      }
    } catch (error: any) {
      console.error('Failed to initialize WhatsApp:', error)
      setWhatsAppNotice(`WhatsApp initialization failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setInitializingWhatsApp(false)
    }
  }

  const handleRefreshWhatsApp = async () => {
    try {
      const response = await api.getWhatsAppStatus()
      if (response.success) {
        const isConnected = response.data?.status === 'connected'
        const hasQr = Boolean(response.data?.qrCode)

        if (isConnected || hasQr) {
          setWhatsappStatus(response.data)
          return
        }
      }

      const gcpResponse = await api.getWhatsAppGcpStatus()
      if (gcpResponse.success) {
        setWhatsappStatus(gcpResponse.data)
      }
    } catch (error) {
      console.error('Failed to refresh WhatsApp status:', error)
    }
  }

  const handleConfigureWhatsAppBusiness = async () => {
    try {
      setInitializingWhatsApp(true)
      setWhatsAppNotice('')
      
      const response = await api.configureWhatsAppBusiness(whatsappBusinessConfig)
      if (response.success) {
        setWhatsAppNotice('WhatsApp Business API configured successfully! Your agents can now send messages.')
        setShowWhatsAppBusinessConfig(false)
        await handleRefreshWhatsApp()
      } else {
        setWhatsAppNotice('Failed to configure WhatsApp Business API. Please check your credentials.')
      }
    } catch (error: any) {
      console.error('WhatsApp Business configuration failed:', error)
      setWhatsAppNotice(`Configuration failed: ${error.message || 'Unknown error'}`)
    } finally {
      setInitializingWhatsApp(false)
    }
  }

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      const agentsResponse = await api.getAgents()
      const agents = agentsResponse.success ? agentsResponse.data : []
      const activeAgents = agents.filter((a: any) => a.status === 'active').length
      
      const messagesResponse = await api.getMessages()
      const messages = messagesResponse.success ? messagesResponse.data : []
      
      const totalMessages = messages.length
      const avgRate = agents.reduce((sum: number, a: any) => sum + (a.response_rate || 0), 0) / (agents.length || 1)
      
      setStats({
        totalMessages,
        activeAgents,
        responseRate: Math.round(avgRate),
        avgResponseTime: 2.3
      })
      
      setRecentMessages(messages.slice(0, 4))
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-slate-100">Operations Dashboard</h1>
            <p className="text-slate-400 mt-1 text-sm sm:text-base">Monitor performance, channels, and agent activity.</p>
          </div>
          <button 
            onClick={() => router.push('/agents')}
            className="inline-flex items-center justify-center gap-2 bg-cyan-500 text-slate-950 px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-semibold hover:bg-cyan-400 transition-colors text-sm sm:text-base"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create New Agent</span>
            <span className="sm:hidden">New Agent</span>
          </button>
        </div>

        <div id="whatsapp">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-emerald-500/20 rounded-xl border border-emerald-400/30 flex items-center justify-center">
                <Smartphone className="text-emerald-300" size={22} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-100">WhatsApp Integration</h2>
                <p className="text-sm text-slate-400">Connect your WhatsApp to enable AI agent responses.</p>
              </div>
              <button
                onClick={handleRefreshWhatsApp}
                className="ml-auto px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1 text-sm"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {whatsAppNotice && (
              <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                <div>{whatsAppNotice}</div>
                {(whatsAppNotice.includes('Chromium') || whatsAppNotice.includes('timeout') || whatsAppNotice.includes('Business API')) && !showWhatsAppBusinessConfig && (
                  <div className="mt-3">
                    <button
                      onClick={() => setShowWhatsAppBusinessConfig(true)}
                      className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-md hover:bg-emerald-500/30 transition-colors"
                    >
                      Configure WhatsApp Business API Instead
                    </button>
                  </div>
                )}
              </div>
            )}

            {showWhatsAppBusinessConfig && (
              <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                <h3 className="text-sm font-semibold text-emerald-300 mb-3">Evolution API Configuration (Recommended)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">API URL</label>
                    <input
                      type="text"
                      value={evolutionApiConfig.apiUrl}
                      onChange={(e) => setEvolutionApiConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
                      placeholder="http://localhost:8080"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">API Key</label>
                    <input
                      type="password"
                      value={evolutionApiConfig.apiKey}
                      onChange={(e) => setEvolutionApiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="Your Evolution API key"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Instance Name</label>
                    <input
                      type="text"
                      value={evolutionApiConfig.instanceName}
                      onChange={(e) => setEvolutionApiConfig(prev => ({ ...prev, instanceName: e.target.value }))}
                      placeholder="MyAgentBot"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        setInitializingWhatsApp(true)
                        setWhatsAppNotice('')
                        const response = await api.configureWhatsAppBusiness({
                          evolutionApiUrl: evolutionApiConfig.apiUrl,
                          evolutionApiKey: evolutionApiConfig.apiKey,
                          instanceName: evolutionApiConfig.instanceName
                        })
                        if (response.success) {
                          setWhatsAppNotice('Evolution API configured successfully!')
                          setShowWhatsAppBusinessConfig(false)
                          await handleRefreshWhatsApp()
                        } else {
                          setWhatsAppNotice('Failed to configure Evolution API')
                        }
                        setInitializingWhatsApp(false)
                      }}
                      disabled={!evolutionApiConfig.apiUrl || !evolutionApiConfig.apiKey || !evolutionApiConfig.instanceName || initializingWhatsApp}
                      className="flex-1 px-3 py-2 bg-emerald-500 text-slate-950 rounded-lg font-semibold text-sm hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {initializingWhatsApp ? 'Configuring...' : 'Connect Evolution API'}
                    </button>
                    <button
                      onClick={() => setShowWhatsAppBusinessConfig(false)}
                      className="px-3 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="text-xs text-slate-500">
                    Deploy Evolution API on Railway:{' '}
                    <a href="https://railway.com/deploy/self-host-evolution-api" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                      One-Click Template
                    </a>
                  </div>
                </div>
              </div>
            )}

            {whatsappStatus?.status === 'connected' ? (
              <div className="rounded-xl p-5 border border-emerald-500/30 bg-emerald-500/10">
                <div className="flex items-center gap-3 text-emerald-300 mb-3">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-lg">WhatsApp Connected & Active</span>
                </div>
                <p className="text-slate-300 mb-2">
                  {whatsappStatus?.mode === 'evolution_api' ? 'Evolution API' : 'WhatsApp Business API'}
                </p>
                <p className="text-slate-300">Your AI agents are now handling WhatsApp messages.</p>
                <button
                  onClick={handleRefreshWhatsApp}
                  className="mt-3 text-xs text-emerald-300 hover:text-emerald-200 transition-colors"
                >
                  Refresh Status
                </button>
              </div>
            ) : whatsappStatus?.qrCode ? (
              <div className="space-y-3">
                <div className="rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5">
                  <div className="text-center">
                    <p className="text-sm font-semibold text-emerald-300 mb-1">Scan with WhatsApp</p>
                    <p className="text-xs text-slate-400 mb-3">Open WhatsApp → Linked Devices → Link a Device</p>
                    <div className="bg-white p-3 rounded-xl inline-block">
                      <img src={whatsappStatus.qrCode} alt="WhatsApp QR Code" className="w-56 h-56" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={whatsappStatus.qrCode}
                    download="whatsapp-qr.png"
                    className="flex-1 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/30 transition-colors text-sm text-center"
                  >
                    Download QR
                  </a>
                  <button
                    onClick={handleInitializeWhatsApp}
                    disabled={initializingWhatsApp}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors text-sm disabled:opacity-50"
                  >
                    {initializingWhatsApp ? 'Refreshing...' : 'New QR'}
                  </button>
                  <button
                    onClick={() => setWhatsappStatus(null)}
                    className="px-3 py-2 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="mx-auto text-slate-500 mb-4" size={64} />
                <p className="text-slate-400 mb-4">Connect your WhatsApp to start using AI agents.</p>
                <button
                  onClick={handleInitializeWhatsApp}
                  disabled={initializingWhatsApp}
                  className="px-6 py-3 bg-emerald-500 text-slate-950 rounded-xl font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {initializingWhatsApp ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-950"></div>
                      Generating QR Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <QrCode size={20} />
                      Generate QR Code
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400">Total Messages</h3>
              <MessageSquare className="text-cyan-300" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-100">{loading ? '...' : stats.totalMessages.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Total messages sent</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400">Active Agents</h3>
              <Users className="text-indigo-300" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-100">{loading ? '...' : stats.activeAgents}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Active AI agents</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400">Response Rate</h3>
              <TrendingUp className="text-emerald-300" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-100">{loading ? '...' : `${stats.responseRate}%`}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Average response rate</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-slate-400">Avg Response Time</h3>
              <Clock className="text-amber-300" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-semibold text-slate-100">{loading ? '...' : `${stats.avgResponseTime}s`}</p>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 sm:mt-2">Average response time</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3 sm:mb-4">Recent Messages</h2>
            <div className="space-y-3 sm:space-y-4">
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-cyan-400 mx-auto"></div>
                  <p className="text-slate-400 mt-2 text-sm sm:text-base">Loading messages...</p>
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <MessageSquare className="mx-auto text-slate-500 mb-2" size={32} />
                  <p className="text-slate-400 text-sm sm:text-base">No messages yet</p>
                </div>
              ) : (
                recentMessages.map(message => (
                  <div key={message.id} className="flex items-start gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-slate-800 last:border-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-700">
                      <User className="text-cyan-300" size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-slate-100 text-sm sm:text-base truncate">{message.sender}</h4>
                        <span className="text-xs text-slate-500 flex-shrink-0 ml-2">{message.timestamp || 'Just now'}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400 line-clamp-2">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg sm:text-xl font-semibold text-slate-100 mb-3 sm:mb-4">Quick Actions</h2>
            <div className="space-y-2 sm:space-y-3">
              <button 
                onClick={() => router.push('/agents')}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Bot size={16} className="text-cyan-300" />
                <div className="text-left flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Create New Agent</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Set up a new AI assistant</p>
                </div>
              </button>
              
              <button 
                onClick={() => router.push('/flows')}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <Zap size={16} className="text-indigo-300" />
                <div className="text-left flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Create Flow</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Design conversation flows</p>
                </div>
              </button>
              
              <button 
                onClick={() => router.push('/templates')}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900 border border-slate-800 text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <FileText size={16} className="text-emerald-300" />
                <div className="text-left flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Create Template</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Create message templates</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

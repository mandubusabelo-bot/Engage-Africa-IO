'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { Save, User, Bell, Shield, Globe, Palette, Database, Key, QrCode, Smartphone } from 'lucide-react'
import { api } from '@/lib/api'

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    companyName: 'Engage Africa IO',
    email: 'admin@engage.io',
    language: 'english',
    timezone: 'Africa/Johannesburg',
    notifications: true,
    emailNotifications: true,
    twoFactor: false,
    apiKey: 'ea_live_xxxxxxxxxxxxxxxx',
    webhookUrl: '',
    theme: 'dark'
  })

  const [appBehavior, setAppBehavior] = useState({
    whatsappMode: 'auto',
    workflowEventTriggersEnabled: true,
    whatsappQrTimeoutMs: 180000
  })

  useEffect(() => {
    const saved = localStorage.getItem('engageSettings')
    if (saved) {
      try {
        setSettings(JSON.parse(saved))
      } catch (e) {
        // ignore invalid JSON
      }
    }

    const loadBackendSettings = async () => {
      try {
        const response = await api.getSettings()
        if (response.success && response.data) {
          setAppBehavior({
            whatsappMode: response.data.whatsappMode || 'auto',
            workflowEventTriggersEnabled: response.data.workflowEventTriggersEnabled !== false,
            whatsappQrTimeoutMs: Number(response.data.whatsappQrTimeoutMs || 180000)
          })
        }
      } catch (error) {
        console.error('Failed to load backend app settings:', error)
      }
    }

    loadBackendSettings()
  }, [])

  const handleSave = async () => {
    localStorage.setItem('engageSettings', JSON.stringify(settings))
    try {
      await api.updateSettings(appBehavior)
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Failed to save backend settings:', error)
      alert('Saved local settings, but failed to save backend app behavior settings.')
    }
  }

  const [showQRModal, setShowQRModal] = useState(false)

  const handleOpenQRModal = () => {
    setShowQRModal(true)
  }

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API & Integrations', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ]

  return (
    <Layout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your account and application preferences</p>
        </div>

        <div className="flex gap-6">
          <div className="w-64 bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="flex-1 bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">

            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-100">General Settings</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({...settings, language: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    >
                      <option value="english">English</option>
                      <option value="swahili">Swahili</option>
                      <option value="french">French</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    >
                      <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                      <option value="Africa/Nairobi">Africa/Nairobi</option>
                      <option value="Africa/Lagos">Africa/Lagos</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-slate-100">WhatsApp Integration</h3>
                  <p className="text-sm text-slate-400">Quick access to WhatsApp QR code generation</p>
                  
                  <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                        <Smartphone className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-100">Generate QR Code</h4>
                        <p className="text-sm text-slate-400">Open WhatsApp QR code from Dashboard</p>
                      </div>
                      <button
                        onClick={handleOpenQRModal}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          <QrCode size={16} />
                          Open QR Code
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-100">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <h3 className="font-semibold text-slate-100">Push Notifications</h3>
                      <p className="text-sm text-slate-400">Receive notifications in the app</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <h3 className="font-semibold text-slate-100">Email Notifications</h3>
                      <p className="text-sm text-slate-400">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-100">Security Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <h3 className="font-semibold text-slate-100">Two-Factor Authentication</h3>
                      <p className="text-sm text-slate-400">Add an extra layer of security</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.twoFactor}
                        onChange={(e) => setSettings({...settings, twoFactor: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Change Password</label>
                    <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-100">API & Integrations</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.apiKey}
                      readOnly
                      className="flex-1 px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200"
                    />
                    <button className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 transition-colors">
                      Regenerate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                    placeholder="https://your-domain.com/webhook"
                    className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                  />
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-4">
                  <h3 className="text-lg font-semibold text-slate-100">Runtime Behavior</h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp Startup Mode</label>
                    <select
                      value={appBehavior.whatsappMode}
                      onChange={(e) => setAppBehavior({ ...appBehavior, whatsappMode: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    >
                      <option value="auto">Auto (Web then GCP then Business)</option>
                      <option value="web">Web (QR local-like)</option>
                      <option value="gcp">GCP (Cloud QR)</option>
                      <option value="business">Business API only</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-950 rounded-lg border border-slate-800">
                    <div>
                      <h3 className="font-semibold text-slate-100">Workflow Event Triggers</h3>
                      <p className="text-sm text-slate-400">Auto-run event workflows on incoming WhatsApp messages</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={appBehavior.workflowEventTriggersEnabled}
                        onChange={(e) => setAppBehavior({ ...appBehavior, workflowEventTriggersEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp QR Timeout (ms)</label>
                    <input
                      type="number"
                      min={30000}
                      step={10000}
                      value={appBehavior.whatsappQrTimeoutMs}
                      onChange={(e) => setAppBehavior({ ...appBehavior, whatsappQrTimeoutMs: Number(e.target.value || 180000) })}
                      className="w-full px-4 py-2 border border-slate-700 bg-slate-950 rounded-lg text-slate-200 focus:ring-2 focus:ring-cyan-500/40 outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-slate-100">Appearance</h2>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-4">Theme</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSettings({...settings, theme: 'light'})}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        settings.theme === 'light'
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="w-full h-20 bg-white rounded mb-2"></div>
                      <p className="font-medium text-slate-100">Light</p>
                    </button>
                    <button
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        settings.theme === 'dark'
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="w-full h-20 bg-slate-900 rounded mb-2"></div>
                      <p className="font-medium text-slate-100">Dark</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showQRModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-100">WhatsApp QR Code</h3>
                    <button
                      onClick={() => setShowQRModal(false)}
                      className="text-slate-400 hover:text-slate-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">Generate QR code from Dashboard to connect WhatsApp</p>
                    <button
                      onClick={() => {
                        setShowQRModal(false)
                        window.location.href = '/dashboard#whatsapp'
                      }}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-slate-800">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white rounded-lg font-semibold hover:bg-cyan-400 transition-colors"
              >
                <Save size={20} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

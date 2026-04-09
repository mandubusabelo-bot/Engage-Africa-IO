import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Save, User, Bell, Shield, Globe, Palette, Database, Key, QrCode, Smartphone } from 'lucide-react';
import { api } from '../services/api';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
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
    theme: 'light'
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  const [showQRModal, setShowQRModal] = useState(false);

  const handleOpenQRModal = () => {
    setShowQRModal(true);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'api', label: 'API & Integrations', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette }
  ];

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account and application preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-purple-100 text-purple-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={20} />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6">

            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">General Settings</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({...settings, email: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={settings.language}
                      onChange={(e) => setSettings({...settings, language: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                    >
                      <option value="english">English</option>
                      <option value="swahili">Swahili</option>
                      <option value="french">French</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                    >
                      <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                      <option value="Africa/Nairobi">Africa/Nairobi</option>
                      <option value="Africa/Lagos">Africa/Lagos</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>

                {/* WhatsApp QR Control */}
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">WhatsApp Integration</h3>
                  <p className="text-sm text-gray-600">Quick access to WhatsApp QR code generation</p>
                  
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center shadow">
                        <Smartphone className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">Generate QR Code</h4>
                        <p className="text-sm text-gray-600">Open WhatsApp QR code from Dashboard</p>
                      </div>
                      <button
                        onClick={handleOpenQRModal}
                        className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all"
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

            {/* Notifications */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-900">Push Notifications</h3>
                      <p className="text-sm text-gray-600">Receive notifications in the app</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.notifications}
                        onChange={(e) => setSettings({...settings, notifications: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Security Settings</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-900">Two-Factor Authentication</h3>
                      <p className="text-sm text-gray-600">Add an extra layer of security</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.twoFactor}
                        onChange={(e) => setSettings({...settings, twoFactor: e.target.checked})}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Change Password</label>
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Update Password
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* API & Integrations */}
            {activeTab === 'api' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">API & Integrations</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.apiKey}
                      readOnly
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      Regenerate
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <input
                    type="url"
                    value={settings.webhookUrl}
                    onChange={(e) => setSettings({...settings, webhookUrl: e.target.value})}
                    placeholder="https://your-domain.com/webhook"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Appearance */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900">Appearance</h2>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">Theme</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSettings({...settings, theme: 'light'})}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        settings.theme === 'light'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-full h-20 bg-white rounded mb-2"></div>
                      <p className="font-medium text-gray-900">Light</p>
                    </button>
                    <button
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                      className={`p-4 border-2 rounded-lg transition-colors ${
                        settings.theme === 'dark'
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="w-full h-20 bg-gray-900 rounded mb-2"></div>
                      <p className="font-medium text-gray-900">Dark</p>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-900">WhatsApp QR Code</h3>
                    <button
                      onClick={() => setShowQRModal(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Generate QR code from Dashboard to connect WhatsApp</p>
                    <button
                      onClick={() => {
                        setShowQRModal(false);
                        // Navigate to Dashboard and scroll to WhatsApp section
                        window.location.href = '/#whatsapp';
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
                    >
                      Go to Dashboard
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
              >
                <Save size={20} />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

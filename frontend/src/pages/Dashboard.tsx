import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { MessageSquare, Users, TrendingUp, Clock, Plus, User, Bot, Zap, FileText, QrCode, Smartphone, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMessages: 0,
    activeAgents: 0,
    responseRate: 0,
    avgResponseTime: 0
  });
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [whatsappStatus, setWhatsappStatus] = useState<any>(null);
  const [initializingWhatsApp, setInitializingWhatsApp] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleInitializeWhatsApp = async () => {
    try {
      setInitializingWhatsApp(true);
      const response = await api.initializeWhatsApp();
      if (response.success) {
        setWhatsappStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to initialize WhatsApp:', error);
    } finally {
      setInitializingWhatsApp(false);
    }
  };

  const handleRefreshWhatsApp = async () => {
    try {
      const response = await api.getWhatsAppStatus();
      if (response.success) {
        setWhatsappStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh WhatsApp status:', error);
    }
  };


  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load agents to get active count
      const agentsResponse = await api.getAgents();
      const agents = agentsResponse.success ? agentsResponse.data : [];
      const activeAgents = agents.filter((a: any) => a.status === 'active').length;
      
      // Load messages
      const messagesResponse = await api.getMessages();
      const messages = messagesResponse.success ? messagesResponse.data : [];
      
      // Calculate stats
      const totalMessages = messages.length;
      const avgRate = agents.reduce((sum: number, a: any) => sum + (a.response_rate || 0), 0) / (agents.length || 1);
      
      setStats({
        totalMessages,
        activeAgents,
        responseRate: Math.round(avgRate),
        avgResponseTime: 2.3
      });
      
      setRecentMessages(messages.slice(0, 4));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-4 sm:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Dashboard</h1>
            <p className="text-gray-600 mt-1 text-sm sm:text-base">Welcome back! Here's your overview</p>
          </div>
          <button 
            onClick={() => navigate('/agents')}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all text-sm sm:text-base"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Create New Agent</span>
            <span className="sm:hidden">New Agent</span>
          </button>
        </div>

        {/* WhatsApp Card - Manual Control Only */}
        <div id="whatsapp" className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Smartphone className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">WhatsApp Integration</h2>
                <p className="text-sm text-gray-600">Connect your WhatsApp to enable AI agent responses</p>
              </div>
              <button
                onClick={handleRefreshWhatsApp}
                className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1 text-sm"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            </div>

            {whatsappStatus?.status === 'connected' ? (
              <div className="bg-white rounded-xl p-6 border border-green-200">
                <div className="flex items-center gap-3 text-green-600 mb-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="font-semibold text-lg">✅ WhatsApp Connected & Active</span>
                </div>
                <p className="text-gray-600">Your AI agents are now handling WhatsApp messages!</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleRefreshWhatsApp}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-1 text-sm"
                  >
                    <RefreshCw size={14} />
                    Check Status
                  </button>
                </div>
              </div>
            ) : whatsappStatus?.qrCode ? (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border border-green-200">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700 mb-3">Scan with WhatsApp</p>
                    <img src={whatsappStatus.qrCode} alt="WhatsApp QR Code" className="w-40 h-40 mx-auto" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleInitializeWhatsApp}
                    disabled={initializingWhatsApp}
                    className="flex-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm disabled:opacity-50"
                  >
                    {initializingWhatsApp ? 'Refreshing...' : 'New QR'}
                  </button>
                  <button
                    onClick={() => setWhatsappStatus(null)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <QrCode className="mx-auto text-gray-400 mb-4" size={64} />
                <p className="text-gray-600 mb-4">Connect your WhatsApp to start using AI agents</p>
                <button
                  onClick={handleInitializeWhatsApp}
                  disabled={initializingWhatsApp}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {initializingWhatsApp ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Total Messages</h3>
              <MessageSquare className="text-purple-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{loading ? '...' : stats.totalMessages.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Total messages sent</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Active Agents</h3>
              <Users className="text-blue-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{loading ? '...' : stats.activeAgents}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Active AI agents</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Response Rate</h3>
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{loading ? '...' : `${stats.responseRate}%`}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Average response rate</p>
          </div>

          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-xs sm:text-sm font-medium text-gray-600">Avg Response Time</h3>
              <Clock className="text-yellow-600" size={20} />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-gray-900">{loading ? '...' : `${stats.avgResponseTime}s`}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Average response time</p>
          </div>
        </div>

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Recent Messages */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Recent Messages</h2>
            <div className="space-y-3 sm:space-y-4">
              {loading ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2 text-sm sm:text-base">Loading messages...</p>
                </div>
              ) : recentMessages.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <MessageSquare className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-gray-600 text-sm sm:text-base">No messages yet</p>
                </div>
              ) : (
                recentMessages.map(message => (
                  <div key={message.id} className="flex items-start gap-2 sm:gap-3 pb-3 sm:pb-4 border-b border-gray-100 last:border-0">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="text-purple-600" size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 text-sm sm:text-base truncate">{message.sender}</h4>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{message.timestamp}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Quick Actions</h2>
            <div className="space-y-2 sm:space-y-3">
              <button 
                onClick={() => navigate('/agents')}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <Bot size={16} />
                <div className="text-left flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Create New Agent</h3>
                  <p className="text-xs sm:text-sm opacity-75">Set up a new AI assistant</p>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/flows')}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Zap size={16} />
                <div className="text-left flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Create Flow</h3>
                  <p className="text-xs sm:text-sm opacity-75">Design conversation flows</p>
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/templates')}
                className="w-full flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <FileText size={16} />
                <div className="text-left flex-1">
                  <h3 className="font-medium text-sm sm:text-base">Create Template</h3>
                  <p className="text-xs sm:text-sm opacity-75">Create message templates</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { TrendingUp, MessageSquare, Users, Clock, Bot } from 'lucide-react';
import { api } from '../services/api';

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getAnalytics();
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-8 flex items-center justify-center">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-600 mt-1">Track your chatbot performance</p>
          </div>
          <div className="flex gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
            >
              <option value="24hours">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
              <Bot size={20} />
              Export
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Messages</h3>
              <MessageSquare className="text-purple-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.totalMessages || 0}</p>
            <p className={`text-sm mt-2 ${analytics?.messageGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics?.messageGrowth > 0 ? '↑' : '↓'} {Math.abs(analytics?.messageGrowth || 0)}% from last period
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Total Users</h3>
              <Users className="text-blue-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.totalUsers || 0}</p>
            <p className={`text-sm mt-2 ${analytics?.userGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics?.userGrowth > 0 ? '↑' : '↓'} {Math.abs(analytics?.userGrowth || 0)}% from last period
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Avg Response Time</h3>
              <Clock className="text-yellow-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.avgResponseTime || 0}s</p>
            <p className={`text-sm mt-2 ${analytics?.responseImprovement < 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics?.responseImprovement < 0 ? '↓' : '↑'} {Math.abs(analytics?.responseImprovement || 0)}% faster
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-600">Active Agents</h3>
              <TrendingUp className="text-green-600" size={24} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{analytics?.activeAgents || 0}</p>
            <p className={`text-sm mt-2 ${analytics?.agentGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {analytics?.agentGrowth > 0 ? '↑' : '↓'} {Math.abs(analytics?.agentGrowth || 0)}% from last period
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Message Volume Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Message Volume</h2>
              <Bot className="text-gray-400" size={20} />
            </div>
            <div className="space-y-4">
              {analytics?.messageData?.map((data, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-12">{data.day}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${(data.messages / analytics?.maxMessages) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-white">{data.messages}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Performing Agents */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Top Performing Agents</h2>
            <div className="space-y-4">
              {analytics?.topAgents?.map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.messages} messages</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{agent.rate}%</p>
                    <p className="text-xs text-gray-500">Success Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed Metrics */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Detailed Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-purple-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Peak Hours</h3>
              <p className="text-2xl font-bold text-purple-600">2PM - 5PM</p>
              <p className="text-xs text-gray-500 mt-1">Most active time</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Avg Session Duration</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics?.totalMessages || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Total messages sent</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Resolution Rate</h3>
              <p className="text-3xl font-bold text-gray-900">{analytics?.activeConversations || 0}</p>
              <p className="text-sm text-gray-500 mt-2">Active conversations</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

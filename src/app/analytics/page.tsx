'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import { TrendingUp, MessageSquare, Users, Clock, Bot, Download, Filter } from 'lucide-react'
import { api } from '@/lib/api'

export default function Analytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7days')

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-emerald-300'
    if (value < 0) return 'text-rose-300'
    return 'text-slate-400'
  }

  const getChangePrefix = (value: number) => {
    if (value > 0) return '↑'
    if (value < 0) return '↓'
    return '•'
  }

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      const response = await api.getAnalytics()
      if (response.success) {
        setAnalytics(response.data)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 md:p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-56 rounded-md bg-slate-800" />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="h-32 rounded-2xl bg-slate-900/80 border border-slate-800" />
              ))}
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="h-72 rounded-2xl bg-slate-900/80 border border-slate-800" />
              <div className="h-72 rounded-2xl bg-slate-900/80 border border-slate-800" />
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  const messageData = analytics?.messageData || []
  const topAgents = analytics?.topAgents || []
  const maxMessages = analytics?.maxMessages || 1

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-100">Reports & Analytics</h1>
            <p className="text-slate-400 mt-1 text-sm md:text-base">Track engagement, response quality, and agent performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-300 text-sm hover:bg-slate-800">
              <Filter size={16} />
              Filters
            </button>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900/80 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            >
              <option value="24hours">Last 24 Hours</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
            <button className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 text-slate-900 text-sm font-semibold hover:bg-cyan-400">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Total Messages</h3>
              <MessageSquare className="text-cyan-300" size={20} />
            </div>
            <p className="text-3xl font-semibold text-slate-100">{analytics?.totalMessages || 0}</p>
            <p className={`text-sm mt-2 ${getChangeColor(analytics?.messageGrowth || 0)}`}>
              {getChangePrefix(analytics?.messageGrowth || 0)} {Math.abs(analytics?.messageGrowth || 0)}% vs previous period
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Total Users</h3>
              <Users className="text-indigo-300" size={20} />
            </div>
            <p className="text-3xl font-semibold text-slate-100">{analytics?.totalUsers || 0}</p>
            <p className={`text-sm mt-2 ${getChangeColor(analytics?.userGrowth || 0)}`}>
              {getChangePrefix(analytics?.userGrowth || 0)} {Math.abs(analytics?.userGrowth || 0)}% vs previous period
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Avg Response Time</h3>
              <Clock className="text-amber-300" size={20} />
            </div>
            <p className="text-3xl font-semibold text-slate-100">{analytics?.avgResponseTime || 0}s</p>
            <p className={`text-sm mt-2 ${analytics?.responseImprovement < 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
              {analytics?.responseImprovement < 0 ? '↓' : '↑'} {Math.abs(analytics?.responseImprovement || 0)}% change
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-400">Active Agents</h3>
              <TrendingUp className="text-emerald-300" size={20} />
            </div>
            <p className="text-3xl font-semibold text-slate-100">{analytics?.activeAgents || 0}</p>
            <p className={`text-sm mt-2 ${getChangeColor(analytics?.agentGrowth || 0)}`}>
              {getChangePrefix(analytics?.agentGrowth || 0)} {Math.abs(analytics?.agentGrowth || 0)}% vs previous period
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-100">Message Volume</h2>
              <Bot className="text-slate-500" size={18} />
            </div>
            <div className="space-y-4">
              {messageData.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">No volume data available yet.</div>
              ) : messageData.map((data: any, index: number) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-400 w-12">{data.day}</span>
                  <div className="flex-1 bg-slate-900 rounded-full h-8 relative overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full flex items-center justify-end pr-3 transition-all duration-500"
                      style={{ width: `${(data.messages / maxMessages) * 100}%` }}
                    >
                      <span className="text-xs font-semibold text-slate-950">{data.messages}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg font-semibold text-slate-100 mb-6">Top Performing Agents</h2>
            <div className="space-y-4">
              {topAgents.length === 0 ? (
                <div className="py-10 text-center text-slate-500 text-sm">No agent rankings yet.</div>
              ) : topAgents.map((agent: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-900/90 border border-slate-800 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                      <span className="text-cyan-300 font-semibold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100">{agent.name}</h3>
                      <p className="text-sm text-slate-400">{agent.messages} messages</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-300">{agent.rate}%</p>
                    <p className="text-xs text-slate-500">Success Rate</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
          <h2 className="text-lg font-semibold text-slate-100 mb-5">Operational Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Peak Hours</h3>
              <p className="text-2xl font-semibold text-cyan-300">2PM - 5PM</p>
              <p className="text-xs text-slate-500 mt-1">Highest conversation volume</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Total Messages</h3>
              <p className="text-3xl font-semibold text-slate-100">{analytics?.totalMessages || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Messages handled in selected range</p>
            </div>
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Active Conversations</h3>
              <p className="text-3xl font-semibold text-slate-100">{analytics?.activeConversations || 0}</p>
              <p className="text-sm text-slate-500 mt-2">Conversations currently open</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

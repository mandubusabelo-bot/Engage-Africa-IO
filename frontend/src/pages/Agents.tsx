import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Bot, Plus, Edit, Trash2, Power, Settings, MessageSquare, Brain, Zap, BookOpen } from 'lucide-react';
import { api } from '../services/api';
import AgentActionsConfig from '../components/AgentActionsConfig';
import TestAgentChat from '../components/TestAgentChat';
import KnowledgeBasePane from '../components/KnowledgeBasePane';

interface Agent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive';
  messageCount: number;
  responseRate: number;
  knowledgeBase: number;
}

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await api.getAgents();
      if (response.success && response.data) {
        setAgents(response.data.map((a: any) => ({
          id: a.id,
          name: a.name,
          description: a.description || '',
          status: a.status,
          messageCount: a.message_count || 0,
          responseRate: a.response_rate || 0,
          knowledgeBase: a.knowledge_base_count || 0
        })));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newAgent, setNewAgent] = useState({
    name: '',
    description: '',
    instructions: '',
    personality: 'professional',
    language: 'english'
  });
  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [knowledgeFiles, setKnowledgeFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [testingAgent, setTestingAgent] = useState<Agent | null>(null);

  const handleCreateAgent = async () => {
    try {
      setUploading(true);
      const response = await api.createAgent({
        name: newAgent.name,
        description: newAgent.description,
        instructions: newAgent.instructions,
        personality: newAgent.personality,
        language: newAgent.language
      });
      
      if (response.success && knowledgeFiles.length > 0) {
        // Upload knowledge base files
        for (const file of knowledgeFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('agentId', response.data.id);
          
          await api.uploadKnowledge(formData);
        }
      }
      
      await loadAgents();
      setShowCreateModal(false);
      setNewAgent({
        name: '',
        description: '',
        instructions: '',
        personality: 'professional',
        language: 'english'
      });
      setKnowledgeFiles([]);
    } catch (error) {
      console.error('Failed to create agent:', error);
      alert('Failed to create agent. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEditAgent = (agent: any) => {
    setEditingAgent(agent);
    setNewAgent({
      name: agent.name,
      description: agent.description || '',
      instructions: agent.instructions || '',
      personality: agent.personality || 'professional',
      language: agent.language || 'english'
    });
    setShowEditModal(true);
  };

  const handleUpdateAgent = async () => {
    try {
      setUploading(true);
      const response = await api.updateAgent(editingAgent.id, {
        name: newAgent.name,
        description: newAgent.description,
        instructions: newAgent.instructions,
        personality: newAgent.personality,
        language: newAgent.language
      });
      
      if (response.success && knowledgeFiles.length > 0) {
        // Upload new knowledge base files
        for (const file of knowledgeFiles) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('agentId', editingAgent.id);
          
          await api.uploadKnowledge(formData);
        }
      }
      
      await loadAgents();
      setShowEditModal(false);
      setEditingAgent(null);
      setNewAgent({
        name: '',
        description: '',
        instructions: '',
        personality: 'professional',
        language: 'english'
      });
      setKnowledgeFiles([]);
    } catch (error) {
      console.error('Failed to update agent:', error);
    } finally {
      setUploading(false);
    }
  };

  const toggleAgentStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    
    try {
      const newStatus = agent.status === 'active' ? 'inactive' : 'active';
      await api.updateAgent(id, { status: newStatus });
      await loadAgents();
    } catch (error) {
      console.error('Failed to toggle agent status:', error);
      alert('Failed to update agent status.');
    }
  };

  const deleteAgent = async (id: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      try {
        await api.deleteAgent(id);
        await loadAgents();
      } catch (error) {
        console.error('Failed to delete agent:', error);
        alert('Failed to delete agent.');
      }
    }
  };

  return (
    <Layout>
      <div className="flex h-screen">
        <div className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Agents</h1>
            <p className="text-gray-600 mt-1">Create and manage your chatbot agents</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Create New Agent
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Bot className="text-purple-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Total Agents</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{agents.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="text-green-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Active Agents</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {agents.filter(a => a.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="text-blue-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Total Messages</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {agents.reduce((sum, a) => sum + a.messageCount, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="text-yellow-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Avg Response Rate</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {agents.length > 0
                ? `${Math.round(agents.reduce((sum, a) => sum + a.responseRate, 0) / agents.length)}%`
                : '0%'}
            </p>
          </div>
        </div>

        {loading && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Loading agents...
          </div>
        )}

        {/* Agents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {agents.map(agent => (
            <div 
              key={agent.id} 
              className={`bg-white rounded-xl shadow-sm border p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer ${
                selectedAgentId === agent.id ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedAgentId(agent.id)}
            >
              {/* Agent Header */}
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center ${
                    agent.status === 'active' ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <Bot className={agent.status === 'active' ? 'text-purple-600' : 'text-gray-400'} size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">{agent.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      agent.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAgentStatus(agent.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    agent.status === 'active'
                      ? 'bg-green-100 text-green-600 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <Power size={18} />
                </button>
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">{agent.description}</p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Messages</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{agent.messageCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Response Rate</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{agent.responseRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Knowledge</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{agent.knowledgeBase}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-1 sm:gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setTestingAgent(agent);
                  }}
                  className="flex-1 p-1.5 sm:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Test Agent"
                >
                  <MessageSquare size={16} />
                  <span className="text-xs hidden sm:inline">Test</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedAgentId(agent.id);
                    setShowActionsModal(true);
                  }}
                  className="p-1.5 sm:p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Configure Actions"
                >
                  <Settings size={16} />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditAgent(agent);
                  }}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-xs sm:text-sm"
                >
                  <Edit size={12} />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteAgent(agent.id);
                  }}
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs sm:text-sm"
                >
                  <Trash2 size={12} />
                  <span className="hidden sm:inline">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Create New Agent</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    rows={3}
                    placeholder="Describe what this agent does and its purpose..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                  <textarea
                    value={newAgent.instructions || ''}
                    onChange={(e) => setNewAgent({...newAgent, instructions: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    rows={4}
                    placeholder="Give step-by-step instructions on how the agent should behave and respond..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Example: "1. Greet users warmly 2. Ask how you can help 3. Never repeat greetings in the same chat"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
                    <select
                      value={newAgent.personality}
                      onChange={(e) => setNewAgent({...newAgent, personality: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={newAgent.language}
                      onChange={(e) => setNewAgent({...newAgent, language: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    >
                      <option value="english">English</option>
                      <option value="swahili">Swahili</option>
                      <option value="zulu">Zulu</option>
                      <option value="xhosa">Xhosa</option>
                      <option value="afrikaans">Afrikaans</option>
                      <option value="french">French</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Knowledge Base</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-6 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      id="knowledge-upload"
                      multiple
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files) {
                          setKnowledgeFiles(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="knowledge-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-xs sm:text-sm text-gray-600">Click to upload documents</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, TXT, DOC, DOCX</p>
                      </div>
                    </label>
                    {knowledgeFiles.length > 0 && (
                      <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2">
                        {knowledgeFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-purple-50 px-2 sm:px-3 py-1 sm:py-2 rounded">
                            <span className="text-xs sm:text-sm text-gray-700 truncate flex-1 mr-2">{file.name}</span>
                            <button
                              onClick={() => setKnowledgeFiles(knowledgeFiles.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 flex-shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAgent}
                  disabled={!newAgent.name || !newAgent.description || uploading}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {uploading ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Agent Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-4 sm:p-8">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Edit Agent</h2>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Agent Name</label>
                  <input
                    type="text"
                    value={newAgent.name}
                    onChange={(e) => setNewAgent({...newAgent, name: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newAgent.description}
                    onChange={(e) => setNewAgent({...newAgent, description: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    rows={3}
                    placeholder="Describe what this agent does and its purpose..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                  <textarea
                    value={newAgent.instructions || ''}
                    onChange={(e) => setNewAgent({...newAgent, instructions: e.target.value})}
                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    rows={4}
                    placeholder="Give step-by-step instructions on how the agent should behave and respond..."
                  />
                  <p className="text-xs text-gray-500 mt-1">Example: "1. Greet users warmly 2. Ask how you can help 3. Never repeat greetings in the same chat"</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Personality</label>
                    <select
                      value={newAgent.personality}
                      onChange={(e) => setNewAgent({...newAgent, personality: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                      <option value="formal">Formal</option>
                      <option value="empathetic">Empathetic</option>
                      <option value="enthusiastic">Enthusiastic</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={newAgent.language}
                      onChange={(e) => setNewAgent({...newAgent, language: e.target.value})}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none text-sm sm:text-base"
                    >
                      <option value="english">English</option>
                      <option value="swahili">Swahili</option>
                      <option value="zulu">Zulu</option>
                      <option value="xhosa">Xhosa</option>
                      <option value="afrikaans">Afrikaans</option>
                      <option value="french">French</option>
                      <option value="portuguese">Portuguese</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Add More Knowledge Files</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 sm:p-6 text-center hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      id="edit-knowledge-upload"
                      multiple
                      accept=".pdf,.txt,.doc,.docx"
                      onChange={(e) => {
                        if (e.target.files) {
                          setKnowledgeFiles(Array.from(e.target.files));
                        }
                      }}
                      className="hidden"
                    />
                    <label htmlFor="edit-knowledge-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center">
                        <svg className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-xs sm:text-sm text-gray-600">Click to upload additional documents</p>
                        <p className="text-xs text-gray-500 mt-1">PDF, TXT, DOC, DOCX</p>
                      </div>
                    </label>
                    {knowledgeFiles.length > 0 && (
                      <div className="mt-2 sm:mt-4 space-y-1 sm:space-y-2">
                        {knowledgeFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-purple-50 px-2 sm:px-3 py-1 sm:py-2 rounded">
                            <span className="text-xs sm:text-sm text-gray-700 truncate flex-1 mr-2">{file.name}</span>
                            <button
                              onClick={() => setKnowledgeFiles(knowledgeFiles.filter((_, i) => i !== idx))}
                              className="text-red-500 hover:text-red-700 flex-shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-8">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAgent}
                  disabled={!newAgent.name || !newAgent.description || uploading}
                  className="flex-1 px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {uploading ? 'Updating...' : 'Update Agent'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Test Agent Chat Modal */}
        {testingAgent && (
          <TestAgentChat
            agent={testingAgent}
            onClose={() => setTestingAgent(null)}
          />
        )}

        {/* Agent Actions Configuration Modal */}
        {showActionsModal && selectedAgentId && (
          <AgentActionsConfig
            agentId={selectedAgentId}
            onClose={() => {
              setShowActionsModal(false);
              setSelectedAgentId(null);
            }}
          />
        )}
        </div>
        
        {/* Knowledge Base Pane */}
        <div className="w-96 border-l border-gray-200 overflow-hidden">
          {selectedAgentId ? (
            <KnowledgeBasePane agentId={selectedAgentId} />
          ) : (
            <div className="p-6 text-center text-gray-500">
              <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
              <p>Select an agent to view its knowledge base</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

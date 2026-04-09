import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Workflow, Plus, Play, Pause, Copy, Trash2, Edit, MessageSquare, GitBranch } from 'lucide-react';
import { api } from '../services/api';

interface Flow {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'draft' | 'paused';
  triggers: number;
  steps: number;
  conversions: number;
}

export default function Flows() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    try {
      setLoading(true);
      const response = await api.getFlows();
      if (response.success && response.data) {
        setFlows(response.data.map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description || '',
          status: f.status,
          triggers: f.triggers_count || 0,
          steps: f.steps_count || 0,
          conversions: f.conversions_count || 0
        })));
      }
    } catch (error) {
      console.error('Failed to load flows:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFlow, setNewFlow] = useState({
    name: '',
    description: '',
    trigger: 'keyword'
  });

  const handleCreateFlow = async () => {
    try {
      const response = await api.createFlow({
        name: newFlow.name,
        description: newFlow.description,
        trigger_type: newFlow.trigger
      });
      if (response.success) {
        await loadFlows();
        setShowCreateModal(false);
        setNewFlow({ name: '', description: '', trigger: 'keyword' });
      }
    } catch (error) {
      console.error('Failed to create flow:', error);
      alert('Failed to create flow. Please try again.');
    }
  };

  const toggleFlowStatus = async (id: string) => {
    const flow = flows.find(f => f.id === id);
    if (!flow) return;
    
    try {
      const newStatus = flow.status === 'active' ? 'paused' : 'active';
      await api.updateFlow(id, { status: newStatus });
      await loadFlows();
    } catch (error) {
      console.error('Failed to toggle flow status:', error);
      alert('Failed to update flow status.');
    }
  };

  const duplicateFlow = async (id: string) => {
    const flowToDuplicate = flows.find(f => f.id === id);
    if (flowToDuplicate) {
      try {
        await api.createFlow({
          name: `${flowToDuplicate.name} (Copy)`,
          description: flowToDuplicate.description,
          trigger_type: 'keyword'
        });
        await loadFlows();
      } catch (error) {
        console.error('Failed to duplicate flow:', error);
        alert('Failed to duplicate flow.');
      }
    }
  };

  const deleteFlow = async (id: string) => {
    if (confirm('Are you sure you want to delete this flow?')) {
      try {
        await api.deleteFlow(id);
        await loadFlows();
      } catch (error) {
        console.error('Failed to delete flow:', error);
        alert('Failed to delete flow.');
      }
    }
  };

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Conversation Flows</h1>
            <p className="text-gray-600 mt-1">Design automated conversation sequences</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Create New Flow
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Workflow className="text-purple-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Total Flows</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">{flows.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <Play className="text-green-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Active Flows</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {flows.filter(f => f.status === 'active').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="text-blue-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Total Triggers</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {flows.reduce((sum, f) => sum + f.triggers, 0)}
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <GitBranch className="text-yellow-600" size={24} />
              <h3 className="text-sm font-medium text-gray-600">Conversions</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {flows.reduce((sum, f) => sum + f.conversions, 0)}
            </p>
          </div>
        </div>

        {/* Flows List */}
        <div className="space-y-4">
          {flows.map(flow => (
            <div key={flow.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                {/* Flow Info */}
                <div className="flex items-center gap-4 flex-1">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    flow.status === 'active' ? 'bg-purple-100' : 
                    flow.status === 'paused' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <Workflow className={
                      flow.status === 'active' ? 'text-purple-600' : 
                      flow.status === 'paused' ? 'text-yellow-600' : 'text-gray-400'
                    } size={24} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-bold text-gray-900 text-lg">{flow.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        flow.status === 'active' ? 'bg-green-100 text-green-700' : 
                        flow.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {flow.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{flow.description}</p>
                    
                    {/* Stats */}
                    <div className="flex gap-6 mt-3">
                      <div>
                        <span className="text-xs text-gray-500">Triggers: </span>
                        <span className="text-sm font-semibold text-gray-900">{flow.triggers}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Steps: </span>
                        <span className="text-sm font-semibold text-gray-900">{flow.steps}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">Conversions: </span>
                        <span className="text-sm font-semibold text-gray-900">{flow.conversions}</span>
                      </div>
                      {flow.triggers > 0 && (
                        <div>
                          <span className="text-xs text-gray-500">Conv. Rate: </span>
                          <span className="text-sm font-semibold text-green-600">
                            {Math.round((flow.conversions / flow.triggers) * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleFlowStatus(flow.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      flow.status === 'active'
                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-600 hover:bg-green-200'
                    }`}
                    title={flow.status === 'active' ? 'Pause' : 'Activate'}
                  >
                    {flow.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                  </button>
                  <button className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Edit">
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => duplicateFlow(flow.id)}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Duplicate"
                  >
                    <Copy size={18} />
                  </button>
                  <button 
                    onClick={() => deleteFlow(flow.id)}
                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Flow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Flow</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Flow Name</label>
                  <input
                    type="text"
                    value={newFlow.name}
                    onChange={(e) => setNewFlow({...newFlow, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="e.g., Welcome Flow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newFlow.description}
                    onChange={(e) => setNewFlow({...newFlow, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                    rows={3}
                    placeholder="Describe what this flow does..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trigger Type</label>
                  <select
                    value={newFlow.trigger}
                    onChange={(e) => setNewFlow({...newFlow, trigger: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  >
                    <option value="keyword">Keyword Trigger</option>
                    <option value="welcome">Welcome Message</option>
                    <option value="button">Button Click</option>
                    <option value="schedule">Scheduled</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateFlow}
                  disabled={!newFlow.name || !newFlow.description}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Flow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

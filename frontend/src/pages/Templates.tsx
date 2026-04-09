import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { FileText, Plus, Edit, Copy, Trash2, Search } from 'lucide-react';
import { api } from '../services/api';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  usageCount: number;
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data.map((t: any) => ({
          id: t.id,
          name: t.name,
          content: t.content,
          category: t.category,
          usageCount: t.usage_count || 0
        })));
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    content: '',
    category: 'General'
  });

  const handleCreateTemplate = async () => {
    try {
      const response = await api.createTemplate({
        name: newTemplate.name,
        content: newTemplate.content,
        category: newTemplate.category
      });
      if (response.success) {
        await loadTemplates();
        setShowCreateModal(false);
        setNewTemplate({ name: '', content: '', category: 'General' });
      }
    } catch (error) {
      console.error('Failed to create template:', error);
      alert('Failed to create template. Please try again.');
    }
  };

  const duplicateTemplate = async (id: string) => {
    const templateToDuplicate = templates.find(t => t.id === id);
    if (templateToDuplicate) {
      try {
        await api.createTemplate({
          name: `${templateToDuplicate.name} (Copy)`,
          content: templateToDuplicate.content,
          category: templateToDuplicate.category
        });
        await loadTemplates();
      } catch (error) {
        console.error('Failed to duplicate template:', error);
        alert('Failed to duplicate template.');
      }
    }
  };

  const deleteTemplate = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await api.deleteTemplate(id);
        await loadTemplates();
      } catch (error) {
        console.error('Failed to delete template:', error);
        alert('Failed to delete template.');
      }
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Message Templates</h1>
            <p className="text-gray-600 mt-1">Create reusable message templates</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
          >
            <Plus size={20} />
            Create Template
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTemplates.map(template => (
            <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <FileText className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{template.name}</h3>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {template.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-700 font-mono">{template.content}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Usage Count</p>
                  <p className="text-lg font-bold text-gray-900">{template.usageCount}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors">
                  <Edit size={16} />
                  Edit
                </button>
                <button 
                  onClick={() => duplicateTemplate(template.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Copy size={16} />
                </button>
                <button 
                  onClick={() => deleteTemplate(template.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Template Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Template</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                    placeholder="e.g., Welcome Message"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({...newTemplate, category: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
                  >
                    <option value="General">General</option>
                    <option value="Greeting">Greeting</option>
                    <option value="Order">Order</option>
                    <option value="Support">Support</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
                  <textarea
                    value={newTemplate.content}
                    onChange={(e) => setNewTemplate({...newTemplate, content: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none font-mono"
                    rows={5}
                    placeholder="Use {{variable}} for dynamic content..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Tip: Use {'{{'} and {'}'} for variables like {'{'}{'{'} name {'}'}{'}'}
                  </p>
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
                  onClick={handleCreateTemplate}
                  disabled={!newTemplate.name || !newTemplate.content}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

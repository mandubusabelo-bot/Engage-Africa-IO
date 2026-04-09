import { useState, useEffect } from 'react';
import { Settings, X, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';

interface AgentAction {
  id: string;
  action_type: string;
  enabled: boolean;
  conditions: any;
  action_config: any;
  priority: number;
}

interface AgentActionsConfigProps {
  agentId: string;
  onClose: () => void;
}

export default function AgentActionsConfig({ agentId, onClose }: AgentActionsConfigProps) {
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActions();
  }, [agentId]);

  const loadActions = async () => {
    try {
      setLoading(true);
      const response = await api.getAgentActions(agentId);
      if (response.success && response.data) {
        setActions(response.data);
      }
    } catch (error) {
      console.error('Failed to load agent actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAction = async (actionId: string, enabled: boolean) => {
    try {
      await api.updateAgentAction(actionId, { enabled });
      setActions(actions.map(a => a.id === actionId ? { ...a, enabled } : a));
    } catch (error) {
      console.error('Failed to update action:', error);
    }
  };

  const createDefaultActions = async () => {
    const defaultActions = [
      {
        agent_id: agentId,
        action_type: 'close_conversation',
        enabled: true,
        conditions: {
          rules: [
            'If the Contact confirms their issue is resolved and no further help is required, close conversation.',
            'If the Contact has been unresponsive after follow up, close conversation.'
          ]
        },
        action_config: {
          closure_reason: 'Issue resolved by AI'
        },
        priority: 1
      },
      {
        agent_id: agentId,
        action_type: 'assign_to_team',
        enabled: true,
        conditions: {
          rules: [
            'If the issue can\'t be resolved using the Knowledge source → assign to anyone in the workspace.',
            'If the Contact requests for a human, assign to anyone in the Workspace.'
          ]
        },
        action_config: {
          team_name: 'Customer Support'
        },
        priority: 2
      },
      {
        agent_id: agentId,
        action_type: 'update_lifecycle',
        enabled: false,
        conditions: {
          rules: [
            'Contact makes a purchase',
            'Contact shows buying intent'
          ]
        },
        action_config: {
          new_stage: 'customer'
        },
        priority: 3
      },
      {
        agent_id: agentId,
        action_type: 'update_contact_fields',
        enabled: true,
        conditions: {
          rules: [
            'If the contact provides an email, name, or phone number'
          ]
        },
        action_config: {
          fields: ['email', 'name', 'phone']
        },
        priority: 4
      },
      {
        agent_id: agentId,
        action_type: 'update_tags',
        enabled: false,
        conditions: {
          rules: [
            'Add relevant tags based on conversation context'
          ]
        },
        action_config: {
          tags: []
        },
        priority: 5
      },
      {
        agent_id: agentId,
        action_type: 'trigger_workflows',
        enabled: false,
        conditions: {
          rules: [
            'Trigger workflows when specific conditions are met'
          ]
        },
        action_config: {
          workflow_id: null
        },
        priority: 6
      },
      {
        agent_id: agentId,
        action_type: 'add_comments',
        enabled: true,
        conditions: {
          rules: [
            'After every conversation, add a comment with a conversation summary and the next steps to take.'
          ]
        },
        action_config: {
          comment_template: 'Conversation summary: {{summary}}'
        },
        priority: 7
      },
      {
        agent_id: agentId,
        action_type: 'handle_calls',
        enabled: false,
        conditions: {
          rules: [
            'Let the AI Agent answer and manage calls for you'
          ]
        },
        action_config: {
          enabled: false
        },
        priority: 8
      },
      {
        agent_id: agentId,
        action_type: 'make_http_requests',
        enabled: false,
        conditions: {
          rules: [
            'AI Agent can trigger external actions or fetch data via API'
          ]
        },
        action_config: {
          url: '',
          method: 'POST'
        },
        priority: 9
      }
    ];

    try {
      for (const action of defaultActions) {
        await api.createAgentAction(action);
      }
      loadActions();
    } catch (error) {
      console.error('Failed to create default actions:', error);
    }
  };

  const getActionTitle = (type: string) => {
    const titles: Record<string, string> = {
      close_conversation: 'Close conversations',
      assign_to_team: 'Assign to agent or team',
      assign_to_agent: 'Assign to specific agent',
      update_lifecycle: 'Update Lifecycle stages',
      update_contact_fields: 'Update Contact fields',
      update_tags: 'Update tags',
      trigger_workflows: 'Trigger Workflows',
      add_comments: 'Add comments',
      handle_calls: 'Handle calls',
      make_http_requests: 'Make HTTP requests'
    };
    return titles[type] || type;
  };

  const getActionDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      close_conversation: 'AI Agent can close a conversation based on your guidelines.',
      assign_to_team: 'AI Agent can assign the conversation to a human agent, another AI Agent, or a team.',
      assign_to_agent: 'AI Agent can assign to a specific agent.',
      update_lifecycle: 'AI Agent can update a Contact\'s Lifecycle Stage based on the conversation.',
      update_contact_fields: 'AI Agent can automatically update Contact fields based on conversation and guidelines that you define.',
      update_tags: 'AI Agent can add or remove existing tags from a Contact.',
      trigger_workflows: 'AI Agent can trigger existing Workflows and automate conversations.',
      add_comments: 'AI Agent can add internal comments to share quick context with your other agents.',
      handle_calls: 'Let the AI Agent answer and manage calls for you.',
      make_http_requests: 'AI Agent can trigger external actions or fetch data via API. You can add multiple actions.'
    };
    return descriptions[type] || '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <Settings className="text-purple-600" size={20} />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Agent Actions</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <p className="text-gray-600 text-sm sm:text-base mb-4 sm:mb-6">
            Assign actions the AI Agent can take during a conversation. Each action only works if it's enabled. 
            Use the text box to define when the agent should perform the action and what it should do.
          </p>

          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-600 mt-2 sm:mt-4 text-sm sm:text-base">Loading actions...</p>
            </div>
          ) : actions.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Settings className="mx-auto text-gray-400 mb-3 sm:mb-4" size={32} />
              <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">No actions configured yet</p>
              <button
                onClick={createDefaultActions}
                className="px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm sm:text-base"
              >
                <Plus className="inline mr-1 sm:mr-2" size={16} />
                Create Default Actions
              </button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`border rounded-lg p-3 sm:p-6 transition-all ${
                    action.enabled ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-4">
                    <div className="flex-1 pr-2">
                      <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-1">
                        {getActionTitle(action.action_type)}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {getActionDescription(action.action_type)}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={action.enabled}
                        onChange={(e) => toggleAction(action.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 sm:w-11 sm:h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 sm:peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 sm:after:h-5 sm:after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {action.enabled && (
                    <div className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                          When and how should this action be performed?
                        </label>
                        <div className="bg-white border border-gray-300 rounded-lg p-2 sm:p-4">
                          {action.conditions?.rules?.map((rule: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 mb-1 sm:mb-2">
                              <span className="text-gray-500 text-xs sm:text-sm">-</span>
                              <span className="text-gray-700 text-xs sm:text-sm">{rule}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {action.action_type === 'assign_to_team' && action.action_config?.team_name && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            Assign to team:
                          </label>
                          <div className="bg-white border border-gray-300 rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                            <span className="text-gray-700 text-xs sm:text-sm">{action.action_config.team_name}</span>
                          </div>
                        </div>
                      )}

                      {action.action_type === 'update_lifecycle' && action.action_config?.new_stage && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            New lifecycle stage:
                          </label>
                          <div className="bg-white border border-gray-300 rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                            <span className="text-gray-700 capitalize text-xs sm:text-sm">{action.action_config.new_stage}</span>
                          </div>
                        </div>
                      )}

                      {action.action_type === 'update_contact_fields' && action.action_config?.fields && (
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            Fields to update:
                          </label>
                          <div className="bg-white border border-gray-300 rounded-lg px-2 sm:px-4 py-1 sm:py-2">
                            <span className="text-gray-700 text-xs sm:text-sm">{action.action_config.fields.join(', ')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-6 sm:py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors text-sm sm:text-base"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

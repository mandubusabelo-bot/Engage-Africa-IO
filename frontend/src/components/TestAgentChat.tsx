import { useState } from 'react';
import { Send, X, Bot } from 'lucide-react';
import { api } from '../services/api';

interface TestAgentChatProps {
  agent: {
    id: string;
    name: string;
    description: string;
  };
  onClose: () => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  time: string;
}

export default function TestAgentChat({ agent, onClose }: TestAgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hi! I'm ${agent.name}. ${agent.description} How can I help you today?`,
      sender: 'agent',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    const userMessage: Message = {
      id: String(messages.length + 1),
      text: newMessage,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      const response = await api.testAgent(agent.id, newMessage);
      
      if (response.success && response.data) {
        const agentMessage: Message = {
          id: String(messages.length + 2),
          text: response.data.response,
          sender: 'agent',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, agentMessage]);
      }
    } catch (error) {
      console.error('Failed to get agent response:', error);
      const errorMessage: Message = {
        id: String(messages.length + 2),
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'agent',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Bot size={20} />
            </div>
            <div>
              <h3 className="font-bold">{agent.name}</h3>
              <p className="text-xs text-purple-100">Test Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-green-100'
                }`}>
                  {message.time}
                </p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="animate-bounce">●</div>
                  <div className="animate-bounce delay-100">●</div>
                  <div className="animate-bounce delay-200">●</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
              disabled={loading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || loading}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

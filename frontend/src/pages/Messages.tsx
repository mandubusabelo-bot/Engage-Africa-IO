import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Search, Send, Paperclip, Smile, MoreVertical, Phone, Video } from 'lucide-react';
import { api } from '../services/api';

interface Conversation {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  avatar: string;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'agent';
  time: string;
}

export default function Messages() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const response = await api.getMessages();
      if (response.success && response.data) {
        // Group messages by phone number to create conversations
        const messagesByPhone: { [key: string]: any[] } = {};
        
        response.data.forEach((msg: any) => {
          const phone = msg.phone || 'unknown';
          if (!messagesByPhone[phone]) {
            messagesByPhone[phone] = [];
          }
          messagesByPhone[phone].push(msg);
        });

        // Create conversations from grouped messages
        const convos: Conversation[] = Object.entries(messagesByPhone).map(([phone, msgs]) => {
          const lastMsg = msgs[msgs.length - 1];
          // Format phone number for display
          const formattedPhone = phone.replace('@c.us', '').replace(/^\d+/, (match) => 
            match.length > 10 ? `+${match.substring(0, match.length - 10)} ${match.substring(match.length - 10)}` : match
          );
          return {
            id: phone,
            name: formattedPhone,
            lastMessage: lastMsg.content.substring(0, 50),
            time: new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: 0,
            avatar: formattedPhone.substring(0, 2).toUpperCase()
          };
        });

        setConversations(convos);
        if (convos.length > 0 && !selectedConversation) {
          setSelectedConversation(convos[0].id);
          loadConversationMessages(convos[0].id, messagesByPhone[convos[0].id]);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationMessages = (phone: string, msgs: any[]) => {
    const formattedMessages: Message[] = msgs.map(msg => ({
      id: msg.id,
      text: msg.content,
      // Fix: 'user' messages should be on right, 'bot' messages on left
      sender: msg.sender === 'bot' ? 'agent' : 'user',
      time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }));
    setMessages(formattedMessages);
  };

  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      try {
        // Send message via WhatsApp
        await api.sendWhatsAppMessage(selectedConversation, newMessage);
        
        // Add to local state
        const message: Message = {
          id: String(messages.length + 1),
          text: newMessage,
          sender: 'agent',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...messages, message]);
        setNewMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
        alert('Failed to send message. Please try again.');
      }
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentConversation = conversations.find(c => c.id === selectedConversation);

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Conversations List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map(conv => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation === conv.id ? 'bg-purple-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                      <span className="text-xs text-gray-500">{conv.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {conv.unread}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {currentConversation?.avatar}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">{currentConversation?.name}</h2>
                  <p className="text-xs text-green-600">Active now</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video size={20} className="text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical size={20} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                  <p>{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-blue-100' : 'text-green-100'
                  }`}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <div className="bg-white border-t border-gray-200 p-4">
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Paperclip size={20} className="text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Smile size={20} className="text-gray-600" />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

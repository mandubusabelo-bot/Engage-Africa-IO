import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bot, 
  Workflow, 
  BarChart3, 
  FileText, 
  Settings,
  LogOut,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/agents', icon: Bot, label: 'Agents' },
    { path: '/flows', icon: Workflow, label: 'Flows' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/templates', icon: FileText, label: 'Templates' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-gradient-to-b from-indigo-600 via-purple-600 to-pink-600 shadow-2xl transition-all duration-300 flex flex-col relative overflow-hidden`}>
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
        
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/20 relative z-10">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                <Zap className="text-purple-600" size={24} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Engage Africa</h1>
                <p className="text-xs text-purple-200">AI Platform</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg mx-auto">
              <Zap className="text-purple-600" size={24} />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-white/20 rounded-lg transition-all text-white"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 relative z-10">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-white text-purple-600 shadow-lg transform scale-105'
                    : 'text-white hover:bg-white/20 hover:translate-x-1'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-purple-600' : 'text-white group-hover:scale-110 transition-transform'} />
                {sidebarOpen && <span className="font-semibold">{item.label}</span>}
                {isActive && sidebarOpen && (
                  <div className="ml-auto w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-white/20 relative z-10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-white/20 w-full transition-all hover:translate-x-1 group"
          >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {sidebarOpen && <span className="font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-transparent">
        {children}
      </main>
    </div>
  );
}

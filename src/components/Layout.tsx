'use client'

import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
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
  Bell,
  Search,
  Eye,
  EyeOff,
} from 'lucide-react'
import Image from 'next/image'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showLogo, setShowLogo] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSidebarOpen(window.innerWidth >= 1024)
      setShowLogo(localStorage.getItem('showBrandLogo') !== 'false')
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const toggleLogoVisibility = () => {
    const next = !showLogo
    setShowLogo(next)
    localStorage.setItem('showBrandLogo', String(next))
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/messages', icon: MessageSquare, label: 'Messages' },
    { path: '/agents', icon: Bot, label: 'Agents' },
    { path: '/flows', icon: Workflow, label: 'Flows' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/templates', icon: FileText, label: 'Templates' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <div className="flex h-screen bg-[#070b14] text-slate-100">
      <aside
        className={`${sidebarOpen ? 'w-72' : 'w-20'} border-r border-slate-800 bg-[#0b1220] transition-all duration-300 flex flex-col`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 min-w-0">
              {showLogo && (
                <Image 
                  src="/engage-africa-logo.png" 
                  alt="Engage Africa IO" 
                  width={40} 
                  height={40}
                  className="rounded-lg ring-1 ring-slate-700" 
                />
              )}
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-slate-100 truncate">Engage Africa IO</h1>
                <p className="text-[11px] text-slate-400">Unified Ops Console</p>
              </div>
            </div>
          ) : (
            showLogo ? (
              <Image 
                src="/engage-africa-logo.png" 
                alt="Engage Africa IO" 
                width={36} 
                height={36}
                className="rounded-lg ring-1 ring-slate-700 mx-auto" 
              />
            ) : (
              <div className="h-9 w-9 mx-auto rounded-lg border border-slate-700 bg-slate-900" />
            )
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={18} />
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <header className="h-16 border-b border-slate-800 bg-[#0a101c] px-6 flex items-center justify-between">
          <div className="relative w-80 max-w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search conversations, agents, workflows..."
              className="w-full rounded-lg border border-slate-700 bg-[#0f1727] pl-9 pr-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleLogoVisibility}
              className="p-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
              title={showLogo ? 'Hide logo' : 'Show logo'}
            >
              {showLogo ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button className="p-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800">
              <Bell size={16} />
            </button>
            <div className="h-8 w-8 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200 text-xs font-semibold flex items-center justify-center">
              EA
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#111a2d_0%,#070b14_55%)]">{children}</div>
      </main>
    </div>
  )
}

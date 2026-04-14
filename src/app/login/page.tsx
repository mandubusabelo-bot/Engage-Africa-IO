'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showLogo, setShowLogo] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowLogo(localStorage.getItem('showBrandLogo') !== 'false')
    }
  }, [])

  const toggleLogo = () => {
    const next = !showLogo
    setShowLogo(next)
    localStorage.setItem('showBrandLogo', String(next))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      localStorage.setItem('token', data.session?.access_token || '')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#111a2d_0%,#070b14_55%)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/70 shadow-2xl p-5 sm:p-8">
        <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-100 truncate">Engage Africa IO</h1>
              <p className="text-slate-400 text-sm">Sign in to continue</p>
            </div>
          </div>
          <button
            onClick={toggleLogo}
            className="p-2 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800"
            title={showLogo ? 'Hide logo' : 'Show logo'}
          >
            {showLogo ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/40 focus:outline-none"
              required
              placeholder="Enter your email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-700 bg-slate-900 rounded-lg text-slate-100 placeholder:text-slate-500 focus:ring-2 focus:ring-cyan-500/40 focus:outline-none"
              required
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 text-slate-950 py-3 rounded-lg font-semibold hover:bg-cyan-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-cyan-300 hover:text-cyan-200 font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

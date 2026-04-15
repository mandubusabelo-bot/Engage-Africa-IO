import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070b14] flex items-center justify-center text-slate-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-cyan-400 mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-slate-400 mb-6">The page you are looking for does not exist.</p>
        <Link href="/dashboard" className="bg-cyan-500 text-slate-950 px-6 py-2.5 rounded-lg font-semibold hover:bg-cyan-400 transition-colors">
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}

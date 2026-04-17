'use client'

interface InlineToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

const typeStyles: Record<NonNullable<InlineToastProps['type']>, string> = {
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  error: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
  info: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200'
}

export default function InlineToast({ message, type = 'info', onClose }: InlineToastProps) {
  return (
    <div className={`fixed right-4 top-4 z-[100] max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${typeStyles[type]}`}>
      <div className="flex items-start gap-3">
        <p className="flex-1 leading-5">{message}</p>
        <button
          onClick={onClose}
          className="text-slate-300 hover:text-white"
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  )
}

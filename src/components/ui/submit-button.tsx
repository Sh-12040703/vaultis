'use client'

import { useFormStatus } from 'react-dom'

export function SubmitButton({ label, loadingLabel }: {
  label: string
  loadingLabel?: string
}) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex items-center gap-2 font-semibold px-6 py-2.5 rounded-lg transition-all text-sm ${
        pending
          ? 'bg-blue-500/50 text-white/70 cursor-not-allowed'
          : 'bg-blue-500 hover:bg-blue-600 text-white'
      }`}
    >
      {pending && (
        <svg
          className="animate-spin w-4 h-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12" cy="12" r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {pending ? (loadingLabel || 'Saving...') : label}
    </button>
  )
}
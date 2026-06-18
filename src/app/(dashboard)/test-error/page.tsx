'use client'

import * as Sentry from '@sentry/nextjs'

export default function TestErrorPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-white text-2xl font-bold">Sentry Test</h1>

      <button
        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg block"
        onClick={() => {
          Sentry.captureException(new Error('Test error from Vaultis — Sentry is working!'))
          alert('Error sent to Sentry! Check your dashboard.')
        }}
      >
        Send Test Error to Sentry
      </button>

      <button
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg block"
        onClick={() => {
          Sentry.captureMessage('Test message from Vaultis', 'warning')
          alert('Message sent to Sentry!')
        }}
      >
        Send Test Message to Sentry
      </button>
    </div>
  )
}
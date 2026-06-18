'use client'

export default function TestErrorPage() {
  return (
    <div className="p-8">
      <h1 className="text-white text-2xl font-bold mb-6">Sentry Test</h1>
      <button
        className="bg-red-500 hover:bg-red-600 text-white font-semibold px-6 py-3 rounded-lg"
        onClick={() => {
          throw new Error('Test error from Vaultis — Sentry is working!')
        }}
      >
        Trigger Test Error
      </button>
    </div>
  )
}
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950">
      <div className="text-center space-y-6 px-4">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="text-white text-3xl font-bold tracking-tight">Vaultis</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
          The Operating System for<br />
          <span className="text-blue-400">Indian Insurance Professionals</span>
        </h1>

        {/* Subheadline */}
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          Manage clients, track renewals, reconcile commissions, and grow your book of business — all in one place.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/sign-up"
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Start Free
          </Link>
          <Link
            href="/sign-in"
            className="border border-slate-600 hover:border-slate-400 text-slate-300 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Trust line */}
        <p className="text-slate-600 text-sm pt-4">
          Built for IRDAI-licensed agents and brokers · DPDPA compliant
        </p>

      </div>
    </main>
  )
}
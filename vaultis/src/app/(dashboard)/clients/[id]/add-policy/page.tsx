import { getOrCreateAgent } from '@/lib/actions/agent'
import { addPolicy } from '@/lib/actions/policies'
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const INSURERS = [
  'LIC of India',
  'HDFC Ergo',
  'Bajaj Allianz',
  'Star Health',
  'ICICI Lombard',
  'New India Assurance',
  'SBI General',
  'Tata AIG',
  'Reliance General',
  'United India Insurance',
  'Care Health Insurance',
  'Niva Bupa',
  'Digit Insurance',
  'Acko Insurance',
  'Other',
]

const POLICY_TYPES = [
  { value: 'health',     label: 'Health Insurance' },
  { value: 'motor',      label: 'Motor Insurance' },
  { value: 'life',       label: 'Life Insurance' },
  { value: 'term',       label: 'Term Insurance' },
  { value: 'commercial', label: 'Commercial / SME' },
  { value: 'travel',     label: 'Travel Insurance' },
  { value: 'home',       label: 'Home Insurance' },
  { value: 'other',      label: 'Other' },
]

export default async function AddPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Verify client belongs to this agent
  const clientRows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.agentId, agent.id)))
    .limit(1)

  if (clientRows.length === 0) notFound()
  const client = clientRows[0]

  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/clients/${client.id}`}
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {client.name}
        </Link>
        <h1 className="text-2xl font-bold text-white">Add Policy</h1>
        <p className="text-slate-400 text-sm mt-1">
          Adding policy for <span className="text-white font-medium">{client.name}</span>
        </p>
      </div>

      <form action={addPolicy} className="space-y-5">

        {/* Hidden client ID */}
        <input type="hidden" name="clientId" value={client.id} />

        {/* Policy Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Policy Details
          </h2>

          {/* Policy Number */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Policy Number <span className="text-red-400">*</span>
            </label>
            <input
              name="policyNumber"
              type="text"
              required
              placeholder="P/211221/01/2024/000123"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
            />
          </div>

          {/* Insurer */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Insurance Company <span className="text-red-400">*</span>
            </label>
            <select
              name="insurer"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="" className="text-slate-500">Select insurer...</option>
              {INSURERS.map(ins => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>

          {/* Policy Type */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Policy Type <span className="text-red-400">*</span>
            </label>
            <select
              name="type"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select type...</option>
              {POLICY_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Financial Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Financial Details
          </h2>

          {/* Premium */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Annual Premium (₹) <span className="text-red-400">*</span>
            </label>
            <input
              name="premium"
              type="number"
              required
              min="1"
              placeholder="25000"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Sum Insured */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Sum Insured (₹)
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              name="sumInsured"
              type="number"
              min="1"
              placeholder="500000"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

        </div>

        {/* Policy Dates */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Policy Dates
          </h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Start Date
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </label>
              <input
                name="startDate"
                type="date"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Expiry Date */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Expiry Date <span className="text-red-400">*</span>
              </label>
              <input
                name="expiryDate"
                type="date"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Helper text */}
          <p className="text-slate-500 text-xs">
            Renewal reminders will be sent automatically 60, 30, 15, 7, and 3 days before expiry.
          </p>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Save Policy
          </button>
          <Link
            href={`/clients/${client.id}`}
            className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </Link>
        </div>

      </form>
    </div>
  )
}
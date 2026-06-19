import { getOrCreateAgent } from '@/lib/actions/agent'
import { addCommission } from '@/lib/actions/commissions'
import { db } from '@/lib/db'
import { policies, clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const FY_YEARS = ['2025-26', '2026-27', '2027-28']
const QUARTERS = ['Q1 (Apr-Jun)', 'Q2 (Jul-Sep)', 'Q3 (Oct-Dec)', 'Q4 (Jan-Mar)']

export default async function NewCommissionPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Get all agent's policies for the dropdown
  const agentPolicies = await db
    .select({
      id:           policies.id,
      policyNumber: policies.policyNumber,
      insurer:      policies.insurer,
      type:         policies.type,
      clientName:   clients.name,
    })
    .from(policies)
    .innerJoin(clients, eq(policies.clientId, clients.id))
    .where(eq(policies.agentId, agent.id))
    .orderBy(clients.name)

  return (
    <div className="p-8 max-w-2xl">

      {/* Header */}
      <div className="mb-8">
        <Link
          href="/commissions"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Commissions
        </Link>
        <h1 className="text-2xl font-bold text-white">Log Commission</h1>
        <p className="text-slate-400 text-sm mt-1">
          Record what you expected vs what the insurer actually paid
        </p>
      </div>

      {agentPolicies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <p className="text-white font-medium">No policies found</p>
          <p className="text-slate-500 text-sm">
            Add a client and policy first before logging commissions
          </p>
          <Link
            href="/clients"
            className="inline-flex bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Go to Clients
          </Link>
        </div>
      ) : (
        <form action={addCommission} className="space-y-5">

          {/* Policy Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
              Select Policy
            </h2>

            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Policy <span className="text-red-400">*</span>
              </label>
              <select
                name="policyId"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select a policy...</option>
                {agentPolicies.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.clientName} — {p.policyNumber} ({p.insurer})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Commission Amounts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
              Commission Details
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 text-sm font-medium">
                  Expected (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  name="expectedAmt"
                  type="number"
                  step="0.01"
                  required
                  placeholder="13500"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-slate-600 text-xs">What you should have received</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 text-sm font-medium">
                  Received (₹) <span className="text-red-400">*</span>
                </label>
                <input
                  name="receivedAmt"
                  type="number"
                  step="0.01"
                  required
                  placeholder="11200"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-slate-600 text-xs">What insurer actually paid</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                TDS Deducted (₹)
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </label>
              <input
                name="tdsDeducted"
                type="number"
                step="0.01"
                placeholder="1350"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
              <p className="text-slate-600 text-xs">
                TDS deducted under Section 194D — tracked for your ITR
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Payment Date <span className="text-red-400">*</span>
              </label>
              <input
                name="paymentDate"
                type="date"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Financial Year */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
              Financial Year
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-slate-300 text-sm font-medium">FY Year</label>
                <select
                  name="fyYear"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {FY_YEARS.map(y => (
                    <option key={y} value={y}>FY {y}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 text-sm font-medium">Quarter</label>
                <select
                  name="quarter"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                >
                  {QUARTERS.map(q => (
                    <option key={q} value={q.split(' ')[0]}>{q}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-slate-600 text-xs">
              Auto-calculated from payment date. Change only if needed.
            </p>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              Save Commission Entry
            </button>
            <Link
              href="/commissions"
              className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition-colors text-sm font-medium"
            >
              Cancel
            </Link>
          </div>

        </form>
      )}

    </div>
  )
}
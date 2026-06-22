import { getOrCreateAgent } from '@/lib/actions/agent'
import { addClaim } from '@/lib/actions/claims'
import { db } from '@/lib/db'
import { policies, clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SubmitButton } from '@/components/ui/submit-button'

export default async function NewClaimPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

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

      <div className="mb-8">
        <Link
          href="/claims"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Claims
        </Link>
        <h1 className="text-2xl font-bold text-white">Log New Claim</h1>
        <p className="text-slate-400 text-sm mt-1">
          Record a client's claim — track it from intimation to settlement
        </p>
      </div>

      <form action={addClaim} className="space-y-5">

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">
            Claim Details
          </h2>

          {/* Policy */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Policy <span className="text-red-400">*</span>
            </label>
            <select
              name="policyId"
              required
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Select policy...</option>
              {agentPolicies.map(p => (
                <option key={p.id} value={p.id}>
                  {p.clientName} — {p.policyNumber} ({p.insurer})
                </option>
              ))}
            </select>
          </div>

          {/* Incident Date */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Incident Date
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <input
              name="incidentDate"
              type="date"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Claim Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Describe what happened — e.g. Client was hospitalized for dengue fever on 15 June. Admitted to Apollo Hospital, Pune. Total bill expected ₹85,000."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
            <p className="text-slate-600 text-xs">
              Be specific — this description is used for Gemini claim pre-check and email drafting
            </p>
          </div>

        </div>

        <div className="flex gap-3">
          <SubmitButton label="Log Claim" loadingLabel="Saving..." />
          <Link
            href="/claims"
            className="px-6 py-3 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 rounded-lg transition-colors text-sm font-medium"
          >
            Cancel
          </Link>
        </div>

      </form>
    </div>
  )
}
import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { policies, clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { FileText, FilePlus } from 'lucide-react'

function StatusBadge({ expiryDate }: { expiryDate: string }) {
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  if (expiryDate < today) return (
    <span className="bg-red-500/10 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full">
      Expired
    </span>
  )
  if (expiryDate <= in30) return (
    <span className="bg-amber-500/10 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full">
      Expiring Soon
    </span>
  )
  return (
    <span className="bg-green-500/10 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
      Active
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    health:     'bg-blue-500/10 text-blue-400',
    motor:      'bg-purple-500/10 text-purple-400',
    life:       'bg-teal-500/10 text-teal-400',
    term:       'bg-indigo-500/10 text-indigo-400',
    commercial: 'bg-orange-500/10 text-orange-400',
    travel:     'bg-pink-500/10 text-pink-400',
    home:       'bg-yellow-500/10 text-yellow-400',
    other:      'bg-slate-500/10 text-slate-400',
  }
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${colors[type] ?? colors.other}`}>
      {type}
    </span>
  )
}

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; insurer?: string }>
}) {
  const { type, insurer } = await searchParams
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Get all policies with client name
  const allPolicies = await db
    .select({
      id:           policies.id,
      policyNumber: policies.policyNumber,
      insurer:      policies.insurer,
      type:         policies.type,
      premium:      policies.premium,
      sumInsured:   policies.sumInsured,
      startDate:    policies.startDate,
      expiryDate:   policies.expiryDate,
      status:       policies.status,
      clientId:     clients.id,
      clientName:   clients.name,
      clientPhone:  clients.phone,
    })
    .from(policies)
    .innerJoin(clients, eq(policies.clientId, clients.id))
    .where(eq(policies.agentId, agent.id))
    .orderBy(policies.expiryDate)

  // Filter by type if provided
  const filtered = allPolicies.filter(p => {
    if (type && p.type !== type) return false
    if (insurer && p.insurer !== insurer) return false
    return true
  })

  // Get unique types and insurers for filter buttons
  const uniqueTypes = [...new Set(allPolicies.map(p => p.type))]
  const uniqueInsurers = [...new Set(allPolicies.map(p => p.insurer))]

  // Summary stats
  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]
  const totalPremium = allPolicies.reduce((sum, p) => sum + Number(p.premium || 0), 0)
  const activeCount = allPolicies.filter(p => p.expiryDate >= today).length
  const expiringSoonCount = allPolicies.filter(p => p.expiryDate >= today && p.expiryDate <= in30).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Policies</h1>
          <p className="text-slate-400 text-sm mt-1">
            All policies across your entire client book
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Total Policies</div>
          <div className="text-2xl font-bold text-white">{allPolicies.length}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Active</div>
          <div className="text-2xl font-bold text-green-400">{activeCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Expiring Soon</div>
          <div className="text-2xl font-bold text-amber-400">{expiringSoonCount}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Total Premium</div>
          <div className="text-2xl font-bold text-white">
            ₹{totalPremium.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* Filters */}
      {allPolicies.length > 0 && (
        <div className="space-y-3">

          {/* Type filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">Type:</span>
            <Link
              href="/policies"
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                !type
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              All
            </Link>
            {uniqueTypes.map(t => (
              <Link
                key={t}
                href={`/policies?type=${t}${insurer ? `&insurer=${insurer}` : ''}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors capitalize ${
                  type === t
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                {t}
              </Link>
            ))}
          </div>

          {/* Insurer filters */}
          {uniqueInsurers.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">Insurer:</span>
              <Link
                href={`/policies${type ? `?type=${type}` : ''}`}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  !insurer
                    ? 'bg-blue-500 border-blue-500 text-white'
                    : 'border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
              >
                All
              </Link>
              {uniqueInsurers.map(ins => (
                <Link
                  key={ins}
                  href={`/policies?insurer=${encodeURIComponent(ins)}${type ? `&type=${type}` : ''}`}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    insurer === ins
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'border-slate-700 text-slate-400 hover:border-slate-500'
                  }`}
                >
                  {ins}
                </Link>
              ))}
            </div>
          )}

        </div>
      )}

      {/* Empty state */}
      {allPolicies.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-white font-medium">No policies yet</p>
          <p className="text-slate-500 text-sm">
            Add a client and upload their policies to get started
          </p>
          <Link
            href="/clients"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Go to Clients
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">No policies match this filter</p>
          <Link href="/policies" className="text-blue-400 text-sm mt-2 inline-block hover:text-blue-300">
            Clear filters
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop table ────────────────────────────────── */}
          <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <span className="text-slate-400 text-sm">
                Showing {filtered.length} of {allPolicies.length} policies
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Client', 'Policy No.', 'Insurer', 'Type', 'Premium', 'Sum Insured', 'Expiry', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filtered.map((policy) => (
                    <tr
                      key={policy.id}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/clients/${policy.clientId}`}
                          className="text-white text-sm font-medium hover:text-blue-400 transition-colors"
                        >
                          {policy.clientName}
                        </Link>
                        <div className="text-slate-500 text-xs">{policy.clientPhone}</div>
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-xs font-mono">
                        {policy.policyNumber}
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-sm">
                        {policy.insurer}
                      </td>
                      <td className="px-5 py-3">
                        <TypeBadge type={policy.type} />
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-sm font-medium">
                        ₹{Number(policy.premium).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-sm">
                        {policy.sumInsured
                          ? `₹${Number(policy.sumInsured).toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-300 text-sm">
                          {new Date(policy.expiryDate).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge expiryDate={policy.expiryDate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ────────────────────────────────── */}
          <div className="sm:hidden space-y-4">
            <div className="text-slate-400 text-sm px-1">
              Showing {filtered.length} of {allPolicies.length} policies
            </div>
            {filtered.map((policy) => (
              <div
                key={policy.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/clients/${policy.clientId}`}
                      className="text-white font-medium hover:text-blue-400 transition-colors"
                    >
                      {policy.clientName}
                    </Link>
                    <div className="text-slate-400 text-xs font-mono mt-0.5">
                      {policy.policyNumber}
                    </div>
                  </div>
                  <StatusBadge expiryDate={policy.expiryDate} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span><span className="text-slate-500">Insurer:</span> {policy.insurer}</span>
                  <TypeBadge type={policy.type} />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-xs uppercase tracking-wider">
                      Premium
                    </div>
                    <div className="text-white font-bold text-lg">
                      ₹{Number(policy.premium).toLocaleString('en-IN')}
                    </div>
                    {policy.sumInsured && (
                      <div className="text-slate-400 text-xs mt-0.5">
                        SI: ₹{Number(policy.sumInsured).toLocaleString('en-IN')}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-xs uppercase tracking-wider">
                      Expiry
                    </div>
                    <div className="text-slate-300 text-sm font-medium">
                      {new Date(policy.expiryDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
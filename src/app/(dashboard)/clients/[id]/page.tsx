import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { clients, policies } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Phone, Mail, MapPin, FilePlus, Calendar } from 'lucide-react'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Get client — must belong to this agent
  const clientRows = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.agentId, agent.id)))
    .limit(1)

  if (clientRows.length === 0) notFound()
  const client = clientRows[0]

  // Get all policies for this client
  const clientPolicies = await db
    .select()
    .from(policies)
    .where(eq(policies.clientId, client.id))
    .orderBy(policies.expiryDate)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">

      {/* Back */}
      <Link
        href="/clients"
        className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back to Clients</span>
      </Link>

      {/* Client Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-blue-400 text-xl font-bold">
                {client.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{client.name}</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Client since {new Date(client.createdAt!).toLocaleDateString('en-IN', {
                  month: 'long', year: 'numeric'
                })}
              </p>
            </div>
          </div>
          <Link
            href={`/clients/${client.id}/add-policy`}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <FilePlus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Policy</span>
          </Link>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <Phone className="w-4 h-4 text-slate-500" />
            {client.phone}
          </div>
          {client.email && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Mail className="w-4 h-4 text-slate-500" />
              {client.email}
            </div>
          )}
          {client.dob && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Calendar className="w-4 h-4 text-slate-500" />
              DOB: {new Date(client.dob).toLocaleDateString('en-IN')}
            </div>
          )}
          {client.address && (
            <div className="flex items-center gap-2 text-slate-300 text-sm sm:col-span-3">
              <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {client.address}
            </div>
          )}
        </div>
      </div>

      {/* Policies */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Policies</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {clientPolicies.length} {clientPolicies.length === 1 ? 'policy' : 'policies'}
            </p>
          </div>
        </div>

        {clientPolicies.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-slate-500 text-sm">No policies added yet</p>
            <Link
              href={`/clients/${client.id}/add-policy`}
              className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              <FilePlus className="w-4 h-4" />
              Add First Policy
            </Link>
          </div>
        ) : (
          <>
            {/* ── Desktop table ────────────────────────────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Policy No.', 'Insurer', 'Type', 'Premium', 'Sum Insured', 'Expiry', 'Status'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {clientPolicies.map((policy) => {
                    const isExpired = policy.expiryDate < today
                    const daysLeft = Math.ceil(
                      (new Date(policy.expiryDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24)
                    )
                    const isExpiringSoon = !isExpired && daysLeft <= 30

                    return (
                      <tr key={policy.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="px-5 py-3 text-slate-300 text-sm font-mono">
                          {policy.policyNumber}
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-sm">{policy.insurer}</td>
                        <td className="px-5 py-3">
                          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-md capitalize">
                            {policy.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-sm">
                          ₹{Number(policy.premium).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-sm">
                          ₹{Number(policy.sumInsured).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-300 text-sm">{policy.expiryDate}</div>
                          {isExpired ? (
                            <div className="text-red-400 text-xs mt-0.5">Expired</div>
                          ) : isExpiringSoon ? (
                            <div className="text-amber-400 text-xs mt-0.5">{daysLeft} days left</div>
                          ) : (
                            <div className="text-slate-500 text-xs mt-0.5">{daysLeft} days left</div>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                            isExpired
                              ? 'bg-red-500/10 text-red-400'
                              : isExpiringSoon
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-green-500/10 text-green-400'
                          }`}>
                            {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Mobile cards ────────────────────────────────── */}
            <div className="sm:hidden p-4 space-y-4">
              {clientPolicies.map((policy) => {
                const isExpired = policy.expiryDate < today
                const daysLeft = Math.ceil(
                  (new Date(policy.expiryDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
                )
                const isExpiringSoon = !isExpired && daysLeft <= 30

                return (
                  <div
                    key={policy.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-medium">{policy.policyNumber}</div>
                        <div className="text-slate-400 text-xs">{policy.insurer}</div>
                      </div>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        isExpired
                          ? 'bg-red-500/10 text-red-400'
                          : isExpiringSoon
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {isExpired ? 'Expired' : isExpiringSoon ? 'Expiring Soon' : 'Active'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                      <span><span className="text-slate-500">Type:</span> {policy.type}</span>
                      <span><span className="text-slate-500">Premium:</span> ₹{Number(policy.premium).toLocaleString('en-IN')}</span>
                      {policy.sumInsured && (
                        <span><span className="text-slate-500">SI:</span> ₹{Number(policy.sumInsured).toLocaleString('en-IN')}</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">Expiry</div>
                        <div className="text-slate-300 text-sm">{policy.expiryDate}</div>
                      </div>
                      <div className="text-right">
                        {isExpired ? (
                          <div className="text-red-400 text-xs font-semibold">Expired</div>
                        ) : isExpiringSoon ? (
                          <div className="text-amber-400 text-xs font-semibold">{daysLeft} days left</div>
                        ) : (
                          <div className="text-slate-400 text-xs">{daysLeft} days left</div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
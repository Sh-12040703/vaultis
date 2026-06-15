import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { clients, policies } from '@/lib/db/schema'
import { eq, count, lte, gte, and } from 'drizzle-orm'
import { Users, FileText, AlertTriangle, IndianRupee } from 'lucide-react'

export default async function DashboardPage() {
  const agent = await getOrCreateAgent()

  if (!agent) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-lg">
          <h2 className="text-white font-semibold text-lg mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-400 text-sm">
            Could not load your account. Please sign out and sign in again.
          </p>
        </div>
      </div>
    )
  }

  // Dates
  const today = new Date().toISOString().split('T')[0]
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0]

  // Counts
  const [totalClients] = await db
    .select({ count: count() })
    .from(clients)
    .where(eq(clients.agentId, agent.id))

  const [totalPolicies] = await db
    .select({ count: count() })
    .from(policies)
    .where(eq(policies.agentId, agent.id))

  const [expiringCount] = await db
    .select({ count: count() })
    .from(policies)
    .where(
      and(
        eq(policies.agentId, agent.id),
        gte(policies.expiryDate, today),
        lte(policies.expiryDate, in30Days)
      )
    )

  // Expiring policies with client name
  const expiringSoon = await db
    .select({
      id:           policies.id,
      policyNumber: policies.policyNumber,
      insurer:      policies.insurer,
      type:         policies.type,
      premium:      policies.premium,
      expiryDate:   policies.expiryDate,
      clientName:   clients.name,
      clientPhone:  clients.phone,
    })
    .from(policies)
    .innerJoin(clients, eq(policies.clientId, clients.id))
    .where(
      and(
        eq(policies.agentId, agent.id),
        gte(policies.expiryDate, today),
        lte(policies.expiryDate, in30Days)
      )
    )
    .orderBy(policies.expiryDate)
    .limit(10)

  const stats = [
    {
      label: 'Total Clients',
      value: totalClients.count.toString(),
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Active Policies',
      value: totalPolicies.count.toString(),
      icon: FileText,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      label: 'Expiring in 30 Days',
      value: expiringCount.count.toString(),
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Commissions',
      value: '₹0',
      icon: IndianRupee,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ]

  return (
    <div className="p-8 space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good morning, {agent.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Here&apos;s what&apos;s happening with your book today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-900 border border-slate-800 rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">{stat.label}</span>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Expiring Soon */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-white font-semibold">Expiring in Next 30 Days</h2>
          <p className="text-slate-400 text-xs mt-1">
            Policies that need renewal action now
          </p>
        </div>

        {expiringSoon.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-slate-500 text-sm">
              No policies expiring in the next 30 days.
            </p>
            <p className="text-slate-600 text-xs">
              Add your first client to get started →
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Client', 'Policy No.', 'Insurer', 'Type', 'Premium', 'Expiry'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {expiringSoon.map((policy) => {
                  const daysLeft = Math.ceil(
                    (new Date(policy.expiryDate).getTime() - Date.now()) /
                    (1000 * 60 * 60 * 24)
                  )
                  return (
                    <tr key={policy.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="text-white text-sm font-medium">{policy.clientName}</div>
                        <div className="text-slate-500 text-xs">{policy.clientPhone}</div>
                      </td>
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
                      <td className="px-5 py-3">
                        <div className="text-slate-300 text-sm">{policy.expiryDate}</div>
                        <div className={`text-xs mt-0.5 ${
                          daysLeft <= 7
                            ? 'text-red-400'
                            : daysLeft <= 15
                            ? 'text-amber-400'
                            : 'text-slate-500'
                        }`}>
                          {daysLeft} days left
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
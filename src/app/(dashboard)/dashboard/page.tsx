import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { clients, policies, renewals, commissions, rateCards } from '@/lib/db/schema'
import { eq, count, lte, gte, and, isNull, sum } from 'drizzle-orm'
import { Users, FileText, AlertTriangle, IndianRupee, TrendingUp, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

  const today = new Date().toISOString().split('T')[0]
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const in60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Current FY
  const now = new Date()
  const currentFY = now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`

  // ── Core counts ──────────────────────────────────────────
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
        lte(policies.expiryDate, in30)
      )
    )

  // ── Total premium under management ───────────────────────
  const [premiumSum] = await db
    .select({ total: sum(policies.premium) })
    .from(policies)
    .where(
      and(
        eq(policies.agentId, agent.id),
        gte(policies.expiryDate, today)
      )
    )

  const totalPremium = Number(premiumSum?.total || 0)

  // ── TDS this FY ──────────────────────────────────────────
  const [tdsSum] = await db
    .select({ total: sum(commissions.tdsDeducted) })
    .from(commissions)
    .where(
      and(
        eq(commissions.agentId, agent.id),
        eq(commissions.fyYear, currentFY)
      )
    )

  const totalTDS = Number(tdsSum?.total || 0)

  // ── Commission received this FY ───────────────────────────
  const [commSum] = await db
    .select({ total: sum(commissions.receivedAmt) })
    .from(commissions)
    .where(
      and(
        eq(commissions.agentId, agent.id),
        eq(commissions.fyYear, currentFY)
      )
    )

  const totalCommission = Number(commSum?.total || 0)

  // ── Income forecast — pending renewals × rate cards ──────
  // Get all renewals due in next 60 days that are still pending
  const pendingRenewals = await db
    .select({
      amount: renewals.amount,
      insurer: policies.insurer,
      productType: policies.type,
    })
    .from(renewals)
    .innerJoin(policies, eq(renewals.policyId, policies.id))
    .where(
      and(
        eq(policies.agentId, agent.id),
        eq(renewals.status, 'pending'),
        gte(renewals.dueDate, today),
        lte(renewals.dueDate, in60)
      )
    )

  // Get agent's rate cards
  const agentRates = await db
    .select()
    .from(rateCards)
    .where(
      and(
        eq(rateCards.agentId, agent.id),
        isNull(rateCards.effectiveTo)
      )
    )

  // Calculate forecast per pending renewal
  let forecastTotal = 0
  let forecastCount = 0

  for (const renewal of pendingRenewals) {
    const premium = Number(renewal.amount || 0)
    if (premium === 0) continue

    // Find matching rate card
    const rateCard = agentRates.find(
      r => r.insurer === renewal.insurer &&
        r.productType === renewal.productType
    ) || agentRates.find(
      r => r.productType === renewal.productType
    )

    const rate = rateCard ? Number(rateCard.ratePct) : 0

    if (rate > 0) {
      forecastTotal += Math.round((premium * rate) / 100)
      forecastCount++
    }
  }

  // ── Expiring soon table ───────────────────────────────────
  const expiringSoon = await db
    .select({
      id: policies.id,
      policyNumber: policies.policyNumber,
      insurer: policies.insurer,
      type: policies.type,
      premium: policies.premium,
      expiryDate: policies.expiryDate,
      clientName: clients.name,
      clientPhone: clients.phone,
    })
    .from(policies)
    .innerJoin(clients, eq(policies.clientId, clients.id))
    .where(
      and(
        eq(policies.agentId, agent.id),
        gte(policies.expiryDate, today),
        lte(policies.expiryDate, in30)
      )
    )
    .orderBy(policies.expiryDate)
    .limit(10)

  // ── Greeting ─────────────────────────────────────────────
  const hour = now.getHours()
  const greeting = hour < 12
    ? 'Good morning'
    : hour < 17
      ? 'Good afternoon'
      : 'Good evening'

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {greeting}, {agent.name.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Here&apos;s your book at a glance · FY {currentFY}
          </p>
        </div>
        {expiringCount.count > 0 && (
          <Link
            href="/renewals"
            className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-500/20 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {expiringCount.count} policies expiring this month
          </Link>
        )}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Clients</span>
            <div className="bg-blue-500/10 p-1.5 rounded-lg">
              <Users className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalClients.count}</div>
          <Link href="/clients" className="text-blue-400 text-xs mt-1 inline-block hover:text-blue-300">
            View all →
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Policies</span>
            <div className="bg-green-500/10 p-1.5 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">{totalPolicies.count}</div>
          <Link href="/policies" className="text-green-400 text-xs mt-1 inline-block hover:text-green-300">
            View all →
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Commission FY</span>
            <div className="bg-purple-500/10 p-1.5 rounded-lg">
              <IndianRupee className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ₹{totalCommission.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <Link href="/commissions" className="text-purple-400 text-xs mt-1 inline-block hover:text-purple-300">
            View ledger →
          </Link>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Book Value</span>
            <div className="bg-teal-500/10 p-1.5 rounded-lg">
              <BookOpen className="w-3.5 h-3.5 text-teal-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ₹{(totalPremium / 100000).toFixed(1)}L
          </div>
          <div className="text-slate-500 text-xs mt-1">Active premium managed</div>
        </div>
      </div>

      {/* Income Forecast + TDS row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Income Forecast */}
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
                Income Forecast
              </div>
              <div className="text-white text-sm">Next 60 days</div>
            </div>
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <TrendingUp className="w-4 h-4 text-blue-400" />
            </div>
          </div>

          {forecastTotal > 0 ? (
            <>
              <div className="text-3xl font-bold text-white mb-1">
                ₹{forecastTotal.toLocaleString('en-IN')}
              </div>
              <div className="text-slate-400 text-xs">
                From {forecastCount} pending renewal{forecastCount !== 1 ? 's' : ''} with rate cards set
              </div>
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <div className="text-slate-400 text-xs">
                  {pendingRenewals.length - forecastCount > 0 && (
                    <span className="text-amber-400">
                      +{pendingRenewals.length - forecastCount} renewals without rate cards
                      — add rate cards to include them
                    </span>
                  )}
                  {pendingRenewals.length === 0 && (
                    <span>No pending renewals in next 60 days</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-600">₹—</div>
              <div className="text-slate-500 text-xs">
                {pendingRenewals.length === 0
                  ? 'No pending renewals in next 60 days'
                  : `${pendingRenewals.length} pending renewals — add rate cards to forecast income`}
              </div>
              {pendingRenewals.length > 0 && (
                <Link
                  href="/commissions/rate-cards"
                  className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
                >
                  Set up rate cards →
                </Link>
              )}
            </div>
          )}
        </div>

        {/* TDS This FY */}
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">
                TDS Deducted
              </div>
              <div className="text-white text-sm">FY {currentFY}</div>
            </div>
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <IndianRupee className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          {totalTDS > 0 ? (
            <>
              <div className="text-3xl font-bold text-white mb-1">
                ₹{totalTDS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <div className="text-slate-400 text-xs">
                Under Section 194D — claim in your ITR
              </div>
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <Link
                  href="/commissions/tds-export"
                  className="text-purple-400 text-xs hover:text-purple-300 transition-colors"
                >
                  Download TDS report for CA →
                </Link>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-slate-600">₹0</div>
              <div className="text-slate-500 text-xs">
                No TDS recorded this financial year yet
              </div>
              <Link
                href="/commissions/reconcile"
                className="text-purple-400 text-xs hover:text-purple-300 transition-colors"
              >
                Reconcile a statement →
              </Link>
            </div>
          )}
        </div>

      </div>

      {/* Expiring Soon Table */}
      {/* ── Expiring Soon ─────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold">Expiring in Next 30 Days</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Policies that need renewal action now
            </p>
          </div>
          {expiringCount.count > 0 && (
            <Link
              href="/renewals"
              className="text-blue-400 text-xs hover:text-blue-300 transition-colors"
            >
              View all renewals →
            </Link>
          )}
        </div>

        {/* ── Desktop table ────────────────────────────────────── */}
        <div className="hidden sm:block">
          {expiringSoon.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <p className="text-slate-500 text-sm">
                No policies expiring in the next 30 days
              </p>
              <p className="text-slate-600 text-xs">
                Add clients and policies to see renewal alerts here
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
                          <Link href={`/clients/${policy.id}`}>
                            <div className="text-white text-sm font-medium hover:text-blue-400 transition-colors">
                              {policy.clientName}
                            </div>
                            <div className="text-slate-500 text-xs">{policy.clientPhone}</div>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-xs font-mono">
                          {policy.policyNumber}
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-sm">
                          {policy.insurer}
                        </td>
                        <td className="px-5 py-3">
                          <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded-md capitalize">
                            {policy.type}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-300 text-sm font-medium">
                          ₹{Number(policy.premium).toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-300 text-sm">
                            {new Date(policy.expiryDate).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </div>
                          <div className={`text-xs mt-0.5 ${daysLeft <= 7
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

        {/* ── Mobile cards ────────────────────────────────────── */}
        <div className="sm:hidden">
          {expiringSoon.length === 0 ? (
            <div className="p-6 text-center space-y-2">
              <p className="text-slate-500 text-sm">
                No policies expiring in the next 30 days
              </p>
              <p className="text-slate-600 text-xs">
                Add clients and policies to see renewal alerts here
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {expiringSoon.map((policy) => {
                const daysLeft = Math.ceil(
                  (new Date(policy.expiryDate).getTime() - Date.now()) /
                  (1000 * 60 * 60 * 24)
                )
                return (
                  <div
                    key={policy.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-white font-medium">
                          {policy.clientName}
                        </div>
                        <div className="text-slate-400 text-xs font-mono">
                          {policy.policyNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold ${daysLeft <= 7
                            ? 'text-red-400'
                            : daysLeft <= 15
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}>
                          {daysLeft} DAYS LEFT
                        </div>
                        <div className="text-slate-500 text-xs">
                          {new Date(policy.expiryDate).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-slate-400 text-xs uppercase tracking-wider">
                          Premium
                        </div>
                        <div className="text-white font-bold text-lg">
                          ₹{Number(policy.premium).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <Link
                        href={`/renewals?policy=${policy.id}`}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        Renew Now
                      </Link>
                    </div>
                  </div>
                )
              })}
              <Link
                href="/renewals"
                className="block text-center text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors"
              >
                See all {expiringCount.count} expiring policies →
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
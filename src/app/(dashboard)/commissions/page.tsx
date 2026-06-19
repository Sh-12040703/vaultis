import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { commissions, policies, clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import {
  IndianRupee,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
} from 'lucide-react'

function StatusBadge({ status }: { status: string }) {
  if (status === 'matched') return (
    <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
      <CheckCircle className="w-3 h-3" />
      Matched
    </span>
  )
  if (status === 'short') return (
    <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
      <AlertCircle className="w-3 h-3" />
      Short Paid
    </span>
  )
  if (status === 'disputed') return (
    <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
      <AlertCircle className="w-3 h-3" />
      Disputed
    </span>
  )
  return (
    <span className="flex items-center gap-1.5 bg-slate-500/10 text-slate-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
      Pending
    </span>
  )
}

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>
}) {
  const { fy } = await searchParams
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Get all commissions with policy and client info
  const allCommissions = await db
    .select({
      id:           commissions.id,
      expectedAmt:  commissions.expectedAmt,
      receivedAmt:  commissions.receivedAmt,
      tdsDeducted:  commissions.tdsDeducted,
      paymentDate:  commissions.paymentDate,
      fyYear:       commissions.fyYear,
      quarter:      commissions.quarter,
      status:       commissions.status,
      policyNumber: policies.policyNumber,
      insurer:      policies.insurer,
      type:         policies.type,
      clientName:   clients.name,
    })
    .from(commissions)
    .innerJoin(policies, eq(commissions.policyId, policies.id))
    .innerJoin(clients, eq(policies.clientId, clients.id))
    .where(eq(commissions.agentId, agent.id))
    .orderBy(commissions.paymentDate)

  // Get unique FY years for filter
  const uniqueFYs = [...new Set(allCommissions.map(c => c.fyYear).filter(Boolean))]

  // Filter by FY if selected
  const filtered = fy
    ? allCommissions.filter(c => c.fyYear === fy)
    : allCommissions

  // Summary calculations
  const totalExpected = filtered.reduce((s, c) => s + Number(c.expectedAmt || 0), 0)
  const totalReceived = filtered.reduce((s, c) => s + Number(c.receivedAmt || 0), 0)
  const totalTDS      = filtered.reduce((s, c) => s + Number(c.tdsDeducted || 0), 0)
  const totalShort    = totalExpected - totalReceived
  const shortCount    = filtered.filter(c => c.status === 'short').length

  // Current FY default
  const now = new Date()
  const currentFY = now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Commissions</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track every rupee — expected, received, and disputed
          </p>
        </div>
        <Link
          href="/commissions/new"
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Log Commission
        </Link>
      </div>

      {/* FY Filter */}
      {uniqueFYs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-500 text-xs uppercase tracking-wider font-medium">
            Financial Year:
          </span>
          <Link
            href="/commissions"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !fy
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-slate-700 text-slate-400 hover:border-slate-500'
            }`}
          >
            All Years
          </Link>
          {uniqueFYs.map(year => (
            <Link
              key={year}
              href={`/commissions?fy=${year}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                fy === year
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              FY {year}
            </Link>
          ))}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Expected</span>
            <div className="bg-blue-500/10 p-1.5 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ₹{totalExpected.toLocaleString('en-IN')}
          </div>
          <div className="text-slate-500 text-xs mt-1">Total commission earned</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Received</span>
            <div className="bg-green-500/10 p-1.5 rounded-lg">
              <IndianRupee className="w-3.5 h-3.5 text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-400">
            ₹{totalReceived.toLocaleString('en-IN')}
          </div>
          <div className="text-slate-500 text-xs mt-1">Actually paid by insurers</div>
        </div>

        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Short Paid</span>
            <div className="bg-red-500/10 p-1.5 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400">
            ₹{totalShort > 0 ? totalShort.toLocaleString('en-IN') : '0'}
          </div>
          <div className="text-slate-500 text-xs mt-1">
            {shortCount} {shortCount === 1 ? 'entry' : 'entries'} underpaid
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-slate-400 text-xs uppercase tracking-wider">TDS Deducted</span>
            <div className="bg-purple-500/10 p-1.5 rounded-lg">
              <IndianRupee className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-400">
            ₹{totalTDS.toLocaleString('en-IN')}
          </div>
          <div className="text-slate-500 text-xs mt-1">
            Available for ITR filing
          </div>
        </div>
      </div>

      {/* TDS Summary Box — shown when data exists */}
      {totalTDS > 0 && (
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-white font-semibold text-sm">
                TDS Summary — FY {fy || currentFY}
              </h3>
              <p className="text-slate-400 text-xs mt-1">
                Total TDS deducted by insurers this financial year.
                Share this with your CA for ITR filing.
              </p>
            </div>
            <div className="text-right">
              <div className="text-purple-400 font-bold text-xl">
                ₹{totalTDS.toLocaleString('en-IN')}
              </div>
              <div className="text-slate-500 text-xs">under Section 194D</div>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {allCommissions.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <IndianRupee className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-white font-medium">No commissions logged yet</p>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Log your first commission entry to start tracking what insurers
            owe you vs what they actually pay
          </p>
          <Link
            href="/commissions/new"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log First Commission
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm">No commissions for this financial year</p>
          <Link href="/commissions" className="text-blue-400 text-sm mt-2 inline-block">
            View all years
          </Link>
        </div>
      ) : (

        /* Commission Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Policy', 'Client', 'Insurer', 'Expected', 'Received', 'TDS', 'Difference', 'Date', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtered.map((commission) => {
                  const expected = Number(commission.expectedAmt || 0)
                  const received = Number(commission.receivedAmt || 0)
                  const diff = expected - received
                  return (
                    <tr key={commission.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-5 py-3 text-slate-300 text-xs font-mono">
                        {commission.policyNumber}
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-sm">
                        {commission.clientName}
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-sm">
                        {commission.insurer}
                      </td>
                      <td className="px-5 py-3 text-slate-300 text-sm font-medium">
                        ₹{expected.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3 text-green-400 text-sm font-medium">
                        ₹{received.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3 text-purple-400 text-sm">
                        {Number(commission.tdsDeducted) > 0
                          ? `₹${Number(commission.tdsDeducted).toLocaleString('en-IN')}`
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        {Math.abs(diff) < 1 ? (
                          <span className="text-slate-500 text-sm">—</span>
                        ) : diff > 0 ? (
                          <span className="text-red-400 text-sm font-semibold">
                            -₹{diff.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-green-400 text-sm">
                            +₹{Math.abs(diff).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-sm">
                        {commission.paymentDate
                          ? new Date(commission.paymentDate).toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })
                          : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={commission.status ?? 'pending'} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
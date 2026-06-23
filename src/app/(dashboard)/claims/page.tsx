import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { claims, policies, clients } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Plus, FileCheck, Clock, XCircle, CheckCircle, AlertCircle } from 'lucide-react'

const STATUS_CONFIG: Record<string, {
  label: string
  color: string
  bg: string
  icon: React.ReactNode
}> = {
  draft: {
    label: 'Draft',
    color: 'text-slate-400',
    bg: 'bg-slate-500/10',
    icon: <Clock className="w-3 h-3" />,
  },
  intimated: {
    label: 'Intimated',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    icon: <FileCheck className="w-3 h-3" />,
  },
  documents_submitted: {
    label: 'Docs Submitted',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    icon: <Clock className="w-3 h-3" />,
  },
  under_review: {
    label: 'Under Review',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    icon: <AlertCircle className="w-3 h-3" />,
  },
  approved: {
    label: 'Approved',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    label: 'Rejected',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    icon: <XCircle className="w-3 h-3" />,
  },
  settled: {
    label: 'Settled',
    color: 'text-teal-400',
    bg: 'bg-teal-500/10',
    icon: <CheckCircle className="w-3 h-3" />,
  },
}

function ClaimStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full w-fit ${config.bg} ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

export default async function ClaimsPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

  const allClaims = await db
    .select({
      id:           claims.id,
      status:       claims.status,
      incidentDate: claims.incidentDate,
      description:  claims.description,
      createdAt:    claims.createdAt,
      policyNumber: policies.policyNumber,
      insurer:      policies.insurer,
      type:         policies.type,
      clientName:   clients.name,
      clientPhone:  clients.phone,
    })
    .from(claims)
    .innerJoin(policies, eq(claims.policyId, policies.id))
    .innerJoin(clients, eq(claims.clientId, clients.id))
    .where(eq(policies.agentId, agent.id))
    .orderBy(claims.createdAt)

  // Status counts
  const active   = allClaims.filter(c =>
    !['settled', 'rejected'].includes(c.status ?? 'draft')
  ).length
  const settled  = allClaims.filter(c => c.status === 'settled').length
  const rejected = allClaims.filter(c => c.status === 'rejected').length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Claims</h1>
          <p className="text-slate-400 text-sm mt-1">
            Track every claim from intimation to settlement
          </p>
        </div>
        <Link
          href="/claims/new"
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Log Claim</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Active Claims</div>
          <div className="text-2xl font-bold text-white">{active}</div>
        </div>
        <div className="bg-slate-900 border border-green-500/20 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Settled</div>
          <div className="text-2xl font-bold text-green-400">{settled}</div>
        </div>
        <div className="bg-slate-900 border border-red-500/20 rounded-xl p-4">
          <div className="text-slate-400 text-xs mb-1">Rejected</div>
          <div className="text-2xl font-bold text-red-400">{rejected}</div>
        </div>
      </div>

      {/* Empty state */}
      {allClaims.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <FileCheck className="w-5 h-5 text-slate-500" />
          </div>
          <p className="text-white font-medium">No claims logged yet</p>
          <p className="text-slate-500 text-sm">
            When a client needs to file a claim, log it here to track from start to settlement
          </p>
          <Link
            href="/claims/new"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Log First Claim
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop table ────────────────────────────────── */}
          <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Client', 'Policy', 'Insurer', 'Incident Date', 'Description', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {allClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-white text-sm font-medium">{claim.clientName}</div>
                      <div className="text-slate-500 text-xs">{claim.clientPhone}</div>
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-xs font-mono">
                      {claim.policyNumber}
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-sm">
                      {claim.insurer}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-sm">
                      {claim.incidentDate
                        ? new Date(claim.incidentDate).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-300 text-sm max-w-xs">
                      <p className="truncate">{claim.description}</p>
                    </td>
                    <td className="px-5 py-3">
                      <ClaimStatusBadge status={claim.status ?? 'draft'} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/claims/${claim.id}`}
                        className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ────────────────────────────────── */}
          <div className="sm:hidden space-y-4">
            {allClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-white font-medium">{claim.clientName}</div>
                    <div className="text-slate-400 text-xs font-mono">{claim.policyNumber}</div>
                  </div>
                  <ClaimStatusBadge status={claim.status ?? 'draft'} />
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                  <span><span className="text-slate-500">Insurer:</span> {claim.insurer}</span>
                  {claim.incidentDate && (
                    <span>
                      <span className="text-slate-500">Incident:</span>{' '}
                      {new Date(claim.incidentDate).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  )}
                </div>

                {claim.description && (
                  <p className="text-slate-400 text-xs line-clamp-2">{claim.description}</p>
                )}

                <Link
                  href={`/claims/${claim.id}`}
                  className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors"
                >
                  View Details
                </Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
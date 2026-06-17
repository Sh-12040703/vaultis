import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { renewals, policies, clients } from '@/lib/db/schema'
import { eq, and, gte, lte, or } from 'drizzle-orm'
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

// Status badge component
function StatusBadge({ status }: { status: string }) {
    if (status === 'paid') return (
        <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
            <CheckCircle className="w-3 h-3" />
            Renewed
        </span>
    )
    if (status === 'lapsed') return (
        <span className="flex items-center gap-1.5 bg-red-500/10 text-red-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
            <AlertTriangle className="w-3 h-3" />
            Lapsed
        </span>
    )
    return (
        <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full w-fit">
            <Clock className="w-3 h-3" />
            Pending
        </span>
    )
}

// Days left badge
function DaysLeftBadge({ daysLeft }: { daysLeft: number }) {
    if (daysLeft < 0) return (
        <div className="text-red-400 text-sm font-semibold">Overdue</div>
    )
    if (daysLeft === 0) return (
        <div className="text-red-400 text-sm font-semibold">Today</div>
    )
    if (daysLeft <= 7) return (
        <div className="text-red-400 text-sm font-semibold">{daysLeft}d left</div>
    )
    if (daysLeft <= 30) return (
        <div className="text-amber-400 text-sm font-semibold">{daysLeft}d left</div>
    )
    return (
        <div className="text-slate-400 text-sm">{daysLeft}d left</div>
    )
}

export default async function RenewalsPage() {
    const agent = await getOrCreateAgent()
    if (!agent) return null

    const today = new Date().toISOString().split('T')[0]
    const in90Days = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0]

    // Get all renewals for this agent's policies in next 90 days
    // plus any overdue ones
    // Get ALL pending renewals for this agent — no date cutoff
    const upcomingRenewals = await db
        .select({
            renewalId: renewals.id,
            renewalStatus: renewals.status,
            dueDate: renewals.dueDate,
            amount: renewals.amount,
            remindersSent: renewals.remindersSent,
            policyId: policies.id,
            policyNumber: policies.policyNumber,
            insurer: policies.insurer,
            type: policies.type,
            clientId: clients.id,
            clientName: clients.name,
            clientPhone: clients.phone,
            clientEmail: clients.email,
        })
        .from(renewals)
        .innerJoin(policies, eq(renewals.policyId, policies.id))
        .innerJoin(clients, eq(policies.clientId, clients.id))
        .where(eq(policies.agentId, agent.id))
        .orderBy(renewals.dueDate)

    // Separate into buckets
    const overdue = upcomingRenewals.filter(r =>
        r.dueDate < today && r.renewalStatus === 'pending'
    )

    const thisWeek = upcomingRenewals.filter(r => {
        const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0]
        return r.dueDate >= today && r.dueDate <= in7
    })

    const thisMonth = upcomingRenewals.filter(r => {
        const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0]
        const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0]
        return r.dueDate > in7 && r.dueDate <= in30
    })

    const next90 = upcomingRenewals.filter(r => {
        const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0]
        const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0]
        return r.dueDate > in30 && r.dueDate <= in90
    })

    const future = upcomingRenewals.filter(r => {
        const in90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0]
        return r.dueDate > in90
    })

    // Total premium at risk (pending renewals only)
    const premiumAtRisk = upcomingRenewals
        .filter(r => r.renewalStatus === 'pending')
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)

    const RenewalTable = ({ items, title, emptyMsg }: {
        items: typeof upcomingRenewals,
        title: string,
        emptyMsg: string
    }) => (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">{title}</h2>
                <span className="bg-slate-800 text-slate-400 text-xs px-2.5 py-1 rounded-full">
                    {items.length}
                </span>
            </div>
            {items.length === 0 ? (
                <div className="px-5 py-8 text-center">
                    <p className="text-slate-600 text-sm">{emptyMsg}</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-800">
                                {['Client', 'Policy', 'Insurer', 'Premium', 'Due Date', 'Status', ''].map(h => (
                                    <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {items.map((renewal) => {
                                const daysLeft = Math.ceil(
                                    (new Date(renewal.dueDate).getTime() - Date.now()) /
                                    (1000 * 60 * 60 * 24)
                                )
                                return (
                                    <tr key={renewal.renewalId} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <div className="text-white text-sm font-medium">{renewal.clientName}</div>
                                            <div className="text-slate-500 text-xs">{renewal.clientPhone}</div>
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-slate-300 text-xs font-mono">{renewal.policyNumber}</div>
                                            <div className="text-slate-500 text-xs capitalize mt-0.5">{renewal.type}</div>
                                        </td>
                                        <td className="px-5 py-3 text-slate-300 text-sm">{renewal.insurer}</td>
                                        <td className="px-5 py-3 text-slate-300 text-sm font-medium">
                                            ₹{Number(renewal.amount).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-5 py-3">
                                            <div className="text-slate-300 text-sm">
                                                {new Date(renewal.dueDate).toLocaleDateString('en-IN', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                            </div>
                                            <DaysLeftBadge daysLeft={daysLeft} />
                                        </td>
                                        <td className="px-5 py-3">
                                            <StatusBadge status={renewal.renewalStatus ?? 'pending'} />
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg transition-colors font-medium">
                                                Remind
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )

    return (
        <div className="p-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Renewals</h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Track and manage all upcoming policy renewals
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-red-500/20 rounded-xl p-5">
                    <div className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        Overdue
                    </div>
                    <div className="text-3xl font-bold text-white">{overdue.length}</div>
                    <div className="text-slate-500 text-xs mt-1">Need immediate action</div>
                </div>
                <div className="bg-slate-900 border border-amber-500/20 rounded-xl p-5">
                    <div className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        Due This Week
                    </div>
                    <div className="text-3xl font-bold text-white">{thisWeek.length}</div>
                    <div className="text-slate-500 text-xs mt-1">In the next 7 days</div>
                </div>
                <div className="bg-slate-900 border border-blue-500/20 rounded-xl p-5">
                    <div className="text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        Premium at Risk
                    </div>
                    <div className="text-3xl font-bold text-white">
                        ₹{premiumAtRisk.toLocaleString('en-IN')}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">Pending renewals total</div>
                </div>
            </div>

            {/* Empty state — no renewals at all */}
            {upcomingRenewals.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                        <RefreshCw className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-white font-medium">No renewals in the next 90 days</p>
                    <p className="text-slate-500 text-sm">
                        Add policies with expiry dates to see them here
                    </p>
                </div>
            )}

            {/* Overdue */}
            {overdue.length > 0 && (
                <RenewalTable
                    items={overdue}
                    title="⚠ Overdue — Act Now"
                    emptyMsg=""
                />
            )}

            {/* This Week */}
            <RenewalTable
                items={thisWeek}
                title="Due This Week"
                emptyMsg="No renewals due this week"
            />

            {/* This Month */}
            <RenewalTable
                items={thisMonth}
                title="Due This Month"
                emptyMsg="No renewals due this month"
            />

            {/* Later */}
            {next90.length > 0 && (
                <RenewalTable
                    items={next90}
                    title="Coming Up (30–90 days)"
                    emptyMsg=""
                />
            )}


            {/* Future renewals — beyond 90 days */}
            {future.length > 0 && (
                <RenewalTable
                    items={future}
                    title="Future Renewals (90+ days)"
                    emptyMsg=""
                />
            )}

        </div>
    )
}
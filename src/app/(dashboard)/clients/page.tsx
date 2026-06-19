import { getOrCreateAgent } from '@/lib/actions/agent'
import { db } from '@/lib/db'
import { clients, policies } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'
import Link from 'next/link'
import { UserPlus, Phone, Mail, FileSpreadsheet } from 'lucide-react'

export default async function ClientsPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Get all clients with their policy count
  const allClients = await db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      createdAt: clients.createdAt,
      policyCount: count(policies.id),
    })
    .from(clients)
    .leftJoin(policies, eq(policies.clientId, clients.id))
    .where(eq(clients.agentId, agent.id))
    .groupBy(clients.id)
    .orderBy(clients.createdAt)

  return (
    <div className="p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-slate-400 text-sm mt-1">
            {allClients.length} client{allClients.length !== 1 ? 's' : ''} in your book
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/clients/import"
            className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </Link>
          <Link
            href="/clients/new"
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Client
          </Link>
        </div>
      </div>

      {/* Empty state */}
      {allClients.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
            <UserPlus className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-white font-medium">No clients yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Add your first client to start managing their policies
            </p>
          </div>
          <Link
            href="/clients/new"
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add First Client
          </Link>
        </div>
      ) : (
        /* Clients Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {['Name', 'Phone', 'Email', 'Policies', 'Added', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {allClients.map((client) => (
                <tr key={client.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-xs font-bold">
                          {client.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white text-sm font-medium">{client.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {client.phone}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {client.email ? (
                      <div className="flex items-center gap-1.5 text-slate-300 text-sm">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {client.email}
                      </div>
                    ) : (
                      <span className="text-slate-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className="bg-slate-800 text-slate-300 text-xs font-medium px-2.5 py-1 rounded-full">
                      {client.policyCount} {client.policyCount === 1 ? 'policy' : 'policies'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 text-sm">
                    {new Date(client.createdAt!).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/clients/${client.id}`}
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
      )}

    </div>
  )
}
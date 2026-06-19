import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { agents, clients, policies } from '@/lib/db/schema'
import { eq, or, ilike, and } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = req.nextUrl.searchParams.get('q')?.trim()
    if (!query || query.length < 2) {
      return NextResponse.json({ clients: [], policies: [] })
    }

    // Get agent
    const agentRows = await db
      .select()
      .from(agents)
      .where(eq(agents.clerkId, userId))
      .limit(1)

    if (agentRows.length === 0) {
      return NextResponse.json({ clients: [], policies: [] })
    }

    const agent = agentRows[0]
    const search = `%${query}%`

    // Search clients
    const matchedClients = await db
      .select({
        id:    clients.id,
        name:  clients.name,
        phone: clients.phone,
        email: clients.email,
      })
      .from(clients)
      .where(
        and(
          eq(clients.agentId, agent.id),
          or(
            ilike(clients.name,  search),
            ilike(clients.phone, search),
            ilike(clients.email, search),
          )
        )
      )
      .limit(5)

    // Search policies
    const matchedPolicies = await db
      .select({
        id:           policies.id,
        policyNumber: policies.policyNumber,
        insurer:      policies.insurer,
        type:         policies.type,
        clientId:     clients.id,
        clientName:   clients.name,
      })
      .from(policies)
      .innerJoin(clients, eq(policies.clientId, clients.id))
      .where(
        and(
          eq(policies.agentId, agent.id),
          or(
            ilike(policies.policyNumber, search),
            ilike(policies.insurer,      search),
            ilike(policies.type,         search),
            ilike(clients.name,          search),
          )
        )
      )
      .limit(5)

    return NextResponse.json({
      clients:  matchedClients,
      policies: matchedPolicies,
    })

  } catch (err) {
    console.error('Search error:', err)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
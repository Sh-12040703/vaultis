import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { claims, policies, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const result = await db
      .select({
        id:           claims.id,
        status:       claims.status,
        incidentDate: claims.incidentDate,
        description:  claims.description,
        predicted:    claims.predicted,
        createdAt:    claims.createdAt,
        policyNumber: policies.policyNumber,
        insurer:      policies.insurer,
        type:         policies.type,
        premium:      policies.premium,
        sumInsured:   policies.sumInsured,
        clientName:   clients.name,
        clientPhone:  clients.phone,
        clientId:     clients.id,
      })
      .from(claims)
      .innerJoin(policies, eq(claims.policyId, policies.id))
      .innerJoin(clients, eq(claims.clientId, clients.id))
      .where(eq(claims.id, id))
      .limit(1)

    if (result.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(result[0])

  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
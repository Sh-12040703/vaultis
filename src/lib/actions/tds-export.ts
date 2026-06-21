'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { commissions, policies, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export type TDSSummary = {
  fyYear:        string
  insurer:       string
  policyNumber:  string
  clientName:    string
  expectedAmt:   string
  receivedAmt:   string
  tdsDeducted:   string
  paymentDate:   string | null
  quarter:       string | null
}

export async function getTDSSummary(fyYear?: string): Promise<{
  rows:         TDSSummary[]
  totalTDS:     number
  totalExpected: number
  totalReceived: number
  fyYear:       string
}> {
  const agent = await getOrCreateAgent()
  if (!agent) return {
    rows: [], totalTDS: 0,
    totalExpected: 0, totalReceived: 0, fyYear: ''
  }

  // Default to current FY
  const now = new Date()
  const currentFY = now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`

  const selectedFY = fyYear || currentFY

  const rows = await db
    .select({
      fyYear:       commissions.fyYear,
      quarter:      commissions.quarter,
      expectedAmt:  commissions.expectedAmt,
      receivedAmt:  commissions.receivedAmt,
      tdsDeducted:  commissions.tdsDeducted,
      paymentDate:  commissions.paymentDate,
      policyNumber: policies.policyNumber,
      insurer:      policies.insurer,
      clientName:   clients.name,
    })
    .from(commissions)
    .innerJoin(policies, eq(commissions.policyId, policies.id))
    .innerJoin(clients, eq(policies.clientId, clients.id))
    .where(
      and(
        eq(commissions.agentId, agent.id),
        eq(commissions.fyYear,  selectedFY)
      )
    )
    .orderBy(commissions.paymentDate)

  const totalTDS      = rows.reduce((s, r) => s + Number(r.tdsDeducted  || 0), 0)
  const totalExpected = rows.reduce((s, r) => s + Number(r.expectedAmt  || 0), 0)
  const totalReceived = rows.reduce((s, r) => s + Number(r.receivedAmt  || 0), 0)

  return {
    rows: rows.map(r => ({
      fyYear:       r.fyYear       ?? selectedFY,
      insurer:      r.insurer,
      policyNumber: r.policyNumber,
      clientName:   r.clientName,
      expectedAmt:  r.expectedAmt  ?? '0',
      receivedAmt:  r.receivedAmt  ?? '0',
      tdsDeducted:  r.tdsDeducted  ?? '0',
      paymentDate:  r.paymentDate,
      quarter:      r.quarter,
    })),
    totalTDS,
    totalExpected,
    totalReceived,
    fyYear: selectedFY,
  }
}

export async function getAvailableFYYears(): Promise<string[]> {
  const agent = await getOrCreateAgent()
  if (!agent) return []

  const rows = await db
    .selectDistinct({ fyYear: commissions.fyYear })
    .from(commissions)
    .where(eq(commissions.agentId, agent.id))

  return rows
    .map(r => r.fyYear)
    .filter(Boolean) as string[]
}
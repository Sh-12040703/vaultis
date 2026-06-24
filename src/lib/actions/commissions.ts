'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { commissions } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const AddCommissionSchema = z.object({
  policyId:     z.string().uuid('Invalid policy ID'),
  expectedAmt:  z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Expected amount must be a valid number'),
  receivedAmt:  z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Received amount must be a valid number'),
  tdsDeducted:  z.string().optional().default('0').refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'TDS must be a valid number'),
  paymentDate:  z.string().min(1, 'Payment date is required'),
  fyYear:       z.string().optional().or(z.literal('')),
  quarter:      z.string().optional().or(z.literal('')),
})

export async function addCommission(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = AddCommissionSchema.safeParse({
    policyId:     formData.get('policyId'),
    expectedAmt:  formData.get('expectedAmt'),
    receivedAmt:  formData.get('receivedAmt'),
    tdsDeducted:  formData.get('tdsDeducted') || '0',
    paymentDate:  formData.get('paymentDate'),
    fyYear:       formData.get('fyYear') || '',
    quarter:      formData.get('quarter') || '',
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const { policyId, expectedAmt, receivedAmt, tdsDeducted, paymentDate, fyYear, quarter } = result.data

  const expected = parseFloat(expectedAmt)
  const received = parseFloat(receivedAmt)
  const diff = expected - received

  // Auto-determine status
  let status = 'matched'
  if (Math.abs(diff) > 50) {
    status = diff > 50 ? 'short' : 'matched'
  }

  // Calculate current financial year if not provided
  const date = new Date(paymentDate)
  const year = date.getMonth() >= 3
    ? `${date.getFullYear()}-${String(date.getFullYear() + 1).slice(2)}`
    : `${date.getFullYear() - 1}-${String(date.getFullYear()).slice(2)}`

  const quarterMap: Record<number, string> = {
    3: 'Q1', 4: 'Q1', 5: 'Q1',
    6: 'Q2', 7: 'Q2', 8: 'Q2',
    9: 'Q3', 10: 'Q3', 11: 'Q3',
    0: 'Q4', 1: 'Q4', 2: 'Q4',
  }

  await db.insert(commissions).values({
    policyId,
    agentId:     agent.id,
    expectedAmt,
    receivedAmt,
    tdsDeducted: tdsDeducted || '0',
    paymentDate,
    fyYear:      fyYear || year,
    quarter:     quarter || quarterMap[date.getMonth()],
    status,
  })

  revalidatePath('/commissions')
  redirect('/commissions')
}

const UpdateStatusSchema = z.object({
  commissionId: z.string().uuid('Invalid commission ID'),
  status:       z.enum(['matched', 'short', 'overpaid', 'disputed', 'pending']),
})

export async function updateCommissionStatus(
  commissionId: string,
  status: string
) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = UpdateStatusSchema.safeParse({ commissionId, status })
  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  await db
    .update(commissions)
    .set({ status: result.data.status })
    .where(eq(commissions.id, result.data.commissionId))

  revalidatePath('/commissions')
}
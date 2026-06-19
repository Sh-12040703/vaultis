'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { commissions } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addCommission(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const policyId    = formData.get('policyId') as string
  const expectedAmt = formData.get('expectedAmt') as string
  const receivedAmt = formData.get('receivedAmt') as string
  const tdsDeducted = formData.get('tdsDeducted') as string || '0'
  const paymentDate = formData.get('paymentDate') as string
  const fyYear      = formData.get('fyYear') as string
  const quarter     = formData.get('quarter') as string

  if (!policyId || !expectedAmt || !receivedAmt || !paymentDate) {
    throw new Error('Please fill all required fields')
  }

  const expected = parseFloat(expectedAmt)
  const received = parseFloat(receivedAmt)
  const tds      = parseFloat(tdsDeducted) || 0
  const diff     = expected - received

  // Auto-determine status
  let status = 'matched'
  if (Math.abs(diff) > 50) {
    status = received < expected ? 'short' : 'matched'
  }

  // Calculate current financial year if not provided
  const date = new Date(paymentDate)
  const year = date.getMonth() >= 3
    ? `${date.getFullYear()}-${String(date.getFullYear() + 1).slice(2)}`
    : `${date.getFullYear() - 1}-${String(date.getFullYear()).slice(2)}`

  const q = date.getMonth()
  const quarterMap: Record<number, string> = {
    3: 'Q1', 4: 'Q1', 5: 'Q1',
    6: 'Q2', 7: 'Q2', 8: 'Q2',
    9: 'Q3', 10: 'Q3', 11: 'Q3',
    0: 'Q4', 1: 'Q4', 2: 'Q4',
  }

  await db.insert(commissions).values({
    policyId,
    agentId:     agent.id,
    expectedAmt: expectedAmt,
    receivedAmt: receivedAmt,
    tdsDeducted: tdsDeducted || '0',
    paymentDate,
    fyYear:      fyYear || year,
    quarter:     quarter || quarterMap[date.getMonth()],
    status,
  })

  revalidatePath('/commissions')
  redirect('/commissions')
}

export async function updateCommissionStatus(
  commissionId: string,
  status: string
) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const { eq } = await import('drizzle-orm')

  await db
    .update(commissions)
    .set({ status })
    .where(eq(commissions.id, commissionId))

  revalidatePath('/commissions')
}
'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { policies, renewals, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const AddPolicySchema = z.object({
  clientId:     z.string().uuid('Invalid client'),
  policyNumber: z.string().min(1).max(100).trim(),
  insurer:      z.string().min(1).max(100).trim(),
  type:         z.enum(['health', 'motor', 'life', 'term', 'commercial', 'travel', 'home', 'other']),
  premium:      z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Invalid premium'),
  sumInsured:   z.string().optional().or(z.literal('')),
  startDate:    z.string().optional().or(z.literal('')),
  expiryDate:   z.string().min(1, 'Expiry date required'),
})

export async function addPolicy(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = AddPolicySchema.safeParse({
    clientId:     formData.get('clientId'),
    policyNumber: formData.get('policyNumber'),
    insurer:      formData.get('insurer'),
    type:         formData.get('type'),
    premium:      formData.get('premium'),
    sumInsured:   formData.get('sumInsured') || '',
    startDate:    formData.get('startDate')  || '',
    expiryDate:   formData.get('expiryDate'),
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const { clientId, policyNumber, insurer, type,
    premium, sumInsured, startDate, expiryDate } = result.data

  // Ownership check — verify client belongs to this agent
  const clientRows = await db
    .select()
    .from(clients)
    .where(
      and(
        eq(clients.id,      clientId),
        eq(clients.agentId, agent.id)
      )
    )
    .limit(1)

  if (clientRows.length === 0) {
    throw new Error('Client not found')
  }

  const newPolicy = await db
    .insert(policies)
    .values({
      clientId,
      agentId:      agent.id,
      policyNumber,
      insurer,
      type,
      premium,
      sumInsured:   sumInsured || null,
      startDate:    startDate  || null,
      expiryDate,
      status:       'active',
    })
    .returning()

  await db.insert(renewals).values({
    policyId: newPolicy[0].id,
    dueDate:  expiryDate,
    amount:   premium,
    status:   'pending',
  })

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
  redirect(`/clients/${clientId}`)
}
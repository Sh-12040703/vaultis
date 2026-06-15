'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { policies, renewals } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addPolicy(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const clientId     = formData.get('clientId') as string
  const policyNumber = formData.get('policyNumber') as string
  const insurer      = formData.get('insurer') as string
  const type         = formData.get('type') as string
  const premium      = formData.get('premium') as string
  const sumInsured   = formData.get('sumInsured') as string
  const startDate    = formData.get('startDate') as string
  const expiryDate   = formData.get('expiryDate') as string

  // Validation
  if (!policyNumber || !insurer || !type || !premium || !expiryDate) {
    throw new Error('Please fill all required fields')
  }

  // Save policy
  const newPolicy = await db
    .insert(policies)
    .values({
      clientId,
      agentId:      agent.id,
      policyNumber: policyNumber.trim(),
      insurer:      insurer.trim(),
      type,
      premium:      premium,
      sumInsured:   sumInsured || null,
      startDate:    startDate || null,
      expiryDate,
      status:       'active',
    })
    .returning()

  // Auto-create a renewal record for this policy
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
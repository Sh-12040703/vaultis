'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function updateAgentProfile(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const name      = formData.get('name') as string
  const phone     = formData.get('phone') as string
  const irdaiCode = formData.get('irdaiCode') as string
  const gstin     = formData.get('gstin') as string

  // Basic validation
  if (!name || name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters')
  }

  await db
    .update(agents)
    .set({
      name:      name.trim(),
      phone:     phone?.trim() || null,
      irdaiCode: irdaiCode?.trim() || null,
      gstin:     gstin?.trim().toUpperCase() || null,
    })
    .where(eq(agents.id, agent.id))

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}
'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function addClient(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const name  = formData.get('name') as string
  const phone = formData.get('phone') as string
  const email = formData.get('email') as string || null
  const dob   = formData.get('dob') as string || null
  const address = formData.get('address') as string || null

  // Basic validation
  if (!name || name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters')
  }
  if (!phone || phone.trim().length < 10) {
    throw new Error('Enter a valid phone number')
  }

  const newClient = await db
    .insert(clients)
    .values({
      agentId: agent.id,
      name:    name.trim(),
      phone:   phone.trim(),
      email:   email?.trim() || null,
      dob:     dob || null,
      address: address?.trim() || null,
    })
    .returning()

  revalidatePath('/clients')
  redirect(`/clients/${newClient[0].id}`)
}
'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const AddClientSchema = z.object({
  name:    z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  phone:   z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  email:   z.string().email('Invalid email').optional().or(z.literal('')),
  dob:     z.string().optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
})

export async function addClient(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = AddClientSchema.safeParse({
    name:    formData.get('name'),
    phone:   formData.get('phone'),
    email:   formData.get('email')    || '',
    dob:     formData.get('dob')      || '',
    address: formData.get('address')  || '',
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0];
    throw new Error(firstIssue?.message || 'Validation failed');
  }

  const { name, phone, email, dob, address } = result.data

  const newClient = await db
    .insert(clients)
    .values({
      agentId: agent.id,
      name,
      phone,
      email:   email   || null,
      dob:     dob     || null,
      address: address || null,
    })
    .returning()

  revalidatePath('/clients')
  redirect(`/clients/${newClient[0].id}`)
}
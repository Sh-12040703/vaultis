'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const UpdateAgentSchema = z.object({
  name:      z.string().min(2, 'Name must be at least 2 characters').max(100).trim(),
  phone:     z.string().optional(),
  irdaiCode: z.string().optional(),
  gstin:     z.string().optional(),
}).superRefine((data, ctx) => {
  // Validate phone if provided
  if (data.phone && !/^[6-9]\d{9}$/.test(data.phone)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid phone number – must be a 10-digit Indian mobile number',
      path: ['phone'],
    });
  }
  // Validate GSTIN if provided (basic format)
  if (data.gstin && !/^[0-9A-Z]{15}$/.test(data.gstin.toUpperCase())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Invalid GSTIN – must be 15 alphanumeric characters',
      path: ['gstin'],
    });
  }
})

export async function updateAgentProfile(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = UpdateAgentSchema.safeParse({
    name:      formData.get('name'),
    phone:     formData.get('phone') || undefined,
    irdaiCode: formData.get('irdaiCode') || undefined,
    gstin:     formData.get('gstin') || undefined,
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const { name, phone, irdaiCode, gstin } = result.data

  await db
    .update(agents)
    .set({
      name,
      phone:     phone || null,
      irdaiCode: irdaiCode || null,
      gstin:     gstin ? gstin.toUpperCase() : null,
    })
    .where(eq(agents.id, agent.id))

  revalidatePath('/settings')
  revalidatePath('/dashboard')
}
'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { rateCards } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

const AddRateCardSchema = z.object({
  insurer:       z.string().min(1, 'Insurer is required').max(100).trim(),
  productType:   z.string().min(1, 'Product type is required').max(50).trim(),
  policyYear:    z.string().min(1, 'Policy year is required').max(20).trim(),
  ratePct:       z.string().refine(v => !isNaN(Number(v)) && Number(v) > 0, 'Rate percentage must be a positive number'),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  notes:         z.string().optional().or(z.literal('')),
})

export async function addRateCard(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = AddRateCardSchema.safeParse({
    insurer:       formData.get('insurer'),
    productType:   formData.get('productType'),
    policyYear:    formData.get('policyYear'),
    ratePct:       formData.get('ratePct'),
    effectiveFrom: formData.get('effectiveFrom'),
    notes:         formData.get('notes') || '',
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const { insurer, productType, policyYear, ratePct, effectiveFrom, notes } = result.data

  // Deactivate any existing rate card for same insurer+product+year
  await db
    .update(rateCards)
    .set({ effectiveTo: effectiveFrom })
    .where(
      and(
        eq(rateCards.agentId,     agent.id),
        eq(rateCards.insurer,     insurer),
        eq(rateCards.productType, productType),
        eq(rateCards.policyYear,  policyYear),
      )
    )

  await db.insert(rateCards).values({
    agentId:       agent.id,
    insurer,
    productType,
    policyYear,
    ratePct: parseFloat(ratePct).toFixed(2),
    effectiveFrom,
    effectiveTo:   null,
    notes:         notes?.trim() || null,
  })

  revalidatePath('/commissions/rate-cards')
}

const DeleteRateCardSchema = z.object({
  id: z.string().uuid('Invalid rate card ID'),
})

export async function deleteRateCard(id: string) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = DeleteRateCardSchema.safeParse({ id })
  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  await db
    .delete(rateCards)
    .where(
      and(
        eq(rateCards.id,      result.data.id),
        eq(rateCards.agentId, agent.id)
      )
    )

  revalidatePath('/commissions/rate-cards')
}

// Used by reconciliation engine – no user input, safe without validation
export async function getRateForPolicy(
  agentId: string,
  insurer: string,
  productType: string,
  policyYear: string
): Promise<number> {
  const cards = await db
    .select()
    .from(rateCards)
    .where(
      and(
        eq(rateCards.agentId,     agentId),
        eq(rateCards.insurer,     insurer),
        eq(rateCards.productType, productType),
        eq(rateCards.policyYear,  policyYear),
      )
    )
    .orderBy(rateCards.effectiveFrom)
    .limit(1)

  if (cards.length === 0) return 0
  return Number(cards[0].ratePct)
}
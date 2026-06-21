'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { rateCards } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function addRateCard(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const insurer       = formData.get('insurer') as string
  const productType   = formData.get('productType') as string
  const policyYear    = formData.get('policyYear') as string
  const ratePct       = formData.get('ratePct') as string
  const effectiveFrom = formData.get('effectiveFrom') as string
  const notes         = formData.get('notes') as string

  if (!insurer || !productType || !policyYear || !ratePct || !effectiveFrom) {
    throw new Error('Please fill all required fields')
  }

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

export async function deleteRateCard(id: string) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  await db
    .delete(rateCards)
    .where(
      and(
        eq(rateCards.id,      id),
        eq(rateCards.agentId, agent.id)
      )
    )

  revalidatePath('/commissions/rate-cards')
}

// Used by reconciliation engine
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
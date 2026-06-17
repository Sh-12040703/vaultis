'use server'

import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { agents } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export async function getOrCreateAgent() {
  const { userId } = await auth()
  if (!userId) return null

  // Check if agent already exists
  const existing = await db
    .select()
    .from(agents)
    .where(eq(agents.clerkId, userId))
    .limit(1)

  if (existing.length > 0) {
    return existing[0]
  }

  // Get user details from Clerk
  const user = await currentUser()
  if (!user) return null

  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Agent'
  const email = user.emailAddresses[0]?.emailAddress || ''

  // Create agent row
  const newAgent = await db
    .insert(agents)
    .values({
      clerkId: userId,
      name,
      email,
      plan: 'free',
    })
    .returning()

  return newAgent[0]
}
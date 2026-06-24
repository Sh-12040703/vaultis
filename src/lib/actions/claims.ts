'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { claims, policies, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)

// ─── Resilient Gemini wrapper ──────────────────────────────
async function generateWithFallback(contents: any[]): Promise<string> {
  const models = [
    genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }),
    genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }),
    genAI.getGenerativeModel({ model: 'gemini-1.5-flash-8b' }),
  ]

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const m = models[Math.min(attempt, models.length - 1)]
      const result = await m.generateContent(contents)
      return result.response.text()
    } catch (err: any) {
      const is503 =
        err?.message?.includes('503') ||
        err?.message?.includes('Service Unavailable') ||
        err?.message?.includes('high demand')

      if (is503 && attempt < 2) {
        await new Promise(r => setTimeout(r, 2000)) // wait 2s before retry
        continue
      }
      throw err
    }
  }
  throw new Error('All Gemini models unavailable')
}

// ─── Schemas (unchanged) ────────────────────────────────────

const AddClaimSchema = z.object({
  policyId:     z.string().uuid('Invalid policy ID'),
  incidentDate: z.string().optional().or(z.literal('')),
  description:  z.string().min(1, 'Claim description is required').max(1000, 'Description too long (max 1000 characters)').trim(),
})

const UpdateStatusSchema = z.object({
  claimId: z.string().uuid('Invalid claim ID'),
  status:  z.enum(['draft', 'intimated', 'documents_submitted', 'under_review', 'approved', 'rejected', 'settled']),
})

const GeneratePreCheckSchema = z.object({
  claimId:     z.string().uuid('Invalid claim ID'),
  description: z.string().min(1, 'Description is required'),
  policyData:  z.string().min(1, 'Policy data is required'),
})

const GenerateEmailSchema = z.object({
  clientName:   z.string().min(1, 'Client name is required').max(100),
  policyNumber: z.string().min(1, 'Policy number is required').max(100),
  insurer:      z.string().min(1, 'Insurer is required').max(100),
  description:  z.string().min(1, 'Description is required').max(1000),
  incidentDate: z.string().optional().or(z.literal('')),
})

// ─── Actions ──────────────────────────────────────────────

export async function addClaim(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = AddClaimSchema.safeParse({
    policyId:     formData.get('policyId'),
    incidentDate: formData.get('incidentDate') || '',
    description:  formData.get('description'),
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const { policyId, incidentDate, description } = result.data

  const policy = await db
    .select()
    .from(policies)
    .where(
      and(
        eq(policies.id,      policyId),
        eq(policies.agentId, agent.id)
      )
    )
    .limit(1)

  if (policy.length === 0) throw new Error('Policy not found')

  const newClaim = await db
    .insert(claims)
    .values({
      policyId,
      clientId:     policy[0].clientId,
      incidentDate: incidentDate || null,
      description,
      status:       'draft',
    })
    .returning()

  revalidatePath('/claims')
  redirect(`/claims/${newClaim[0].id}`)
}

export async function updateClaimStatus(claimId: string, status: string) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = UpdateStatusSchema.safeParse({ claimId, status })
  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const claim = await db
    .select()
    .from(claims)
    .innerJoin(policies, eq(claims.policyId, policies.id))
    .where(
      and(
        eq(claims.id, result.data.claimId),
        eq(policies.agentId, agent.id)
      )
    )
    .limit(1)

  if (claim.length === 0) throw new Error('Claim not found or not owned by you')

  await db
    .update(claims)
    .set({ status: result.data.status })
    .where(eq(claims.id, result.data.claimId))

  revalidatePath('/claims')
  revalidatePath(`/claims/${claimId}`)
}

export async function generateClaimPreCheck(
  claimId:     string,
  description: string,
  policyData:  string
): Promise<string> {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const result = GeneratePreCheckSchema.safeParse({ claimId, description, policyData })
  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  const claim = await db
    .select()
    .from(claims)
    .innerJoin(policies, eq(claims.policyId, policies.id))
    .where(
      and(
        eq(claims.id, result.data.claimId),
        eq(policies.agentId, agent.id)
      )
    )
    .limit(1)

  if (claim.length === 0) throw new Error('Claim not found or not owned by you')

  try {
    const prompt = `You are an expert Indian insurance claims advisor.

A client wants to file a claim. Analyze if this claim is likely to be approved based on the policy details.

POLICY DETAILS:
${result.data.policyData}

CLAIM DESCRIPTION:
${result.data.description}

Provide a structured analysis with:
1. Likely Outcome (Approved / Partial / Rejected) with confidence percentage
2. Key reasons for your assessment
3. Specific documentation the client should submit
4. Any red flags or exclusions that may apply
5. Agent advice — what to tell the client

Keep it concise, practical, and India-specific. Plain text, no markdown.`

    const text = await generateWithFallback([prompt])

    await db
      .update(claims)
      .set({ predicted: { analysis: text, generatedAt: new Date().toISOString() } })
      .where(eq(claims.id, result.data.claimId))

    revalidatePath(`/claims/${claimId}`)
    return text

  } catch {
    return 'Unable to generate pre-check at this time. Please review the policy document manually.'
  }
}

export async function generateClaimEmail(
  clientName:   string,
  policyNumber: string,
  insurer:      string,
  description:  string,
  incidentDate: string
): Promise<string> {
  const result = GenerateEmailSchema.safeParse({
    clientName,
    policyNumber,
    insurer,
    description,
    incidentDate: incidentDate || '',
  })

  if (!result.success) {
    const firstIssue = result.error.issues?.[0]
    throw new Error(firstIssue?.message || 'Validation failed')
  }

  try {
    const prompt = `Write a professional claim intimation email from an insurance agent to ${result.data.insurer}.

Client: ${result.data.clientName}
Policy Number: ${result.data.policyNumber}
Incident Date: ${result.data.incidentDate || 'Not provided'}
Claim Description: ${result.data.description}

The email should:
- Be formal and professional
- Include all relevant details clearly
- Request claim registration and TPA assignment
- Ask for claim reference number
- Be under 200 words

Return only the email body. No subject line. No markdown.`

    return await generateWithFallback([prompt])

  } catch {
    return `Dear Claims Team,

I am writing to intimate a claim on behalf of my client ${result.data.clientName} (Policy No: ${result.data.policyNumber}).

Incident Date: ${result.data.incidentDate || 'Not provided'}
Details: ${result.data.description}

Kindly register this claim and provide a claim reference number at the earliest. Please also assign a TPA/surveyor if required.

Thank you for your prompt attention.`
  }
}
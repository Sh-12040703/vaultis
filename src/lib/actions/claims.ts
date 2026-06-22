'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { claims, policies, clients } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

export async function addClaim(formData: FormData) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  const policyId    = formData.get('policyId') as string
  const incidentDate = formData.get('incidentDate') as string
  const description = formData.get('description') as string

  if (!policyId || !description) {
    throw new Error('Please fill all required fields')
  }

  // Verify policy belongs to this agent
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

export async function updateClaimStatus(
  claimId: string,
  status: string
) {
  const agent = await getOrCreateAgent()
  if (!agent) throw new Error('Not authenticated')

  await db
    .update(claims)
    .set({ status })
    .where(eq(claims.id, claimId))

  revalidatePath('/claims')
  revalidatePath(`/claims/${claimId}`)
}

export async function generateClaimPreCheck(
  claimId:     string,
  description: string,
  policyData:  string
): Promise<string> {
  try {
    const prompt = `You are an expert Indian insurance claims advisor.

A client wants to file a claim. Analyze if this claim is likely to be approved based on the policy details.

POLICY DETAILS:
${policyData}

CLAIM DESCRIPTION:
${description}

Provide a structured analysis with:
1. Likely Outcome (Approved / Partial / Rejected) with confidence percentage
2. Key reasons for your assessment
3. Specific documentation the client should submit
4. Any red flags or exclusions that may apply
5. Agent advice — what to tell the client

Keep it concise, practical, and India-specific. Plain text, no markdown.`

    const result = await model.generateContent(prompt)
    const text   = result.response.text()

    // Save prediction to DB
    await db
      .update(claims)
      .set({ predicted: { analysis: text, generatedAt: new Date().toISOString() } })
      .where(eq(claims.id, claimId))

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
  try {
    const prompt = `Write a professional claim intimation email from an insurance agent to ${insurer}.

Client: ${clientName}
Policy Number: ${policyNumber}
Incident Date: ${incidentDate}
Claim Description: ${description}

The email should:
- Be formal and professional
- Include all relevant details clearly
- Request claim registration and TPA assignment
- Ask for claim reference number
- Be under 200 words

Return only the email body. No subject line. No markdown.`

    const result = await model.generateContent(prompt)
    return result.response.text()

  } catch {
    return `Dear Claims Team,

I am writing to intimate a claim on behalf of my client ${clientName} (Policy No: ${policyNumber}).

Incident Date: ${incidentDate}
Details: ${description}

Kindly register this claim and provide a claim reference number at the earliest. Please also assign a TPA/surveyor if required.

Thank you for your prompt attention.`
  }
}
'use server'

import { GoogleGenerativeAI } from '@google/generative-ai'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { commissions, policies, rateCards } from '@/lib/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!)
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

type ExtractedLine = {
    policy_number: string
    insured_name: string
    insurer: string
    gross_premium: number
    product_type: string
    commission_rate_applied: number
    gross_commission: number
    tds_deducted: number
    net_paid: number
}

type ReconciliationLine = ExtractedLine & {
    policy_id: string | null
    expected_rate: number
    expected_gross: number
    expected_net: number
    discrepancy: number
    status: 'matched' | 'short' | 'overpaid' | 'unknown'
}

export type ReconciliationResult = {
    success: boolean
    insurer: string
    statementDate: string
    lines: ReconciliationLine[]
    totalExpected: number
    totalReceived: number
    totalShort: number
    totalTDS: number
    errors: string[]
}

export async function reconcileStatement(
    formData: FormData
): Promise<ReconciliationResult> {
    const agent = await getOrCreateAgent()
    if (!agent) {
        return {
            success: false, insurer: '', statementDate: '',
            lines: [], totalExpected: 0, totalReceived: 0,
            totalShort: 0, totalTDS: 0,
            errors: ['Not authenticated'],
        }
    }

    const file = formData.get('file') as File
    const insurer = formData.get('insurer') as string

    if (!file || file.size === 0) {
        return {
            success: false, insurer: '', statementDate: '',
            lines: [], totalExpected: 0, totalReceived: 0,
            totalShort: 0, totalTDS: 0,
            errors: ['No file uploaded'],
        }
    }

    // After: if (!file || file.size === 0) check
    // Add this:

    const ALLOWED_EXTENSIONS = ['.pdf', '.xlsx', '.xls', '.csv']
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB

    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        return {
            success: false, insurer: '', statementDate: '',
            lines: [], totalExpected: 0, totalReceived: 0,
            totalShort: 0, totalTDS: 0,
            errors: ['Only PDF, Excel or CSV files accepted'],
        }
    }

    if (file.size > MAX_SIZE) {
        return {
            success: false, insurer: '', statementDate: '',
            lines: [], totalExpected: 0, totalReceived: 0,
            totalShort: 0, totalTDS: 0,
            errors: ['File too large. Maximum 10MB allowed'],
        }
    }


    // Convert file to base64 for Gemini
    const buffer = await file.arrayBuffer()
    const mimeType = file.type || 'application/pdf'

    const isExcel = mimeType.includes('spreadsheetml') || mimeType.includes('ms-excel')
        || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    let geminiContent: any[]

    if (isExcel) {
        // Convert Excel to CSV text — Gemini reads text, not binary spreadsheets
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const csvText = XLSX.utils.sheet_to_csv(sheet)

        geminiContent = [
            `Here is the commission statement data extracted from an Excel file, in CSV format:\n\n${csvText}`,
        ]
    } else {
        // PDF or image — Gemini can read these directly
        const base64 = Buffer.from(buffer).toString('base64')
        geminiContent = [
            {
                inlineData: {
                    mimeType,
                    data: base64,
                },
            },
        ]
    }

    // Step 1 — Gemini extracts commission lines
    let extractedLines: ExtractedLine[] = []
    let statementDate = new Date().toISOString().split('T')[0]
    let detectedInsurer = insurer

    try {
        const prompt = `You are an expert at reading Indian insurance commission statements.

Extract ALL commission line items from this document.
Return ONLY a valid JSON object — no other text, no markdown backticks, no explanation.

JSON format:
{
  "insurer": "overall insurer name from document",
  "statement_date": "YYYY-MM-DD",
  "lines": [
    {
      "policy_number": "exact policy number",
      "insured_name": "policyholder name",
      "insurer": "insurer name for this specific line if different, else same as overall",
      "gross_premium": 0.00,
      "product_type": "health|motor|life|term|commercial|other",
      "commission_rate_applied": 0.00,
      "gross_commission": 0.00,
      "tds_deducted": 0.00,
      "net_paid": 0.00
    }
  ]
}

Rules:
- All amounts must be numbers not strings
- product_type must be one of: health motor life term commercial other  
- commission_rate_applied is the percentage rate shown (0 if not shown)
- tds_deducted is TDS amount (0 if none)
- net_paid MUST be the exact value from the Net Paid column — do NOT calculate it
- Use the exact numbers from each cell — never recalculate
- insurer per line is critical — extract it from each row if the statement has multiple insurers
- If a field is not found use 0 for numbers or empty string for text
- Return ONLY the JSON object nothing else`

        const result = await model.generateContent([
            ...geminiContent,
            prompt,
        ])

        const raw = result.response.text()
        const cleaned = raw.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleaned)

        extractedLines = parsed.lines || []
        statementDate = parsed.statement_date || statementDate
        detectedInsurer = parsed.insurer || insurer

    } catch (err) {
        return {
            success: false, insurer, statementDate: '',
            lines: [], totalExpected: 0, totalReceived: 0,
            totalShort: 0, totalTDS: 0,
            errors: [`Failed to read statement: ${err instanceof Error ? err.message : 'Unknown error'}`],
        }
    }

    if (extractedLines.length === 0) {
        return {
            success: false, insurer: detectedInsurer, statementDate,
            lines: [], totalExpected: 0, totalReceived: 0,
            totalShort: 0, totalTDS: 0,
            errors: ['No commission lines found in the statement. Please check the file format.'],
        }
    }

    // Step 2 — Get agent rate cards for this insurer
    // Step 2 — Get agent rate cards
    // Step 2 — Get ALL agent rate cards (matched per line below)
    const allAgentRates = await db
        .select()
        .from(rateCards)
        .where(
            and(
                eq(rateCards.agentId, agent.id),
                isNull(rateCards.effectiveTo)
            )
        )

    // Step 3 — Get agent policies for matching
    const agentPolicies = await db
        .select()
        .from(policies)
        .where(eq(policies.agentId, agent.id))

    // Step 4 — Reconcile each line
    // IMPORTANT: Rule engine does all math — no AI for financial calculations
    const reconciledLines: ReconciliationLine[] = []

    for (const line of extractedLines) {
        // Match policy by policy number
        const matchedPolicy = agentPolicies.find(
            p => p.policyNumber.toLowerCase().trim() ===
                line.policy_number.toLowerCase().trim()
        )

        // Find rate card — try year 1 first then renewal
        // Find rate card
        // First try to match by line's insurer + product type
        // Fall back to any rate card with matching product type
        // Get insurer for this specific line — falls back to overall statement insurer
        const lineInsurer = line.insurer || detectedInsurer || insurer

        // Match rate card: exact insurer + product type first, then product type only
        const rateCard =
            allAgentRates.find(
                r => r.insurer === lineInsurer && r.productType === line.product_type
            ) ||
            allAgentRates.find(
                r => r.productType === line.product_type
            )

        // Pure arithmetic — never AI
        const expectedRate = rateCard ? Number(rateCard.ratePct) : 0
        const expectedGross = expectedRate > 0
            ? Math.round((line.gross_premium * expectedRate) / 100 * 100) / 100
            : line.gross_commission
        const expectedNet = Math.round((expectedGross - line.tds_deducted) * 100) / 100
        const discrepancy = expectedNet - line.net_paid

        let status: ReconciliationLine['status'] = 'matched'
        if (expectedRate === 0) status = 'unknown'
        else if (discrepancy > 50) status = 'short'
        else if (discrepancy < -50) status = 'overpaid'

        reconciledLines.push({
            ...line,
            policy_id: matchedPolicy?.id || null,
            expected_rate: expectedRate,
            expected_gross: expectedGross,
            expected_net: expectedNet,
            discrepancy,
            status,
        })

        // Step 5 — Save to commissions table
        if (matchedPolicy) {
            try {
                const now = new Date()
                const fy = now.getMonth() >= 3
                    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
                    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`

                const monthToQ: Record<number, string> = {
                    3: 'Q1', 4: 'Q1', 5: 'Q1',
                    6: 'Q2', 7: 'Q2', 8: 'Q2',
                    9: 'Q3', 10: 'Q3', 11: 'Q3',
                    0: 'Q4', 1: 'Q4', 2: 'Q4',
                }

                await db.insert(commissions).values({
                    policyId: matchedPolicy.id,
                    agentId: agent.id,
                    expectedAmt: String(expectedNet.toFixed(2)),
                    receivedAmt: String(line.net_paid.toFixed(2)),
                    tdsDeducted: String(line.tds_deducted.toFixed(2)),
                    paymentDate: statementDate,
                    fyYear: fy,
                    quarter: monthToQ[now.getMonth()],
                    status,
                })
            } catch {
                // Don't fail whole reconciliation if one save fails
            }
        }
    }

    // Totals — pure arithmetic
    const totalExpected = reconciledLines.reduce((s, l) => s + l.expected_net, 0)
    const totalReceived = reconciledLines.reduce((s, l) => s + l.net_paid, 0)
    const totalShort = reconciledLines
        .filter(l => l.status === 'short')
        .reduce((s, l) => s + l.discrepancy, 0)
    const totalTDS = reconciledLines.reduce((s, l) => s + l.tds_deducted, 0)

    revalidatePath('/commissions')

    return {
        success: true,
        insurer: detectedInsurer,
        statementDate,
        lines: reconciledLines,
        totalExpected,
        totalReceived,
        totalShort,
        totalTDS,
        errors: [],
    }
}

// Generate dispute email using Gemini
export async function generateDisputeEmail(
    agentName: string,
    insurer: string,
    lines: ReconciliationLine[]
): Promise<string> {
    const shortLines = lines.filter(l => l.status === 'short')
    if (shortLines.length === 0) return ''

    const lineDetails = shortLines.map(l =>
        `Policy ${l.policy_number} (${l.insured_name}): Expected ₹${l.expected_net.toFixed(2)}, Received ₹${l.net_paid.toFixed(2)}, Short by ₹${l.discrepancy.toFixed(2)}`
    ).join('\n')

    try {
        const prompt = `Write a professional but firm dispute email from insurance agent ${agentName} to ${insurer}'s commission department.

Short paid policies:
${lineDetails}

The email should:
- Be professional and factual
- Reference specific policy numbers and amounts
- Request written clarification within 7 working days
- Ask for credit of the shortfall in the next statement
- Be concise under 200 words

Return only the email body text. No subject line. No markdown.`

        const result = await model.generateContent(prompt)
        return result.response.text()

    } catch {
        // Fallback template if Gemini fails
        return `Dear Commission Team,

I am writing regarding discrepancies in my recent commission statement.

The following policies appear to have been short paid:
${lineDetails}

Kindly review the above and confirm the correct commission rates applicable. I request written clarification within 7 working days and credit of the shortfall amount in the next commission statement.

Thank you for your prompt attention.

Regards,
${agentName}`
    }
}
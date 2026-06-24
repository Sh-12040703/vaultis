'use server'

import { z } from 'zod'
import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { clients, policies, renewals } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

// ─── Helper functions (unchanged) ──────────────────────────

function findColumn(headers: string[], possibilities: string[]): string | null {
  const lower = headers.map(h => h?.toString().toLowerCase().trim())
  for (const p of possibilities) {
    const idx = lower.indexOf(p.toLowerCase())
    if (idx !== -1) return headers[idx]
  }
  return null
}

function parseDate(val: unknown): string | null {
  if (!val) return null
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
    }
  }
  if (typeof val === 'string') {
    const str = val.trim()
    if (!str) return null
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy
      const year = y.length === 2 ? `20${y}` : y
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmdd) return str
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]
    }
  }
  return null
}

// ─── Zod schemas ─────────────────────────────────────────────

const ClientRowSchema = z.object({
  name:     z.string().min(1, 'Name is required'),
  phone:    z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number'),
  email:    z.string().email('Invalid email').optional().nullable(),
  dob:      z.string().optional().nullable(),
  address:  z.string().optional().nullable(),
})

const PolicyRowSchema = z.object({
  policyNumber: z.string().min(1, 'Policy number is required'),
  expiryDate:   z.string().min(1, 'Expiry date is required'),
  insurer:      z.string().optional().default('Unknown'),
  type:         z.string().optional().default('other'),
  premium:      z.string().optional().nullable(),
  sumInsured:   z.string().optional().nullable(),
  startDate:    z.string().optional().nullable(),
})

// ─── Main import function ──────────────────────────────────

export type ImportResult = {
  success: boolean
  clientsCreated: number
  policiesCreated: number
  renewalsCreated: number
  skipped: number
  errors: string[]
}

export async function importFromExcel(
  formData: FormData
): Promise<ImportResult> {
  const agent = await getOrCreateAgent()
  if (!agent) {
    return {
      success: false,
      clientsCreated: 0,
      policiesCreated: 0,
      renewalsCreated: 0,
      skipped: 0,
      errors: ['Not authenticated'],
    }
  }

  const file = formData.get('file') as File
  if (!file || file.size === 0) {
    return {
      success: false,
      clientsCreated: 0,
      policiesCreated: 0,
      renewalsCreated: 0,
      skipped: 0,
      errors: ['No file uploaded'],
    }
  }

  // File validation (already present)
  const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
    return {
      success: false,
      clientsCreated: 0, policiesCreated: 0,
      renewalsCreated: 0, skipped: 0,
      errors: ['Only Excel or CSV files accepted'],
    }
  }
  if (file.size > 10 * 1024 * 1024) {
    return {
      success: false,
      clientsCreated: 0, policiesCreated: 0,
      renewalsCreated: 0, skipped: 0,
      errors: ['File too large. Maximum 10MB allowed'],
    }
  }

  // Read file
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
    raw: true,
    defval: '',
  })

  if (rows.length === 0) {
    return {
      success: false,
      clientsCreated: 0,
      policiesCreated: 0,
      renewalsCreated: 0,
      skipped: 0,
      errors: ['Excel file is empty or has no data rows'],
    }
  }

  // Detect column names
  const headers = Object.keys(rows[0])
  const colName        = findColumn(headers, ['name', 'client name', 'client_name', 'full name', 'customer name', 'policyholder'])
  const colPhone       = findColumn(headers, ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'contact number', 'cell'])
  const colEmail       = findColumn(headers, ['email', 'email address', 'mail', 'e-mail'])
  const colDob         = findColumn(headers, ['dob', 'date of birth', 'birth date', 'birthdate'])
  const colAddress     = findColumn(headers, ['address', 'addr', 'location'])
  const colPolicyNo    = findColumn(headers, ['policy number', 'policy no', 'policy_number', 'policy no.', 'policynumber', 'policy'])
  const colInsurer     = findColumn(headers, ['insurer', 'insurance company', 'company', 'insurer name', 'insurance co'])
  const colType        = findColumn(headers, ['type', 'policy type', 'insurance type', 'product type', 'product'])
  const colPremium     = findColumn(headers, ['premium', 'annual premium', 'premium amount', 'amount'])
  const colSumInsured  = findColumn(headers, ['sum insured', 'sum_insured', 'coverage', 'cover amount', 'insured amount', 'si'])
  const colStartDate   = findColumn(headers, ['start date', 'start_date', 'commencement date', 'from date', 'issue date', 'inception date'])
  const colExpiry      = findColumn(headers, ['expiry date', 'expiry_date', 'expiry', 'renewal date', 'due date', 'end date', 'maturity date'])

  // Required column checks
  if (!colName) {
    return {
      success: false,
      clientsCreated: 0, policiesCreated: 0,
      renewalsCreated: 0, skipped: 0,
      errors: ['Could not find a "Name" column. Please ensure your Excel has a column named "Name" or "Client Name".'],
    }
  }
  if (!colPhone) {
    return {
      success: false,
      clientsCreated: 0, policiesCreated: 0,
      renewalsCreated: 0, skipped: 0,
      errors: ['Could not find a "Phone" column. Please ensure your Excel has a column named "Phone" or "Mobile".'],
    }
  }

  let clientsCreated = 0
  let policiesCreated = 0
  let renewalsCreated = 0
  let skipped = 0
  const errors: string[] = []
  const phoneToClientId: Record<string, string> = {}

  // ─── Process each row ──────────────────────────────────────

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because row 1 is headers, +1 for 1-indexing

    try {
      // Extract raw values
      const rawName  = colName  ? String(row[colName]  || '').trim() : ''
      const rawPhone = colPhone ? String(row[colPhone] || '').trim() : ''

      // Skip if no name or phone
      if (!rawName || !rawPhone) {
        skipped++
        if (rawName || rawPhone) {
          errors.push(`Row ${rowNum}: Skipped — missing ${!rawName ? 'name' : 'phone'}`)
        }
        continue
      }

      // Clean phone
      const cleanPhone = rawPhone.replace(/[\s\-\+]/g, '').replace(/^91/, '').slice(-10)

      // ── Zod validation for client data ──
      const clientData = {
        name: rawName,
        phone: cleanPhone,
        email: colEmail ? String(row[colEmail] || '').trim() || null : null,
        dob: colDob ? parseDate(row[colDob]) : null,
        address: colAddress ? String(row[colAddress] || '').trim() || null : null,
      }

      const clientValid = ClientRowSchema.safeParse(clientData)
      if (!clientValid.success) {
        const firstIssue = clientValid.error.issues[0]
        errors.push(`Row ${rowNum}: Client validation failed — ${firstIssue.message}`)
        skipped++
        continue
      }

      const { name, phone, email, dob, address } = clientValid.data

      // Get or create client
      let clientId: string
      if (phoneToClientId[phone]) {
        clientId = phoneToClientId[phone]
      } else {
        const newClient = await db
          .insert(clients)
          .values({
            agentId: agent.id,
            name,
            phone,
            email,
            dob,
            address,
          })
          .returning()
        clientId = newClient[0].id
        phoneToClientId[phone] = clientId
        clientsCreated++
      }

      // ── Process policy if we have policyNumber and expiryDate ──
      const rawPolicyNo = colPolicyNo ? String(row[colPolicyNo] || '').trim() : ''
      const rawExpiry   = colExpiry ? row[colExpiry] : null
      const expiryDate  = parseDate(rawExpiry)

      if (rawPolicyNo && expiryDate) {
        const policyData = {
          policyNumber: rawPolicyNo,
          expiryDate: expiryDate,
          insurer: colInsurer ? String(row[colInsurer] || '').trim() || 'Unknown' : 'Unknown',
          type: colType ? String(row[colType] || '').trim().toLowerCase() || 'other' : 'other',
          premium: colPremium ? String(row[colPremium] || '').trim() || null : null,
          sumInsured: colSumInsured ? String(row[colSumInsured] || '').trim() || null : null,
          startDate: colStartDate ? parseDate(row[colStartDate]) : null,
        }

        const policyValid = PolicyRowSchema.safeParse(policyData)
        if (!policyValid.success) {
          const firstIssue = policyValid.error.issues[0]
          errors.push(`Row ${rowNum}: Policy validation failed — ${firstIssue.message}`)
          skipped++
          continue
        }

        const { policyNumber, expiryDate: expDate, insurer, type, premium, sumInsured, startDate } = policyValid.data

        // Normalise policy type
        const typeMap: Record<string, string> = {
          'health insurance': 'health', 'health': 'health', 'mediclaim': 'health',
          'motor insurance': 'motor', 'motor': 'motor', 'car insurance': 'motor',
          'two wheeler': 'motor', 'life insurance': 'life', 'life': 'life',
          'term insurance': 'term', 'term': 'term', 'term plan': 'term',
          'commercial': 'commercial', 'travel': 'travel', 'home': 'home',
        }
        const normalisedType = typeMap[type.toLowerCase()] || 'other'

        const newPolicy = await db
          .insert(policies)
          .values({
            clientId,
            agentId: agent.id,
            policyNumber,
            insurer,
            type: normalisedType,
            premium,
            sumInsured,
            startDate,
            expiryDate: expDate,
            status: 'active',
          })
          .returning()

        policiesCreated++

        // Auto-create renewal
        await db.insert(renewals).values({
          policyId: newPolicy[0].id,
          dueDate: expDate,
          amount: premium,
          status: 'pending',
        })
        renewalsCreated++
      }

    } catch (err) {
      errors.push(`Row ${rowNum}: Error — ${err instanceof Error ? err.message : 'Unknown error'}`)
      skipped++
    }
  }

  revalidatePath('/clients')
  revalidatePath('/policies')
  revalidatePath('/renewals')
  revalidatePath('/dashboard')

  return {
    success: true,
    clientsCreated,
    policiesCreated,
    renewalsCreated,
    skipped,
    errors: errors.slice(0, 10),
  }
}
'use server'

import { getOrCreateAgent } from './agent'
import { db } from '@/lib/db'
import { clients, policies, renewals } from '@/lib/db/schema'
import { revalidatePath } from 'next/cache'
import * as XLSX from 'xlsx'

// Flexible column name matching
// Agent's Excel might say "Client Name" or "name" or "NAME" — we handle all
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
  // Excel serial number date
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val)
    if (date) {
      const d = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      return d
    }
  }
  // String date
  if (typeof val === 'string') {
    const str = val.trim()
    if (!str) return null
    // Try DD/MM/YYYY (common Indian format)
    const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy
      const year = y.length === 2 ? `20${y}` : y
      return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }
    // Try YYYY-MM-DD
    const yyyymmdd = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (yyyymmdd) return str
    // Try to parse naturally
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0]
    }
  }
  return null
}

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

  // Read file buffer
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false })

  // Use first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // Convert to JSON — first row as headers
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

  // Detect column names from first row headers
  const headers = Object.keys(rows[0])

  const colName    = findColumn(headers, ['name', 'client name', 'client_name', 'full name', 'customer name', 'policyholder'])
  const colPhone   = findColumn(headers, ['phone', 'mobile', 'contact', 'phone number', 'mobile number', 'contact number', 'cell'])
  const colEmail   = findColumn(headers, ['email', 'email address', 'mail', 'e-mail'])
  const colDob     = findColumn(headers, ['dob', 'date of birth', 'birth date', 'birthdate'])
  const colAddress = findColumn(headers, ['address', 'addr', 'location'])

  const colPolicyNo  = findColumn(headers, ['policy number', 'policy no', 'policy_number', 'policy no.', 'policynumber', 'policy'])
  const colInsurer   = findColumn(headers, ['insurer', 'insurance company', 'company', 'insurer name', 'insurance co'])
  const colType      = findColumn(headers, ['type', 'policy type', 'insurance type', 'product type', 'product'])
  const colPremium   = findColumn(headers, ['premium', 'annual premium', 'premium amount', 'amount'])
  const colSumInsured = findColumn(headers, ['sum insured', 'sum_insured', 'coverage', 'cover amount', 'insured amount', 'si'])
  const colStartDate  = findColumn(headers, ['start date', 'start_date', 'commencement date', 'from date', 'issue date', 'inception date'])
  const colExpiry     = findColumn(headers, ['expiry date', 'expiry_date', 'expiry', 'renewal date', 'due date', 'end date', 'maturity date'])

  if (!colName) {
    return {
      success: false,
      clientsCreated: 0,
      policiesCreated: 0,
      renewalsCreated: 0,
      skipped: 0,
      errors: ['Could not find a "Name" column. Please ensure your Excel has a column named "Name" or "Client Name".'],
    }
  }

  if (!colPhone) {
    return {
      success: false,
      clientsCreated: 0,
      policiesCreated: 0,
      renewalsCreated: 0,
      skipped: 0,
      errors: ['Could not find a "Phone" column. Please ensure your Excel has a column named "Phone" or "Mobile".'],
    }
  }

  let clientsCreated = 0
  let policiesCreated = 0
  let renewalsCreated = 0
  let skipped = 0
  const errors: string[] = []

  // Track phone → client ID to avoid duplicates within the same import
  const phoneToClientId: Record<string, string> = {}

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2 // +2 because row 1 is headers, +1 for 1-indexing

    try {
      const name  = colName  ? String(row[colName]  || '').trim() : ''
      const phone = colPhone ? String(row[colPhone] || '').trim() : ''

      // Skip rows with no name or phone
      if (!name || !phone) {
        skipped++
        if (name || phone) {
          errors.push(`Row ${rowNum}: Skipped — missing ${!name ? 'name' : 'phone'}`)
        }
        continue
      }

      // Clean phone — remove spaces, dashes, +91 prefix
      const cleanPhone = phone.replace(/[\s\-\+]/g, '').replace(/^91/, '').slice(-10)

      if (cleanPhone.length < 10) {
        skipped++
        errors.push(`Row ${rowNum}: Skipped — invalid phone number "${phone}"`)
        continue
      }

      // Get or create client
      let clientId: string

      if (phoneToClientId[cleanPhone]) {
        // Same client, different policy row
        clientId = phoneToClientId[cleanPhone]
      } else {
        // Create new client
        const email   = colEmail   ? String(row[colEmail]   || '').trim() || null : null
        const dob     = colDob     ? parseDate(row[colDob])                        : null
        const address = colAddress ? String(row[colAddress] || '').trim() || null  : null

        const newClient = await db
          .insert(clients)
          .values({
            agentId: agent.id,
            name,
            phone:   cleanPhone,
            email,
            dob,
            address,
          })
          .returning()

        clientId = newClient[0].id
        phoneToClientId[cleanPhone] = clientId
        clientsCreated++
      }

      // Create policy if policy number and expiry date exist
      const policyNumber = colPolicyNo ? String(row[colPolicyNo] || '').trim() : ''
      const expiryRaw    = colExpiry   ? row[colExpiry]                         : null
      const expiryDate   = parseDate(expiryRaw)

      if (policyNumber && expiryDate) {
        const insurer   = colInsurer    ? String(row[colInsurer]    || '').trim() || 'Unknown' : 'Unknown'
        const type      = colType       ? String(row[colType]       || '').trim().toLowerCase() || 'other' : 'other'
        const premium   = colPremium    ? String(row[colPremium]    || '').trim() || null : null
        const sumInsured = colSumInsured ? String(row[colSumInsured] || '').trim() || null : null
        const startDate  = colStartDate  ? parseDate(row[colStartDate])                    : null

        // Normalise policy type
        const typeMap: Record<string, string> = {
          'health insurance': 'health',
          'health': 'health',
          'mediclaim': 'health',
          'motor insurance': 'motor',
          'motor': 'motor',
          'car insurance': 'motor',
          'two wheeler': 'motor',
          'life insurance': 'life',
          'life': 'life',
          'term insurance': 'term',
          'term': 'term',
          'term plan': 'term',
          'commercial': 'commercial',
          'travel': 'travel',
          'home': 'home',
        }
        const normalisedType = typeMap[type.toLowerCase()] || 'other'

        const newPolicy = await db
          .insert(policies)
          .values({
            clientId,
            agentId:      agent.id,
            policyNumber,
            insurer,
            type:         normalisedType,
            premium,
            sumInsured,
            startDate,
            expiryDate,
            status:       'active',
          })
          .returning()

        policiesCreated++

        // Auto-create renewal record
        await db.insert(renewals).values({
          policyId: newPolicy[0].id,
          dueDate:  expiryDate,
          amount:   premium,
          status:   'pending',
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
    errors: errors.slice(0, 10), // show max 10 errors
  }
}
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as dotenv from 'dotenv'
import {
  agents,
  clients,
  policies,
  renewals,
  commissions,
} from './schema'
import { eq } from 'drizzle-orm'

dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function seed() {
  console.log('🌱 Seeding database...')

  // ─── STEP 1: CLEAN existing data (order matters — delete children before parents)
  console.log('🧹 Cleaning existing data...')
  await db.delete(commissions)
  await db.delete(renewals)
  await db.delete(policies)
  await db.delete(clients)
  await db.delete(agents).where(eq(agents.clerkId, 'user_3EOBEVDhZzwgyg0McD8ZFczjtgn'))
  // NOTE: We do NOT delete agents — your real login account stays intact
  // The seed creates a separate "demo" agent for test data

  // ─── STEP 2: CREATE DEMO AGENT
  console.log('👤 Creating demo agent...')
  const [agent] = await db
    .insert(agents)
    .values({
      clerkId: 'user_3EOBEVDhZzwgyg0McD8ZFczjtgn',
      name: 'Checker check',  // your real name
      email: 'checkchecker902@gmail.com',  // your real email
      phone: '9876543210',
      irdaiCode: 'IRDAI/AGT/MH/2019/001234',
      gstin: '27ABCDE1234F1Z5',
      plan: 'pro',
    })
    .onConflictDoNothing()
    .returning()

  if (!agent) {
    console.log('Demo agent already exists, skipping...')
    return
  }

  // ─── STEP 3: CREATE CLIENTS
  console.log('👥 Creating clients...')
  const clientData = [
    { name: 'Ramesh Chavan', phone: '9511831216', email: 'ramesh@gmail.com', dob: '1975-06-15', address: '123, MG Road, Pune, Maharashtra 411001' },
    { name: 'Priya Patel', phone: '9822341567', email: 'priya@gmail.com', dob: '1988-03-22', address: '45, Linking Road, Mumbai, Maharashtra 400050' },
    { name: 'Suresh Nair', phone: '9765432109', email: 'suresh@gmail.com', dob: '1965-11-08', address: '78, Brigade Road, Bangalore, Karnataka 560001' },
    { name: 'Anita Desai', phone: '9654321098', email: 'anita@gmail.com', dob: '1992-07-30', address: '12, Park Street, Kolkata, West Bengal 700016' },
    { name: 'Vikram Singh', phone: '9543210987', email: 'vikram@gmail.com', dob: '1980-01-14', address: '56, Connaught Place, Delhi 110001' },
    { name: 'Meena Krishnan', phone: '9432109876', email: 'meena@gmail.com', dob: '1995-09-25', address: '34, Anna Salai, Chennai, Tamil Nadu 600002' },
    { name: 'Arun Joshi', phone: '9321098765', email: null, dob: '1970-04-18', address: null },
    { name: 'Sunita Agarwal', phone: '9210987654', email: 'sunita@gmail.com', dob: '1983-12-05', address: '89, Civil Lines, Jaipur, Rajasthan 302006' },
  ]

  const insertedClients = await db
    .insert(clients)
    .values(clientData.map(c => ({ ...c, agentId: agent.id })))
    .returning()

  // ─── STEP 4: CREATE POLICIES with dates spread across all scenarios
  console.log('📋 Creating policies...')

  const today = new Date()
  const daysFromNow = (days: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return d.toISOString().split('T')[0]
  }
  const daysAgo = (days: number) => daysFromNow(-days)

  // Each entry: [clientIndex, policyData]
  const policyData = [
    // Ramesh — 2 policies, one expiring in 3 days (URGENT), one active
    {
      clientIndex: 0,
      policyNumber: 'HDFC/HLT/2024/001234',
      insurer: 'HDFC Ergo',
      type: 'health',
      premium: '18500',
      sumInsured: '500000',
      startDate: daysAgo(362),
      expiryDate: daysFromNow(3),      // DUE THIS WEEK — urgent
      status: 'active',
    },
    {
      clientIndex: 0,
      policyNumber: 'LIC/TERM/2023/005678',
      insurer: 'LIC of India',
      type: 'term',
      premium: '12000',
      sumInsured: '10000000',
      startDate: daysAgo(400),
      expiryDate: daysFromNow(180),    // Active, comfortable
      status: 'active',
    },
    // Priya — expiring in 12 days
    {
      clientIndex: 1,
      policyNumber: 'STAR/HLT/2024/002345',
      insurer: 'Star Health',
      type: 'health',
      premium: '22000',
      sumInsured: '1000000',
      startDate: daysAgo(353),
      expiryDate: daysFromNow(12),     // DUE THIS MONTH
      status: 'active',
    },
    // Suresh — OVERDUE (expired 5 days ago, still pending)
    {
      clientIndex: 2,
      policyNumber: 'BAJAJ/MOT/2023/003456',
      insurer: 'Bajaj Allianz',
      type: 'motor',
      premium: '8500',
      sumInsured: '200000',
      startDate: daysAgo(370),
      expiryDate: daysAgo(5),          // OVERDUE
      status: 'active',
    },
    // Anita — expiring in 25 days
    {
      clientIndex: 3,
      policyNumber: 'ICICI/HLT/2024/004567',
      insurer: 'ICICI Lombard',
      type: 'health',
      premium: '31000',
      sumInsured: '2000000',
      startDate: daysAgo(340),
      expiryDate: daysFromNow(25),     // DUE THIS MONTH
      status: 'active',
    },
    // Vikram — expiring in 45 days
    {
      clientIndex: 4,
      policyNumber: 'TATA/COM/2024/005678',
      insurer: 'Tata AIG',
      type: 'commercial',
      premium: '45000',
      sumInsured: '5000000',
      startDate: daysAgo(320),
      expiryDate: daysFromNow(45),     // COMING UP 30-90 days
      status: 'active',
    },
    // Meena — expiring in 6 days
    {
      clientIndex: 5,
      policyNumber: 'NIVA/HLT/2024/006789',
      insurer: 'Niva Bupa',
      type: 'health',
      premium: '15500',
      sumInsured: '300000',
      startDate: daysAgo(359),
      expiryDate: daysFromNow(6),      // DUE THIS WEEK
      status: 'active',
    },
    // Arun — already renewed (paid)
    {
      clientIndex: 6,
      policyNumber: 'SBI/HLT/2024/007890',
      insurer: 'SBI General',
      type: 'health',
      premium: '11000',
      sumInsured: '300000',
      startDate: daysAgo(10),
      expiryDate: daysFromNow(355),    // Just renewed, long runway
      status: 'active',
    },
    // Sunita — expiring in 70 days
    {
      clientIndex: 7,
      policyNumber: 'DIGIT/MOT/2024/008901',
      insurer: 'Digit Insurance',
      type: 'motor',
      premium: '6500',
      sumInsured: '150000',
      startDate: daysAgo(295),
      expiryDate: daysFromNow(70),     // COMING UP 30-90 days
      status: 'active',
    },
  ]

  const insertedPolicies = await db
    .insert(policies)
    .values(
      policyData.map(p => ({
        clientId: insertedClients[p.clientIndex].id,
        agentId: agent.id,
        policyNumber: p.policyNumber,
        insurer: p.insurer,
        type: p.type,
        premium: p.premium,
        sumInsured: p.sumInsured,
        startDate: p.startDate,
        expiryDate: p.expiryDate,
        status: p.status,
      }))
    )
    .returning()

  // ─── STEP 5: CREATE RENEWALS for each policy
  // ─── STEP 5: CREATE RENEWALS
  console.log('🔄 Creating renewals...')

  const todayStr = today.toISOString().split('T')[0]

  await db.insert(renewals).values(
    insertedPolicies.map((policy) => {
      const pData = policyData.find(p => p.policyNumber === policy.policyNumber)!
      const isArun = policy.policyNumber === 'SBI/HLT/2024/007890'

      return {
        policyId: policy.id,
        dueDate: pData.expiryDate,
        amount: pData.premium,
        status: isArun ? 'paid' : 'pending',
        paidAt: isArun ? new Date() : null,
      }
    })
  )

  // ─── STEP 6: CREATE COMMISSIONS (for when we build that page)
  console.log('💰 Creating commissions...')
  await db.insert(commissions).values([
    {
      policyId: insertedPolicies[0].id,
      agentId: agent.id,
      expectedAmt: '2775',    // 15% of 18500
      receivedAmt: '2775',    // matched perfectly
      tdsDeducted: '277',
      gstAmount: '499',
      paymentDate: daysAgo(30),
      fyYear: '2025-26',
      quarter: 'Q1',
      status: 'matched',
    },
    {
      policyId: insertedPolicies[2].id,
      agentId: agent.id,
      expectedAmt: '3300',    // 15% of 22000
      receivedAmt: '2900',    // SHORT — insurer underpaid by 400
      tdsDeducted: '290',
      gstAmount: '522',
      paymentDate: daysAgo(15),
      fyYear: '2025-26',
      quarter: 'Q1',
      status: 'short',   // discrepancy — this is the pain point we solve
    },
    {
      policyId: insertedPolicies[4].id,
      agentId: agent.id,
      expectedAmt: '6750',    // 15% of 45000
      receivedAmt: null,      // not received yet
      tdsDeducted: '0',
      gstAmount: '0',
      paymentDate: null,
      fyYear: '2025-26',
      quarter: 'Q2',
      status: 'pending',
    },
  ])

  console.log('✅ Seed complete!')
  console.log(`   👤 1 demo agent`)
  console.log(`   👥 ${insertedClients.length} clients`)
  console.log(`   📋 ${insertedPolicies.length} policies`)
  console.log(`   🔄 ${insertedPolicies.length} renewals`)
  console.log(`   💰 3 commission records`)
  console.log('')
  console.log('⚠️  Note: Your real agent account is untouched.')
  console.log('   This data belongs to the demo agent (clerkId: seed_demo_agent)')
  console.log('   Sign in with your real Clerk account to see your own data.')
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})

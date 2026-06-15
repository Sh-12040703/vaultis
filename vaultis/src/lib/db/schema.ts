import {
    pgTable,
    uuid,
    text,
    numeric,
    date,
    jsonb,
    timestamp,
    boolean,
  } from 'drizzle-orm/pg-core'
  
  // ─── AGENTS ───────────────────────────────────────────────
  // One row per insurance agent using Vaultis
  export const agents = pgTable('agents', {
    id:        uuid('id').primaryKey().defaultRandom(),
    clerkId:   text('clerk_id').unique().notNull(),
    name:      text('name').notNull(),
    email:     text('email').unique().notNull(),
    phone:     text('phone'),
    irdaiCode: text('irdai_code'),
    gstin:     text('gstin'),
    plan:      text('plan').default('free'),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // ─── CLIENTS ──────────────────────────────────────────────
  // Each agent's insurance clients
  export const clients = pgTable('clients', {
    id:        uuid('id').primaryKey().defaultRandom(),
    agentId:   uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    name:      text('name').notNull(),
    phone:     text('phone').notNull(),
    email:     text('email'),
    panMasked: text('pan_masked'),   // ABCXX1234X format only — never full PAN
    dob:       date('dob'),
    address:   text('address'),
    createdAt: timestamp('created_at').defaultNow(),
  })
  
  // ─── POLICIES ─────────────────────────────────────────────
  // Each insurance policy belonging to a client
  export const policies = pgTable('policies', {
    id:            uuid('id').primaryKey().defaultRandom(),
    clientId:      uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    agentId:       uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    policyNumber:  text('policy_number').notNull(),
    insurer:       text('insurer').notNull(),
    type:          text('type').notNull(),      // health | motor | life | term | commercial
    premium:       numeric('premium', { precision: 12, scale: 2 }),
    sumInsured:    numeric('sum_insured', { precision: 14, scale: 2 }),
    startDate:     date('start_date'),
    expiryDate:    date('expiry_date').notNull(),
    status:        text('status').default('active'), // active | expired | lapsed | renewed
    pdfUrl:        text('pdf_url'),                  // R2 storage key
    extractedData: jsonb('extracted_data'),          // Claude API output (Week 3)
    summaryText:   text('summary_text'),             // Plain language summary (Week 3)
    createdAt:     timestamp('created_at').defaultNow(),
  })
  
  // ─── COMMISSIONS ──────────────────────────────────────────
  // Commission tracking per policy
  export const commissions = pgTable('commissions', {
    id:            uuid('id').primaryKey().defaultRandom(),
    policyId:      uuid('policy_id').notNull().references(() => policies.id, { onDelete: 'cascade' }),
    agentId:       uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
    expectedAmt:   numeric('expected_amt', { precision: 10, scale: 2 }),
    receivedAmt:   numeric('received_amt', { precision: 10, scale: 2 }),
    tdsDeducted:   numeric('tds_deducted', { precision: 10, scale: 2 }).default('0'),
    gstAmount:     numeric('gst_amount', { precision: 10, scale: 2 }).default('0'),
    paymentDate:   date('payment_date'),
    fyYear:        text('fy_year'),    // '2025-26'
    quarter:       text('quarter'),    // Q1 | Q2 | Q3 | Q4
    status:        text('status').default('pending'), // pending | matched | short | disputed
    statementUrl:  text('statement_url'),
    createdAt:     timestamp('created_at').defaultNow(),
  })
  
  // ─── RENEWALS ─────────────────────────────────────────────
  // Renewal tracking with payment links
  export const renewals = pgTable('renewals', {
    id:            uuid('id').primaryKey().defaultRandom(),
    policyId:      uuid('policy_id').notNull().references(() => policies.id, { onDelete: 'cascade' }),
    dueDate:       date('due_date').notNull(),
    paymentLink:   text('payment_link'),      // Razorpay link URL (Week 2)
    rzpOrderId:    text('rzp_order_id'),
    amount:        numeric('amount', { precision: 10, scale: 2 }),
    status:        text('status').default('pending'), // pending | paid | lapsed
    paidAt:        timestamp('paid_at'),
    remindersSent: jsonb('reminders_sent').default('[]'),
    createdAt:     timestamp('created_at').defaultNow(),
  })
  
  // ─── CLAIMS ───────────────────────────────────────────────
  // Claim tracking (Week 3+)
  export const claims = pgTable('claims', {
    id:           uuid('id').primaryKey().defaultRandom(),
    policyId:     uuid('policy_id').notNull().references(() => policies.id, { onDelete: 'cascade' }),
    clientId:     uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
    incidentDate: date('incident_date'),
    description:  text('description'),
    predicted:    jsonb('predicted'),     // Claude prediction output
    status:       text('status').default('draft'),
    draftEmail:   text('draft_email'),
    createdAt:    timestamp('created_at').defaultNow(),
  })
  
  // ─── TYPE EXPORTS ─────────────────────────────────────────
  // TypeScript types inferred from schema — use these everywhere
  export type Agent      = typeof agents.$inferSelect
  export type NewAgent   = typeof agents.$inferInsert
  export type Client     = typeof clients.$inferSelect
  export type NewClient  = typeof clients.$inferInsert
  export type Policy     = typeof policies.$inferSelect
  export type NewPolicy  = typeof policies.$inferInsert
  export type Commission = typeof commissions.$inferSelect
  export type Renewal    = typeof renewals.$inferSelect
  export type Claim      = typeof claims.$inferSelect
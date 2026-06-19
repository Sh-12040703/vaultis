import { getOrCreateAgent } from '@/lib/actions/agent'
import { addRateCard, deleteRateCard } from '@/lib/actions/rate-cards'
import { db } from '@/lib/db'
import { rateCards } from '@/lib/db/schema'
import { eq, isNull } from 'drizzle-orm'
import { SubmitButton } from '@/components/ui/submit-button'
import Link from 'next/link'
import { ArrowLeft, Trash2, Info } from 'lucide-react'

const INSURERS = [
  'LIC of India',
  'HDFC Ergo',
  'Bajaj Allianz',
  'Star Health',
  'ICICI Lombard',
  'New India Assurance',
  'SBI General',
  'Tata AIG',
  'Reliance General',
  'United India Insurance',
  'Care Health Insurance',
  'Niva Bupa',
  'Digit Insurance',
  'Acko Insurance',
  'Other',
]

const PRODUCT_TYPES = [
  { value: 'health',     label: 'Health Insurance' },
  { value: 'motor',      label: 'Motor Insurance' },
  { value: 'life',       label: 'Life Insurance' },
  { value: 'term',       label: 'Term Insurance' },
  { value: 'commercial', label: 'Commercial / SME' },
  { value: 'travel',     label: 'Travel Insurance' },
  { value: 'home',       label: 'Home Insurance' },
]

const POLICY_YEARS = [
  { value: '1',       label: 'Year 1 (First Year)' },
  { value: '2',       label: 'Year 2' },
  { value: '3',       label: 'Year 3' },
  { value: 'renewal', label: 'Renewal (Year 4+)' },
]

// Default industry rate cards — pre-filled as reference
const DEFAULT_RATES = [
  { insurer: 'LIC of India',   productType: 'life',   policyYear: '1',       ratePct: '25', notes: 'Standard LIC life first year' },
  { insurer: 'LIC of India',   productType: 'life',   policyYear: 'renewal', ratePct: '5',  notes: 'LIC renewal standard' },
  { insurer: 'Star Health',    productType: 'health',  policyYear: '1',       ratePct: '15', notes: 'Star Health first year' },
  { insurer: 'Star Health',    productType: 'health',  policyYear: 'renewal', ratePct: '10', notes: 'Star Health renewal' },
  { insurer: 'HDFC Ergo',      productType: 'health',  policyYear: '1',       ratePct: '15', notes: 'HDFC Ergo health' },
  { insurer: 'HDFC Ergo',      productType: 'motor',   policyYear: '1',       ratePct: '15', notes: 'HDFC Ergo motor OD' },
  { insurer: 'Bajaj Allianz',  productType: 'motor',   policyYear: '1',       ratePct: '17.5', notes: 'Bajaj motor OD' },
  { insurer: 'ICICI Lombard',  productType: 'health',  policyYear: '1',       ratePct: '15', notes: 'ICICI health standard' },
  { insurer: 'ICICI Lombard',  productType: 'motor',   policyYear: '1',       ratePct: '15', notes: 'ICICI motor OD' },
]

export default async function RateCardsPage() {
  const agent = await getOrCreateAgent()
  if (!agent) return null

  // Get all active rate cards (no effectiveTo = currently active)
  const activeCards = await db
    .select()
    .from(rateCards)
    .where(
      eq(rateCards.agentId, agent.id) &&
      isNull(rateCards.effectiveTo)
    )
    .orderBy(rateCards.insurer)

  // Use drizzle properly
  const { and: drizzleAnd } = await import('drizzle-orm')

  const cards = await db
    .select()
    .from(rateCards)
    .where(
      drizzleAnd(
        eq(rateCards.agentId, agent.id),
        isNull(rateCards.effectiveTo)
      )
    )
    .orderBy(rateCards.insurer, rateCards.productType)

  return (
    <div className="p-8 max-w-5xl space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/commissions"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Commissions
        </Link>
        <h1 className="text-2xl font-bold text-white">Commission Rate Cards</h1>
        <p className="text-slate-400 text-sm mt-1">
          Set your commission rates per insurer — used to auto-calculate expected commission
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex gap-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-slate-300 text-sm space-y-1">
          <p>These rates are used by the reconciliation engine to calculate what you <strong>should</strong> have received vs what you actually received.</p>
          <p className="text-slate-500 text-xs">Under IRDAI EOM Regulations 2024, insurers set their own rates within IRDAI caps. Update these when your insurer changes rates.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Add Rate Card Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-white font-semibold text-sm">Add Rate Card</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Adding a new rate for an existing insurer+product+year will replace the old one
            </p>
          </div>

          <form action={addRateCard} className="p-5 space-y-4">

            {/* Insurer */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Insurer <span className="text-red-400">*</span>
              </label>
              <select
                name="insurer"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select insurer...</option>
                {INSURERS.map(ins => (
                  <option key={ins} value={ins}>{ins}</option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Product Type <span className="text-red-400">*</span>
              </label>
              <select
                name="productType"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select type...</option>
                {PRODUCT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Policy Year */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Policy Year <span className="text-red-400">*</span>
              </label>
              <select
                name="policyYear"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="">Select year...</option>
                {POLICY_YEARS.map(y => (
                  <option key={y.value} value={y.value}>{y.label}</option>
                ))}
              </select>
            </div>

            {/* Rate % */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Commission Rate (%) <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <input
                  name="ratePct"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  placeholder="15"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
              </div>
            </div>

            {/* Effective From */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Effective From <span className="text-red-400">*</span>
              </label>
              <input
                name="effectiveFrom"
                type="date"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-slate-300 text-sm font-medium">
                Notes
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </label>
              <input
                name="notes"
                type="text"
                placeholder="e.g. Updated after HDFC circular Oct 2025"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            <SubmitButton label="Add Rate Card" loadingLabel="Saving..." />

          </form>
        </div>

        {/* Current Rate Cards */}
        <div className="space-y-4">

          {/* Default reference rates */}
          {cards.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-semibold text-sm">
                  Industry Reference Rates
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Approximate current market rates — add your actual rates using the form
                </p>
              </div>
              <div className="divide-y divide-slate-800">
                {DEFAULT_RATES.map((rate, i) => (
                  <div key={i} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-white text-xs font-medium">
                        {rate.insurer} — {rate.productType}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        Year {rate.policyYear} · {rate.notes}
                      </div>
                    </div>
                    <div className="text-green-400 font-bold text-sm">
                      {rate.ratePct}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agent's actual rate cards */}
          {cards.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800">
                <h2 className="text-white font-semibold text-sm">
                  Your Rate Cards
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {cards.length} active rate{cards.length !== 1 ? 's' : ''} — used for reconciliation
                </p>
              </div>
              <div className="divide-y divide-slate-800">
                {cards.map((card) => (
                  <div key={card.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-white text-xs font-medium truncate">
                        {card.insurer}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {card.productType} · Year {card.policyYear}
                        {card.notes && ` · ${card.notes}`}
                      </div>
                      <div className="text-slate-600 text-xs mt-0.5">
                        From {new Date(card.effectiveFrom).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-green-400 font-bold text-sm">
                        {card.ratePct}%
                      </div>
                      <form action={async () => {
                        'use server'
                        await deleteRateCard(card.id)
                      }}>
                        <button
                          type="submit"
                          className="text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}
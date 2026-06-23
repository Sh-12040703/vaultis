'use client'

import { useState } from 'react'
import {
  reconcileStatement,
  generateDisputeEmail,
  type ReconciliationResult,
} from '@/lib/actions/reconcile'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Copy,
  Loader2,
  FileText,
} from 'lucide-react'

const INSURERS = [
  'LIC of India', 'HDFC Ergo', 'Bajaj Allianz', 'Star Health',
  'ICICI Lombard', 'New India Assurance', 'SBI General', 'Tata AIG',
  'Reliance General', 'United India Insurance', 'Care Health Insurance',
  'Niva Bupa', 'Digit Insurance', 'Acko Insurance', 'Other',
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'matched') return (
    <span className="flex items-center gap-1 bg-green-500/10 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
      <CheckCircle className="w-3 h-3" /> Matched
    </span>
  )
  if (status === 'short') return (
    <span className="flex items-center gap-1 bg-red-500/10 text-red-400 text-xs font-medium px-2 py-0.5 rounded-full">
      <AlertCircle className="w-3 h-3" /> Short Paid
    </span>
  )
  if (status === 'overpaid') return (
    <span
      title="Insurer paid more than your rate card — verify if rate card needs updating"
      className="flex items-center gap-1 bg-blue-500/10 text-blue-400 text-xs font-medium px-2 py-0.5 rounded-full cursor-help"
    >
      Overpaid ↑
    </span>
  )
  
  return (
    <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 text-xs font-medium px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> No Rate Card
    </span>
  )
}

export default function ReconcilePage() {
  const [file, setFile]           = useState<File | null>(null)
  const [insurer, setInsurer]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<ReconciliationResult | null>(null)
  const [disputeEmail, setDisputeEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [copied, setCopied]       = useState(false)

  async function handleReconcile() {
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('insurer', insurer)
      const res = await reconcileStatement(formData)
      setResult(res)
    } catch (err) {
      setResult({
        success: false, insurer, statementDate: '',
        lines: [], totalExpected: 0, totalReceived: 0,
        totalShort: 0, totalTDS: 0,
        errors: [err instanceof Error ? err.message : 'Reconciliation failed'],
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateEmail() {
    if (!result) return
    setEmailLoading(true)
    try {
      // Get agent name from result
      const email = await generateDisputeEmail(
        'Agent',
        result.insurer,
        result.lines
      )
      setDisputeEmail(email)
    } finally {
      setEmailLoading(false)
    }
  }

  function copyEmail() {
    navigator.clipboard.writeText(disputeEmail)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortCount = result?.lines.filter(l => l.status === 'short').length ?? 0

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/commissions"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Commissions</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">
          Commission Reconciliation
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload your commission statement — AI extracts every line and flags discrepancies instantly
        </p>
      </div>

      {/* Upload Section */}
      {!result && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-5">

          {/* Insurer select */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Insurer
              <span className="text-slate-500 font-normal ml-1">
                (optional — AI will detect from document)
              </span>
            </label>
            <select
              value={insurer}
              onChange={e => setInsurer(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Auto-detect from document</option>
              {INSURERS.map(ins => (
                <option key={ins} value={ins}>{ins}</option>
              ))}
            </select>
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <label className="text-slate-300 text-sm font-medium">
              Commission Statement <span className="text-red-400">*</span>
            </label>
            <div
              onClick={() => document.getElementById('stmt-file')?.click()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                file
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'
              }`}
            >
              <input
                id="stmt-file"
                type="file"
                accept=".pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setFile(f)
                }}
              />
              {file ? (
                <div className="space-y-1">
                  <FileText className="w-8 h-8 text-green-400 mx-auto" />
                  <p className="text-white text-sm font-medium truncate max-w-[200px] mx-auto">{file.name}</p>
                  <p className="text-slate-500 text-xs">
                    {(file.size / 1024).toFixed(1)} KB · Click to change
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-white text-sm">
                    Drop your commission statement here
                  </p>
                  <p className="text-slate-500 text-xs">
                    PDF, Excel or CSV — commission statements from any insurer
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleReconcile}
            disabled={!file || loading}
            className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-all text-sm ${
              !file || loading
                ? 'bg-blue-500/40 text-white/50 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analysing statement...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Reconcile Statement
              </>
            )}
          </button>

          {loading && (
            <p className="text-slate-500 text-xs text-center">
              Claude is reading your statement and extracting commission lines.
              This takes 10–30 seconds depending on document size.
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {result && !result.success && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 sm:p-6 space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-white font-semibold">Reconciliation Failed</h3>
          </div>
          <p className="text-slate-400 text-sm">{result.errors[0]}</p>
          <button
            onClick={() => { setResult(null); setFile(null) }}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <div className="space-y-5">

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Expected</div>
              <div className="text-xl font-bold text-white">
                ₹{result.totalExpected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">Received</div>
              <div className="text-xl font-bold text-green-400">
                ₹{result.totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className={`border rounded-xl p-4 ${
              result.totalShort > 0
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-slate-900 border-slate-800'
            }`}>
              <div className="text-slate-400 text-xs mb-1">Short Paid</div>
              <div className={`text-xl font-bold ${
                result.totalShort > 0 ? 'text-red-400' : 'text-slate-400'
              }`}>
                ₹{result.totalShort.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="text-slate-400 text-xs mb-1">TDS Deducted</div>
              <div className="text-xl font-bold text-purple-400">
                ₹{result.totalTDS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Result header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-white font-semibold">
                {result.insurer} · {result.lines.length} policies
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Statement date: {result.statementDate} ·{' '}
                {shortCount > 0
                  ? `${shortCount} discrepancies found`
                  : 'All lines matched'}
              </p>
            </div>
            <button
              onClick={() => { setResult(null); setFile(null); setDisputeEmail('') }}
              className="text-slate-400 hover:text-white text-sm border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              Upload Another
            </button>
          </div>

          {/* ── Lines table / cards ────────────────────────────────── */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    {[
                      'Policy No.', 'Insured', 'Premium',
                      'Expected', 'Received', 'TDS', 'Difference', 'Status'
                    ].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {result.lines.map((line, i) => (
                    <tr
                      key={i}
                      className={`transition-colors ${
                        line.status === 'short'
                          ? 'bg-red-500/5 hover:bg-red-500/10'
                          : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                        {line.policy_number}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        {line.insured_name}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs">
                        ₹{Number(line.gross_premium).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-slate-300 text-xs font-medium">
                        ₹{line.expected_net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        {line.expected_rate > 0 && (
                          <span className="text-slate-600 ml-1">
                            ({line.expected_rate}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-green-400 text-xs font-medium">
                        ₹{Number(line.net_paid).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3 text-purple-400 text-xs">
                        {line.tds_deducted > 0
                          ? `₹${Number(line.tds_deducted).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold">
                        {Math.abs(line.discrepancy) < 1 ? (
                          <span className="text-slate-500">—</span>
                        ) : line.discrepancy > 0 ? (
                          <span className="text-red-400">
                            -₹{line.discrepancy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        ) : (
                          <span className="text-green-400">
                            +₹{Math.abs(line.discrepancy).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={line.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden p-4 space-y-4">
              {result.lines.map((line, i) => (
                <div
                  key={i}
                  className={`bg-slate-800 border rounded-xl p-4 space-y-3 ${
                    line.status === 'short'
                      ? 'border-red-500/30 bg-red-500/5'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-white font-medium">{line.insured_name}</div>
                      <div className="text-slate-400 text-xs font-mono">{line.policy_number}</div>
                    </div>
                    <StatusBadge status={line.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <div>
                      <span className="text-slate-500">Premium:</span>{' '}
                      <span className="text-slate-300">
                        ₹{Number(line.gross_premium).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Expected:</span>{' '}
                      <span className="text-slate-300">
                        ₹{line.expected_net.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        {line.expected_rate > 0 && (
                          <span className="text-slate-500 ml-1">({line.expected_rate}%)</span>
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Received:</span>{' '}
                      <span className="text-green-400">
                        ₹{Number(line.net_paid).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">TDS:</span>{' '}
                      <span className="text-purple-400">
                        {line.tds_deducted > 0
                          ? `₹${Number(line.tds_deducted).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                          : '—'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Difference:</span>{' '}
                      {Math.abs(line.discrepancy) < 1 ? (
                        <span className="text-slate-500">—</span>
                      ) : line.discrepancy > 0 ? (
                        <span className="text-red-400 font-semibold">
                          -₹{line.discrepancy.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      ) : (
                        <span className="text-green-400 font-semibold">
                          +₹{Math.abs(line.discrepancy).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dispute email section */}
          {shortCount > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-white font-semibold">
                    Dispute Email
                  </h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Auto-drafted for {shortCount} short-paid {shortCount === 1 ? 'policy' : 'policies'}
                  </p>
                </div>
                {!disputeEmail && (
                  <button
                    onClick={handleGenerateEmail}
                    disabled={emailLoading}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    {emailLoading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting...</>
                    ) : (
                      'Draft Dispute Email'
                    )}
                  </button>
                )}
              </div>

              {disputeEmail && (
                <div className="space-y-3">
                  <div className="bg-slate-800 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed break-words">
                      {disputeEmail}
                    </pre>
                  </div>
                  <button
                    onClick={copyEmail}
                    className="flex items-center gap-2 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? 'Copied!' : 'Copy Email'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* All matched */}
          {shortCount === 0 && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 sm:p-5 flex items-start sm:items-center gap-4 flex-col sm:flex-row">
              <CheckCircle className="w-8 h-8 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white font-semibold">
                  All commissions match
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {result.insurer} paid the correct amount on all {result.lines.length} policies.
                  All entries saved to your commission ledger.
                </p>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Brain, Mail, Copy, CheckCircle,
  Clock, FileCheck, AlertCircle, XCircle, Loader2
} from 'lucide-react'
import {
  updateClaimStatus,
  generateClaimPreCheck,
  generateClaimEmail,
} from '@/lib/actions/claims'

const STATUSES = [
  { value: 'draft',               label: 'Draft' },
  { value: 'intimated',           label: 'Intimated to Insurer' },
  { value: 'documents_submitted', label: 'Documents Submitted' },
  { value: 'under_review',        label: 'Under Review' },
  { value: 'approved',            label: 'Approved' },
  { value: 'settled',             label: 'Settled' },
  { value: 'rejected',            label: 'Rejected' },
]

const STATUS_COLORS: Record<string, string> = {
  draft:               'text-slate-400',
  intimated:           'text-blue-400',
  documents_submitted: 'text-amber-400',
  under_review:        'text-purple-400',
  approved:            'text-green-400',
  settled:             'text-teal-400',
  rejected:            'text-red-400',
}

export default function ClaimDetailPage() {
  const params   = useParams()
  const claimId  = params.id as string

  const [claim, setClaim]             = useState<any>(null)
  const [loading, setLoading]         = useState(true)
  const [preCheck, setPreCheck]       = useState('')
  const [preCheckLoading, setPreCheckLoading] = useState(false)
  const [email, setEmail]             = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [copied, setCopied]           = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState(false)

  useEffect(() => {
    fetchClaim()
  }, [claimId])

  async function fetchClaim() {
    const res  = await fetch(`/api/claims/${claimId}`)
    const data = await res.json()
    setClaim(data)
    if (data?.predicted?.analysis) {
      setPreCheck(data.predicted.analysis)
    }
    setLoading(false)
  }

  async function handleStatusUpdate(status: string) {
    setStatusUpdating(true)
    await updateClaimStatus(claimId, status)
    await fetchClaim()
    setStatusUpdating(false)
  }

  async function handlePreCheck() {
    setPreCheckLoading(true)
    const policyInfo = `
      Insurer: ${claim.insurer}
      Policy Type: ${claim.type}
      Policy Number: ${claim.policyNumber}
      Sum Insured: ${claim.sumInsured}
      Premium: ${claim.premium}
    `
    const result = await generateClaimPreCheck(claimId, claim.description, policyInfo)
    setPreCheck(result)
    setPreCheckLoading(false)
  }

  async function handleGenerateEmail() {
    setEmailLoading(true)
    const result = await generateClaimEmail(
      claim.clientName,
      claim.policyNumber,
      claim.insurer,
      claim.description,
      claim.incidentDate || 'Not specified'
    )
    setEmail(result)
    setEmailLoading(false)
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
      </div>
    )
  }

  if (!claim) {
    return (
      <div className="p-8">
        <p className="text-slate-400">Claim not found</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/claims"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Claims
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Claim — {claim.clientName}
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {claim.policyNumber} · {claim.insurer} · {claim.type}
            </p>
          </div>
          <span className={`text-sm font-semibold ${STATUS_COLORS[claim.status] || 'text-slate-400'}`}>
            {STATUSES.find(s => s.value === claim.status)?.label || 'Draft'}
          </span>
        </div>
      </div>

      {/* Claim info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold text-sm">Claim Details</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-slate-500 text-xs mb-1">Client</div>
            <div className="text-white">{claim.clientName}</div>
          </div>
          <div>
            <div className="text-slate-500 text-xs mb-1">Incident Date</div>
            <div className="text-white">
              {claim.incidentDate
                ? new Date(claim.incidentDate).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })
                : '—'}
            </div>
          </div>
          <div className="col-span-2">
            <div className="text-slate-500 text-xs mb-1">Description</div>
            <div className="text-slate-300">{claim.description}</div>
          </div>
        </div>
      </div>

      {/* Status Update */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h2 className="text-white font-semibold text-sm">Update Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => handleStatusUpdate(s.value)}
              disabled={statusUpdating || claim.status === s.value}
              className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                claim.status === s.value
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gemini Pre-Check */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">AI Claim Pre-Check</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Gemini analyzes the policy and predicts likely claim outcome
            </p>
          </div>
          {!preCheck && (
            <button
              onClick={handlePreCheck}
              disabled={preCheckLoading}
              className="flex items-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {preCheckLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analysing...</>
              ) : (
                <><Brain className="w-3.5 h-3.5" /> Run Pre-Check</>
              )}
            </button>
          )}
        </div>

        {preCheck ? (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-lg p-4">
              <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                {preCheck}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(preCheck)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={handlePreCheck}
                disabled={preCheckLoading}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                {preCheckLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3" />}
                Re-run
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-slate-500 text-sm">
              Click Run Pre-Check to get an AI analysis of likely claim outcome
            </p>
          </div>
        )}
      </div>

      {/* Claim Email */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-sm">Claim Intimation Email</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Auto-drafted email to send to {claim.insurer}
            </p>
          </div>
          {!email && (
            <button
              onClick={handleGenerateEmail}
              disabled={emailLoading}
              className="flex items-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {emailLoading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting...</>
              ) : (
                <><Mail className="w-3.5 h-3.5" /> Draft Email</>
              )}
            </button>
          )}
        </div>

        {email ? (
          <div className="space-y-3">
            <div className="bg-slate-800 rounded-lg p-4">
              <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans leading-relaxed">
                {email}
              </pre>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(email)
                setCopiedEmail(true)
                setTimeout(() => setCopiedEmail(false), 2000)
              }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy className="w-3 h-3" />
              {copiedEmail ? 'Copied!' : 'Copy Email'}
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/50 rounded-lg p-4 text-center">
            <p className="text-slate-500 text-sm">
              Click Draft Email to generate a claim intimation letter
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
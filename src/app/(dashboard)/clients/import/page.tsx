'use client'

import { useState, useRef } from 'react'
import { importFromExcel, type ImportResult } from '@/lib/actions/import'
import Link from 'next/link'
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
} from 'lucide-react'

export default function ImportPage() {
  const [file, setFile]           = useState<File | null>(null)
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [dragOver, setDragOver]   = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      alert('Please upload an Excel file (.xlsx, .xls) or CSV file')
      return
    }
    setFile(f)
    setResult(null)
  }

  async function handleSubmit() {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await importFromExcel(formData)
      setResult(res)
    } catch (err) {
      setResult({
        success: false,
        clientsCreated: 0,
        policiesCreated: 0,
        renewalsCreated: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Import failed'],
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <Link
          href="/clients"
          className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Clients
        </Link>
        <h1 className="text-2xl font-bold text-white">Import from Excel</h1>
        <p className="text-slate-400 text-sm mt-1">
          Upload your existing client list and policies from Excel or CSV
        </p>
      </div>

      {/* Instructions */}
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
        <h3 className="text-blue-400 font-semibold text-sm">
          How to prepare your Excel file
        </h3>
        <div className="space-y-1.5">
          {[
            'First row must be column headers',
            'Required columns: Name, Phone',
            'Optional client columns: Email, DOB, Address',
            'Optional policy columns: Policy Number, Insurer, Type, Premium, Sum Insured, Start Date, Expiry Date',
            'Column names are flexible — "Mobile", "Contact" and "Phone" all work',
            'Date format: DD/MM/YYYY or YYYY-MM-DD',
            'One row per policy — if a client has 2 policies, add 2 rows with same name and phone',
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-slate-300 text-xs">
              <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
              {tip}
            </div>
          ))}
        </div>
      </div>

      {/* Sample format */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-3">
          Sample Excel format
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700">
                {['Name', 'Phone', 'Email', 'Policy Number', 'Insurer', 'Type', 'Premium', 'Expiry Date'].map(h => (
                  <th key={h} className="text-left text-slate-400 font-medium px-2 py-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/50">
                {['Ramesh Kumar', '9876543210', 'r@gmail.com', 'P/2024/001', 'Star Health', 'Health', '18000', '15/03/2027'].map((v, i) => (
                  <td key={i} className="text-slate-300 px-2 py-2 whitespace-nowrap font-mono">
                    {v}
                  </td>
                ))}
              </tr>
              <tr>
                {['Priya Sharma', '9123456789', '', 'MH01AB1234', 'Bajaj Allianz', 'Motor', '12000', '20/06/2026'].map((v, i) => (
                  <td key={i} className="text-slate-300 px-2 py-2 whitespace-nowrap font-mono">
                    {v}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload area */}
      {!result && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-500/5'
              : file
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-slate-700 hover:border-slate-500 bg-slate-900'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />

          {file ? (
            <div className="space-y-2">
              <FileSpreadsheet className="w-10 h-10 text-green-400 mx-auto" />
              <p className="text-white font-medium">{file.name}</p>
              <p className="text-slate-500 text-sm">
                {(file.size / 1024).toFixed(1)} KB
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 mx-auto transition-colors"
              >
                <X className="w-3 h-3" />
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Upload className="w-10 h-10 text-slate-500 mx-auto" />
              <div>
                <p className="text-white font-medium">
                  Drop your Excel file here
                </p>
                <p className="text-slate-500 text-sm mt-1">
                  or click to browse — .xlsx, .xls, .csv supported
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import button */}
      {file && !result && (
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-lg transition-all text-sm ${
            loading
              ? 'bg-blue-500/50 text-white/70 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Importing...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Import {file.name}
            </>
          )}
        </button>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {result.success && result.clientsCreated > 0 ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
                <h3 className="text-white font-semibold">Import Complete</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {result.clientsCreated}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    Clients created
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">
                    {result.policiesCreated}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    Policies imported
                  </div>
                </div>
                <div className="bg-slate-900 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {result.skipped}
                  </div>
                  <div className="text-slate-400 text-xs mt-1">
                    Rows skipped
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/clients"
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm text-center"
                >
                  View Clients →
                </Link>
                <button
                  onClick={() => { setFile(null); setResult(null) }}
                  className="px-5 py-2.5 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors text-sm"
                >
                  Import Another
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 space-y-3">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <h3 className="text-white font-semibold">Import Failed</h3>
              </div>
              <p className="text-slate-400 text-sm">
                {result.errors[0] || 'Something went wrong'}
              </p>
              <button
                onClick={() => { setFile(null); setResult(null) }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Show row errors if any */}
          {result.errors.length > 0 && result.clientsCreated > 0 && (
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 space-y-2">
              <h4 className="text-amber-400 font-medium text-sm">
                {result.errors.length} rows had issues
              </h4>
              {result.errors.map((err, i) => (
                <p key={i} className="text-slate-400 text-xs font-mono">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
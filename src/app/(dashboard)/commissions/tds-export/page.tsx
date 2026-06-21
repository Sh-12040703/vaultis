'use client'

import { useState, useEffect } from 'react'
import { getTDSSummary, getAvailableFYYears, type TDSSummary } from '@/lib/actions/tds-export'
import Link from 'next/link'
import { ArrowLeft, Download, FileText, IndianRupee } from 'lucide-react'

export default function TDSExportPage() {
    const [fyYears, setFyYears] = useState<string[]>([])
    const [selectedFY, setSelectedFY] = useState('')
    const [data, setData] = useState<{
        rows: TDSSummary[]
        totalTDS: number
        totalExpected: number
        totalReceived: number
        fyYear: string
    } | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            const years = await getAvailableFYYears()
            setFyYears(years)

            const now = new Date()
            const currentFY = now.getMonth() >= 3
                ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
                : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`

            const defaultFY = years.includes(currentFY) ? currentFY : years[0] || currentFY
            setSelectedFY(defaultFY)

            const summary = await getTDSSummary(defaultFY)
            setData(summary)
            setLoading(false)
        }
        load()
    }, [])

    async function handleFYChange(fy: string) {
        setSelectedFY(fy)
        setLoading(true)
        const summary = await getTDSSummary(fy)
        setData(summary)
        setLoading(false)
    }

    function downloadCSV() {
        if (!data || data.rows.length === 0) return

        const headers = [
            'Financial Year',
            'Quarter',
            'Payment Date',
            'Policy Number',
            'Insurer',
            'Client Name',
            'Expected Commission (Rs.)',
            'Received Commission (Rs.)',
            'TDS Deducted (Rs.)',
        ]

        const csvRows = data.rows.map(row => [
            row.fyYear,
            row.quarter ?? '',
            row.paymentDate ?? '',
            row.policyNumber,
            row.insurer,
            row.clientName,
            Number(row.expectedAmt).toFixed(2),
            Number(row.receivedAmt).toFixed(2),
            Number(row.tdsDeducted).toFixed(2),
        ])

        // Add totals row
        csvRows.push([])
        csvRows.push([
            'TOTAL', '', '', '', '', '',
            data.totalExpected.toFixed(2),
            data.totalReceived.toFixed(2),
            data.totalTDS.toFixed(2),
        ])

        // Add summary for CA
        csvRows.push([])
        csvRows.push(['TDS SUMMARY FOR ITR FILING'])
        csvRows.push([`Financial Year: FY ${data.fyYear}`])
        csvRows.push([`Total Commission Earned: Rs.${data.totalExpected.toFixed(2)}`])
        csvRows.push([`Total Commission Received: Rs.${data.totalReceived.toFixed(2)}`])
        csvRows.push([`Total TDS Deducted (Sec 194D): Rs.${data.totalTDS.toFixed(2)}`])
        csvRows.push([`Short Paid: Rs.${(data.totalExpected - data.totalReceived).toFixed(2)}`])
        csvRows.push([''])
        csvRows.push(['Note: TDS deducted under Section 194D of Income Tax Act'])
        csvRows.push(['Cross-reference with Form 26AS before filing ITR'])

        const csvContent = [
            headers.join(','),
            ...csvRows.map(row =>
                row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            )
        ].join('\n')

        const BOM = '\uFEFF' // UTF-8 BOM — forces Excel to read ₹ correctly
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `Vaultis_TDS_Report_FY${data.fyYear}.csv`
        link.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="p-8 max-w-4xl space-y-6">

            {/* Header */}
            <div>
                <Link
                    href="/commissions"
                    className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors w-fit"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Commissions
                </Link>
                <h1 className="text-2xl font-bold text-white">TDS Export</h1>
                <p className="text-slate-400 text-sm mt-1">
                    Year-end TDS summary — download and hand to your CA for ITR filing
                </p>
            </div>

            {/* FY Selector */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1">
                    <label className="text-slate-300 text-sm font-medium whitespace-nowrap">
                        Financial Year
                    </label>
                    <select
                        value={selectedFY}
                        onChange={e => handleFYChange(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    >
                        {fyYears.length > 0 ? (
                            fyYears.map(fy => (
                                <option key={fy} value={fy}>FY {fy}</option>
                            ))
                        ) : (
                            <option value={selectedFY}>FY {selectedFY}</option>
                        )}
                    </select>
                </div>
                <button
                    onClick={downloadCSV}
                    disabled={!data || data.rows.length === 0}
                    className={`flex items-center gap-2 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm ${!data || data.rows.length === 0
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                >
                    <Download className="w-4 h-4" />
                    Download CSV
                </button>
            </div>

            {loading ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
                    <p className="text-slate-500 text-sm">Loading TDS data...</p>
                </div>
            ) : !data || data.rows.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                        <FileText className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-white font-medium">No commission data for FY {selectedFY}</p>
                    <p className="text-slate-500 text-sm">
                        Reconcile a commission statement or log commissions manually first
                    </p>
                    <Link
                        href="/commissions/reconcile"
                        className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                        Go to Reconciliation
                    </Link>
                </div>
            ) : (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-400 text-xs uppercase tracking-wider">
                                    Total Earned
                                </span>
                                <div className="bg-blue-500/10 p-1.5 rounded-lg">
                                    <IndianRupee className="w-3.5 h-3.5 text-blue-400" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-white">
                                ₹{data.totalExpected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-slate-500 text-xs mt-1">Expected commission FY {selectedFY}</div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-400 text-xs uppercase tracking-wider">
                                    Total Received
                                </span>
                                <div className="bg-green-500/10 p-1.5 rounded-lg">
                                    <IndianRupee className="w-3.5 h-3.5 text-green-400" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-green-400">
                                ₹{data.totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-slate-500 text-xs mt-1">Actually paid by insurers</div>
                        </div>

                        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-slate-400 text-xs uppercase tracking-wider">
                                    TDS Deducted
                                </span>
                                <div className="bg-purple-500/10 p-1.5 rounded-lg">
                                    <IndianRupee className="w-3.5 h-3.5 text-purple-400" />
                                </div>
                            </div>
                            <div className="text-2xl font-bold text-purple-400">
                                ₹{data.totalTDS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </div>
                            <div className="text-slate-500 text-xs mt-1">
                                Under Section 194D — claim in ITR
                            </div>
                        </div>
                    </div>

                    {/* CA Note */}
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <span className="text-amber-400 text-lg flex-shrink-0">💡</span>
                        <div className="space-y-1">
                            <p className="text-amber-300 text-sm font-medium">For your CA</p>
                            <p className="text-slate-400 text-xs leading-relaxed">
                                Download this CSV and share with your Chartered Accountant.
                                TDS of <strong className="text-white">
                                    ₹{data.totalTDS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </strong> was deducted by insurers under Section 194D.
                                Ask your CA to cross-reference with your Form 26AS before filing ITR.
                                Any mismatch between this report and Form 26AS should be raised with
                                the respective insurer.
                            </p>
                        </div>
                    </div>

                    {/* Quarterly Breakdown */}
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-slate-800">
                            <h2 className="text-white font-semibold text-sm">
                                Commission Detail — FY {selectedFY}
                            </h2>
                            <p className="text-slate-500 text-xs mt-0.5">
                                {data.rows.length} entries · Click Download CSV to export
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-800">
                                        {[
                                            'Quarter', 'Date', 'Policy', 'Client',
                                            'Insurer', 'Expected', 'Received', 'TDS'
                                        ].map(h => (
                                            <th key={h} className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {data.rows.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="bg-slate-800 text-slate-300 text-xs px-2 py-0.5 rounded">
                                                    {row.quarter ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">
                                                {row.paymentDate
                                                    ? new Date(row.paymentDate).toLocaleDateString('en-IN', {
                                                        day: 'numeric', month: 'short'
                                                    })
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 text-xs font-mono">
                                                {row.policyNumber}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 text-xs">
                                                {row.clientName}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 text-xs">
                                                {row.insurer}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 text-xs font-medium">
                                                ₹{Number(row.expectedAmt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-4 py-3 text-green-400 text-xs font-medium">
                                                ₹{Number(row.receivedAmt).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </td>
                                            <td className="px-4 py-3 text-purple-400 text-xs font-medium">
                                                {Number(row.tdsDeducted) > 0
                                                    ? `₹${Number(row.tdsDeducted).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                {/* Totals row */}
                                <tfoot>
                                    <tr className="border-t border-slate-700 bg-slate-800/50">
                                        <td colSpan={5} className="px-4 py-3 text-slate-300 text-xs font-semibold">
                                            TOTAL
                                        </td>
                                        <td className="px-4 py-3 text-white text-xs font-bold">
                                            ₹{data.totalExpected.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-3 text-green-400 text-xs font-bold">
                                            ₹{data.totalReceived.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                        <td className="px-4 py-3 text-purple-400 text-xs font-bold">
                                            ₹{data.totalTDS.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </>
            )}

        </div>
    )
}
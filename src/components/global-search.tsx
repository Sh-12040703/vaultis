'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Users, FileText, Loader2, X } from 'lucide-react'

type SearchClient = {
  id: string
  name: string
  phone: string
  email: string | null
}

type SearchPolicy = {
  id: string
  policyNumber: string
  insurer: string
  type: string
  clientId: string
  clientName: string
}

type SearchResults = {
  clients: SearchClient[]
  policies: SearchPolicy[]
}

export default function GlobalSearch() {
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<SearchResults | null>(null)
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)
  const containerRef            = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router                  = useRouter()

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      setOpen(false)
      return
    }
  
    if (debounceRef.current) clearTimeout(debounceRef.current)
  
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data)
        setOpen(true)
      } catch {
        // silent fail
      } finally {
        setLoading(false)
      }
    }, 300)
  
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])


  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcut — Cmd/Ctrl + K
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function navigate(href: string) {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(href)
  }

  const hasResults = results &&
    (results.clients.length > 0 || results.policies.length > 0)

  return (
    <div ref={containerRef} className="relative px-4 pb-3">

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search... ⌘K"
          className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-8 py-2 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500/50 transition-colors"
        />
        {loading ? (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 animate-spin" />
        ) : query && (
          <button
            onClick={() => { setQuery(''); setResults(null); setOpen(false) }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
          >
            <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 transition-colors" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && (
        <div className="absolute left-4 right-4 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">

          {!hasResults && !loading && query.length >= 2 && (
            <div className="px-4 py-6 text-center">
              <p className="text-slate-500 text-xs">
                No results for &quot;{query}&quot;
              </p>
            </div>
          )}

          {/* Client results */}
          {results && results.clients.length > 0 && (
            <div>
              <div className="px-3 py-2 border-b border-slate-700/50">
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  Clients
                </span>
              </div>
              {results.clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-3.5 h-3.5 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-medium truncate">
                      {client.name}
                    </div>
                    <div className="text-slate-500 text-xs truncate">
                      {client.phone}
                      {client.email && ` · ${client.email}`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Policy results */}
          {results && results.policies.length > 0 && (
            <div>
              <div className={`px-3 py-2 border-b border-slate-700/50 ${
                results.clients.length > 0 ? 'border-t border-slate-700/50' : ''
              }`}>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  Policies
                </span>
              </div>
              {results.policies.map((policy) => (
                <button
                  key={policy.id}
                  onClick={() => navigate(`/clients/${policy.clientId}`)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-700/50 transition-colors text-left"
                >
                  <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <FileText className="w-3.5 h-3.5 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-white text-xs font-medium font-mono truncate">
                      {policy.policyNumber}
                    </div>
                    <div className="text-slate-500 text-xs truncate">
                      {policy.clientName} · {policy.insurer} · {policy.type}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer hint */}
          {hasResults && (
            <div className="px-3 py-2 border-t border-slate-700/50">
              <p className="text-slate-600 text-xs">
                Press Esc to close
              </p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
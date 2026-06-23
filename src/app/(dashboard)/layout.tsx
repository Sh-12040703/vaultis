'use client'

import { useState } from 'react'
import { UserButton } from '@clerk/nextjs'
import SidebarNav from '@/components/sidebar-nav'
import GlobalSearch from '@/components/global-search'
import { Menu, X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Mobile hamburger – only visible on small screens */}
      <button
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-slate-800 text-slate-300 md:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-blue-500/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar – fixed overlay on mobile, static on desktop */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-white font-bold text-lg">Vaultis</span>
          </div>
          {/* Close button – only on mobile */}
          <button
            className="md:hidden p-1 text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="pt-3">
          <GlobalSearch />
        </div>

        {/* Navigation */}
        <SidebarNav />

        {/* User */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          <UserButton />
          <span className="text-slate-400 text-sm">Account</span>
        </div>
      </aside>

      {/* Main content – always full width */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  )
}
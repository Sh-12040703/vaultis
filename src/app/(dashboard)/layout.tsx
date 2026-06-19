import { UserButton } from '@clerk/nextjs'
import SidebarNav from '@/components/sidebar-nav'
import GlobalSearch from '@/components/global-search'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex bg-slate-950">

      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">

        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="text-white font-bold text-lg">Vaultis</span>
          </div>
        </div>

        {/* Search — ADD THIS */}
        <div className="pt-3">
          <GlobalSearch />
        </div>

        {/* Nav — client component for instant active state */}
        <SidebarNav />

        {/* User */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          <UserButton />
          <span className="text-slate-400 text-sm">Account</span>
        </div>

      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

    </div>
  )
}
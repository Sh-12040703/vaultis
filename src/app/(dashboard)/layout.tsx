import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  LayoutDashboard,
  Users,
  FileText,
  RefreshCw,
  IndianRupee,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/clients',     label: 'Clients',      icon: Users },
  { href: '/policies',    label: 'Policies',     icon: FileText },
  { href: '/renewals',    label: 'Renewals',     icon: RefreshCw },
  { href: '/commissions', label: 'Commissions',  icon: IndianRupee },
  { href: '/settings',    label: 'Settings',     icon: Settings },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') || ''

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

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <item.icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : ''}`} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          <UserButton/>
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
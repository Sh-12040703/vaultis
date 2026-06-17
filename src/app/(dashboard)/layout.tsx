import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  FileText,
  RefreshCw,
  IndianRupee,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/clients',     label: 'Clients',      icon: Users },
  { href: '/policies',    label: 'Policies',     icon: FileText },
  { href: '/renewals',    label: 'Renewals',     icon: RefreshCw },
  { href: '/commissions', label: 'Commissions',  icon: IndianRupee },
]

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

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-slate-800 flex items-center gap-3">
          {/* <UserButton afterSignOutUrl="/" /> */}
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
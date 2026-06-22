'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  RefreshCw,
  IndianRupee,
  Settings,
  Shield,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/clients',     label: 'Clients',      icon: Users },
  { href: '/policies',    label: 'Policies',     icon: FileText },
  { href: '/renewals',    label: 'Renewals',     icon: RefreshCw },
  { href: '/commissions', label: 'Commissions',  icon: IndianRupee },
  { href: '/claims',      label: 'Claims',       icon: Shield },
  { href: '/settings',    label: 'Settings',     icon: Settings },
]

export default function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 p-4 space-y-1">
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
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
  )
}
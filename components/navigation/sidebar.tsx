'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface SidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: string
}

const navigationItems = {
  'JR CRM': [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/crm/jr/dashboard' },
    { icon: Users, label: 'Leads', href: '/crm/jr/leads' },
    { icon: CheckSquare, label: 'Followups', href: '/crm/jr/followups' },
    { icon: Calendar, label: 'Visits', href: '/crm/jr/visits' },
  ],
}

export function Sidebar({ open, onOpenChange, role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const items = navigationItems[role as keyof typeof navigationItems] || []

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => onOpenChange(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-30 h-screen w-64 bg-slate-900 text-white transition-transform duration-300 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700">
          <h1 className="text-lg font-bold">CRM System</h1>
          <button
            onClick={() => onOpenChange(false)}
            className="md:hidden p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2 overflow-y-auto">
          {items.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3',
                    isActive && 'bg-blue-600 hover:bg-blue-700'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-700">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-red-400 hover:text-red-300 hover:bg-slate-800"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Spacer for desktop */}
      <div className="hidden md:block w-64" />
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Header } from '@/components/navigation/header'
import { Sidebar } from '@/components/navigation/sidebar'

interface MainLayoutProps {
  children: React.ReactNode
  /** optional role string – this is only used by the sidebar when not in
      “visit‑team” mode */
  role?: string
}

export function MainLayout({
  children,
  role = 'JR CRM',
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname() || ''
  const isBuilder = pathname.includes('/crm/boq/builder')

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  const rootBgClass = 'bg-background'

  return (
    <div className={`flex h-screen ${rootBgClass}`}>
      {/* shared sidebar – hidden when inside the BOQ builder focus mode */}
      {!isBuilder && (
        <Sidebar
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          role={role}
        />
      )}

      {/* main column */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => !isBuilder && setSidebarOpen((o) => !o)} />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

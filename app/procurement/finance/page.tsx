import Link from 'next/link'
import { ArrowLeft, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const revalidate = 0

export default function ProcurementFinancePage() {
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Finance</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-600 shrink-0" />
            Procurement Finance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial overview for procurement activities
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/procurement/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
      </div>
      <div className="w-full rounded-xl border bg-card p-12 sm:p-16 shadow-sm text-center space-y-3">
        <Wallet className="w-12 h-12 text-muted-foreground/40 mx-auto" />
        <h3 className="text-base sm:text-lg font-semibold text-foreground">Coming Soon</h3>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
          The finance overview is being rebuilt as part of the new Billing Center system.
        </p>
      </div>
    </div>
  )
}

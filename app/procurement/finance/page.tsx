import Link from 'next/link'
import {
  Wallet,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Receipt,
  Building,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import prisma from '@/lib/prisma'

export const revalidate = 0

export default async function ProcurementFinancePage() {
  // Fetch vendor count and recent finance information
  const [vendorCount, fulfilledReqs] = await Promise.all([
    prisma.vendor.count().catch(() => 0),
    prisma.materialRequisition.count({ where: { status: 'FULFILLED' } }),
  ])

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link href="/procurement/dashboard" className="hover:text-foreground">
              Procurement
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Finance</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Procurement Finance
          </h1>
          <p className="text-sm text-muted-foreground">
            Vendor accounts, material purchasing budgets, payment records & AP tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/procurement/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fulfilled Orders
            </span>
            <Receipt className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{fulfilledReqs}</div>
          <p className="text-xs text-muted-foreground">Completed requisitions</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active Vendors
            </span>
            <Building className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{vendorCount}</div>
          <p className="text-xs text-muted-foreground">Suppliers & contractors</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Terms
            </span>
            <CreditCard className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">Net 15 / 30</div>
          <p className="text-xs text-muted-foreground">Standard vendor cycles</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Accounts Sync
            </span>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">Connected</div>
          <p className="text-xs text-muted-foreground">Linked with Accounts ledger</p>
        </div>
      </div>

      {/* Finance Overview Panel */}
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Vendor Invoices & Material Disbursements
            </h3>
            <p className="text-xs text-muted-foreground">
              Track purchase orders issued by procurement and reconcile against project budgets
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/crm/admin/finance/vendors">
              <Building className="w-4 h-4 mr-2" />
              Manage Suppliers / Vendors
            </Link>
          </Button>
        </div>

        <div className="p-8 text-center space-y-3">
          <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto" />
          <h4 className="text-sm font-semibold text-foreground">
            Procurement Financial Records
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Procurement expenses are synchronized with the central Accounts & Finance system.
            Use the Accounts portal or Vendor management to review payables.
          </p>
          <div className="pt-2">
            <Button asChild size="sm">
              <Link href="/procurement/requisitions">
                View Fulfilled Requisitions For Billing
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

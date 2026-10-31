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
  AlertTriangle,
  Phone,
  FileText,
  ExternalLink,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getProcurementFinanceOverview } from '@/lib/procurement-service'

export const revalidate = 0

export default async function ProcurementFinancePage() {
  const finance = await getProcurementFinanceOverview()

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
            Procurement Finance & Spend Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Material purchasing spend, supplier liabilities, payment status & overhead cost tracking
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
              Total Purchasing Cost
            </span>
            <Wallet className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            ৳{finance.totalSpend.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">All materials & overheads logged</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paid to Suppliers
            </span>
            <Receipt className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ৳{finance.totalPaid.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">Recorded vendor disbursements</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Outstanding Payables
            </span>
            <CreditCard className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            ৳{finance.totalOutstanding.toLocaleString('en-BD')}
          </div>
          <p className="text-xs text-muted-foreground">Due on pending & partial orders</p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Invoices
            </span>
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {finance.pendingInvoices.length}
          </div>
          <p className="text-xs text-muted-foreground">Purchases needing bills/receipts</p>
        </div>
      </div>

      {/* Cost Breakdown Strip (Question 8: Transport, Loading, Tax) */}
      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
          Procurement Cost Structure Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border">
            <span className="text-[11px] text-muted-foreground block">Net Materials Cost</span>
            <span className="font-bold text-sm text-foreground">
              ৳{finance.costBreakdown.materials.toLocaleString('en-BD')}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <span className="text-[11px] text-muted-foreground block">Transportation / Freight</span>
            <span className="font-bold text-sm text-foreground">
              ৳{finance.costBreakdown.transport.toLocaleString('en-BD')}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <span className="text-[11px] text-muted-foreground block">Loading & Unloading</span>
            <span className="font-bold text-sm text-foreground">
              ৳{finance.costBreakdown.loading.toLocaleString('en-BD')}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <span className="text-[11px] text-muted-foreground block">VAT / Taxes</span>
            <span className="font-bold text-sm text-foreground">
              ৳{finance.costBreakdown.tax.toLocaleString('en-BD')}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border">
            <span className="text-[11px] text-muted-foreground block">Other Incidental Costs</span>
            <span className="font-bold text-sm text-foreground">
              ৳{finance.costBreakdown.others.toLocaleString('en-BD')}
            </span>
          </div>
        </div>
      </div>

      {/* Project-wise Spend Table */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b">
          <h2 className="text-base font-semibold text-foreground">
            Project-Wise Procurement Spend
          </h2>
          <p className="text-xs text-muted-foreground">
            Material purchasing expenditure and payment balance grouped by active client project
          </p>
        </div>

        {finance.projectSpends.length === 0 ? (
          <div className="p-10 text-center text-xs text-muted-foreground">
            No procurement expenditure recorded on any project yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3">Project / Site</th>
                  <th className="px-5 py-3">Requisitions</th>
                  <th className="px-5 py-3">Total Spend</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Outstanding Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {finance.projectSpends.map((p) => (
                  <tr key={p.leadId} className="hover:bg-muted/30">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-foreground">{p.projectName}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.location || 'Location not specified'} {p.clientPhone ? `• ${p.clientPhone}` : ''}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {p.requisitionCount} requisitions
                    </td>
                    <td className="px-5 py-3 font-semibold text-foreground">
                      ৳{p.totalSpend.toLocaleString('en-BD')}
                    </td>
                    <td className="px-5 py-3 font-semibold text-emerald-600">
                      ৳{p.totalPaid.toLocaleString('en-BD')}
                    </td>
                    <td className="px-5 py-3 font-semibold text-rose-600">
                      ৳{p.outstanding.toLocaleString('en-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Outstanding Supplier Payables List */}
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Pending Supplier Payments
            </h2>
            <p className="text-xs text-muted-foreground">
              Unsettled and partially paid purchase orders with supplier contact numbers
            </p>
          </div>
          <Badge variant="outline" className="border-rose-300 text-rose-700 bg-rose-50">
            {finance.pendingPayments.length} pending
          </Badge>
        </div>

        {finance.pendingPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            All supplier purchases have been fully paid. No outstanding balances.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs uppercase font-medium text-muted-foreground border-b">
                <tr>
                  <th className="px-5 py-3">Requisition #</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Material</th>
                  <th className="px-5 py-3">Supplier & Contact</th>
                  <th className="px-5 py-3">Total Cost</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Balance Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {finance.pendingPayments.slice(0, 15).map((pay) => (
                  <tr key={pay.purchaseLineId} className="hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs font-medium">
                      {pay.requisitionNo}
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-foreground">
                      {pay.projectName}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {pay.materialName}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <div className="font-medium text-foreground">{pay.supplierName || 'N/A'}</div>
                      {pay.supplierPhone && (
                        <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
                          <Phone className="w-3 h-3" />
                          {pay.supplierPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
                      ৳{pay.totalPurchaseCost.toLocaleString('en-BD')}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-emerald-600">
                      ৳{pay.paidAmount.toLocaleString('en-BD')}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-rose-600">
                      ৳{pay.dueAmount.toLocaleString('en-BD')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

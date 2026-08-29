'use client'

import { useEffect, useState } from 'react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, FileDown } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_LABELS: Record<string, string> = {
  OFFICE_RENT: 'Office Rent',
  SALARY: 'Staff Salary',
  SALARY_ADVANCE: 'Salary Advance',
  BONUS: 'Bonus',
  ELECTRICITY_BILL: 'Electricity Bill',
  WATER_BILL: 'Water Bill',
  INTERNET_BILL: 'Internet Bill',
  FOOD_ALLOWANCE: 'Food Allowance',
  CLIENT_ENTERTAINMENT: 'Client Food & Entertainment',
  PROMOTION: 'Marketing & Promotion',
  MOBILE_RECHARGE: 'Mobile Recharge',
  OCTANE_FUEL: 'Octane & Fuel',
  DONATION: 'Donation',
  OTHERS: 'Other Expenses',
  CLIENT_PAYMENT: 'Client Payment',
  PROJECT_ADVANCE: 'Project Advance',
  DESIGN_FEE: 'Design Fee',
  CONSULTANCY_FEE: 'Consultancy Fee',
  BANK_INTEREST: 'Bank Interest',
  OTHER_INCOME: 'Other Income',
}

function getDefaultMonth() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`
}

export default function OverheadsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getDefaultMonth())
  const [monthlyReport, setMonthlyReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [modalCategory, setModalCategory] = useState<string | null>(null)

  const loadMonthlyReport = async (month: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/finance/reports?mode=monthly&month=${month}`)
      const data = await res.json()
      if (data.success) {
        setMonthlyReport(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMonthlyReport(selectedMonth)
  }, [selectedMonth])

  const handleDownloadPDF = async () => {
    if (!monthlyReport || !monthlyReport.transactions) {
      toast.error('No data available to export.')
      return
    }

    setPdfLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait' })
      const pageW = doc.internal.pageSize.getWidth()
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      
      const [year, month] = selectedMonth.split('-')
      const monthLabel = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

      const logoImg = new Image()
      logoImg.src = "/Logo/HeaderLogo.png"
      await new Promise((resolve) => {
        logoImg.onload = resolve
        logoImg.onerror = resolve
      })

      doc.addImage(logoImg, "PNG", 14, 14, 43.2, 8)

      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(30, 41, 59)
      doc.text('OFFICE OVERHEADS REPORT', pageW - 14, 18, { align: 'right' })

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 116, 139)
      doc.text(`Month: ${monthLabel}  ·  Generated: ${today}`, pageW - 14, 23, { align: 'right' })

      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.4)
      doc.roundedRect(14, 28, pageW - 28, 8, 1.5, 1.5, 'FD')

      const officeTx = monthlyReport.transactions.filter((t: any) => !t.leadId && t.type === 'OUTFLOW')
      const totalOverhead = monthlyReport.totals?.overhead || 0

      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(100, 116, 139)
      doc.text(`TRANSACTIONS: ${officeTx.length}`, 20, 33.5)
      doc.setTextColor(220, 38, 38)
      doc.text(`TOTAL OVERHEAD: ${totalOverhead.toLocaleString()} BDT`, 80, 33.5)

      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Category', 'Particulars', 'Account', 'Amount (BDT)']],
        body: officeTx
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((tx: any) => [
            { content: new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) },
            { content: CATEGORY_LABELS[tx.category] || tx.category },
            { content: tx.particular || '—' },
            { content: tx.financeAccount?.name || 'Unknown' },
            { content: tx.amount.toLocaleString(), styles: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] } },
          ]),
        foot: [[
          { content: 'Total Overhead', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } },
          { content: `${totalOverhead.toLocaleString()} BDT`, styles: { halign: 'right', fontStyle: 'bold', textColor: [0, 0, 0] } },
        ]],
        theme: 'grid',
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        bodyStyles: {
          fillColor: [255, 255, 255],
          textColor: [0, 0, 0],
          fontSize: 7.5,
          cellPadding: 2.5,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        footStyles: {
          fillColor: [248, 250, 252],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          lineColor: [200, 200, 200],
          lineWidth: 0.1,
        },
        columnStyles: {
          0: { cellWidth: 24 },
          1: { cellWidth: 35 },
          4: { halign: 'right', cellWidth: 26 },
        },
        didParseCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 1) {
            data.cell.text = []
          }
        },
        didDrawCell: (data: any) => {
          if (data.section === 'body' && data.column.index === 1) {
            const rawContent = data.cell.raw.content || data.cell.raw
            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'normal')
            const textW = doc.getTextWidth(rawContent)
            const badgeH = 5
            const badgeW = textW + 4
            const x = data.cell.x + 2
            const y = data.cell.y + (data.cell.height - badgeH) / 2
            
            doc.setFillColor(241, 245, 249)
            doc.setDrawColor(203, 213, 225)
            doc.setLineWidth(0.3)
            doc.roundedRect(x, y, badgeW, badgeH, 1, 1, 'FD')
            
            doc.setTextColor(0, 0, 0)
            doc.text(rawContent, x + 2, y + 3.5)
          }
        },
        didDrawPage: () => {
          const pageNum = (doc as any).internal.getCurrentPageInfo().pageNumber
          const pageCount = (doc as any).internal.getNumberOfPages()
          if (pageNum > 1) {
            doc.setFontSize(7)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(30, 41, 59)
            doc.addImage(logoImg, 'PNG', 14, 10, 21.6, 4)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 116, 139)
            doc.text(`Office Overheads  ·  ${monthLabel}  ·  Page ${pageNum}`, pageW - 14, 13, { align: 'right' })
          }
        },
      })

      doc.save(`office-overheads-${selectedMonth}.pdf`)
      toast.success('PDF downloaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Monthly Overheads & Site Summaries"
        subtitle="Rent, salary payments, electricity bills and total cost metrics."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-8 w-full">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-card text-foreground border border-border p-2 rounded-md"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            onClick={handleDownloadPDF}
            disabled={loading || pdfLoading || !monthlyReport}
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            Download PDF
          </Button>
        </div>

      {loading ? (
        <div className="flex h-64 flex-col items-center justify-center space-y-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Loading report...</p>
        </div>
      ) : monthlyReport ? (
        <div className="space-y-6">
          {/* Totals Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Income this Month</div>
                <div className="text-2xl font-bold mt-1 text-emerald-500">
                  {monthlyReport.totals.inflow.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Office Overhead Expenses</div>
                <div className="text-2xl font-bold mt-1 text-rose-500">
                  {monthlyReport.totals.overhead.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Total Site Construction Expenses</div>
                <div className="text-2xl font-bold mt-1 text-orange-500">
                  {monthlyReport.totals.projectExpenses.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted">
              <CardContent className="pt-6">
                <div className="text-xs text-muted-foreground">Net Monthly Balance</div>
                <div className={`text-2xl font-bold mt-1 ${monthlyReport.totals.net >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {monthlyReport.totals.net.toLocaleString()} BDT
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Office Expenses Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Office Overheads Detail</CardTitle>
                <CardDescription>Category-wise breakdown for the selected month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {Object.entries(monthlyReport.overheadBreakdown || {}).length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No overheads logged this month.
                    </div>
                  ) : (
                    Object.entries(monthlyReport.overheadBreakdown || {}).map(([cat, amount]: any) => (
                      <div 
                        key={cat} 
                        className="p-3 flex justify-between items-center text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => setModalCategory(cat)}
                      >
                        <span className="font-medium text-blue-600 dark:text-blue-400 underline-offset-2 hover:underline">{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-bold">{amount.toLocaleString()} BDT</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Site Expenses Detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Sites Construction Spending</CardTitle>
                <CardDescription>Per-site expense breakdown for the selected month.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border border-border rounded-lg divide-y divide-border">
                  {monthlyReport.siteExpensesBreakdown?.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground text-sm">
                      No project expenditures logged this month.
                    </div>
                  ) : (
                    monthlyReport.siteExpensesBreakdown?.map((site: any) => (
                      <div key={site.name} className="p-3 flex justify-between items-center text-sm">
                        <span className="font-medium">{site.name}</span>
                        <span className="font-bold text-rose-500">{site.amount.toLocaleString()} BDT</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Modal for viewing category transactions */}
          <Dialog open={!!modalCategory} onOpenChange={(open) => !open && setModalCategory(null)}>
            <DialogContent className="max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader className="border-b pb-4">
                <DialogTitle>Transactions for {CATEGORY_LABELS[modalCategory || ''] || modalCategory}</DialogTitle>
              </DialogHeader>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted text-xs uppercase text-muted-foreground font-bold border-b border-border">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Particulars</th>
                      <th className="p-3">Account</th>
                      <th className="p-3">Recorder</th>
                      <th className="p-3 text-center">Image</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(() => {
                      if (!modalCategory || !monthlyReport?.transactions) return null
                      const txs = monthlyReport.transactions.filter((t: any) => t.category === modalCategory && !t.leadId)
                      if (txs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-muted-foreground">No transactions found.</td>
                          </tr>
                        )
                      }
                      return txs.map((tx: any) => (
                        <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-3 text-sm max-w-[200px] truncate" title={tx.particular}>{tx.particular || '—'}</td>
                          <td className="p-3 text-xs">{tx.financeAccount?.name || 'Unknown'}</td>
                          <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{tx.recordedBy?.fullName || 'Unknown'}</td>
                          <td className="p-3 text-xs text-center">
                            {tx.imageUrl ? (
                              <a href={tx.imageUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">View</a>
                            ) : '—'}
                          </td>
                          <td className="p-3 text-right font-bold tabular-nums text-rose-500">
                            {tx.amount.toLocaleString()} BDT
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">Processing report...</div>
      )}
      </div>
    </div>
  )
}

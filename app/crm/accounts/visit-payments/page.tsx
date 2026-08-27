'use client'

import { useEffect, useState, useCallback } from 'react'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Search, Calendar, Loader2, User, FileDown } from 'lucide-react'

type DatePreset = 'today' | 'this_week' | 'this_month' | 'custom'

function getTodayStr() {
  return new Date().toISOString().split('T')[0]
}

function getDateRange(preset: DatePreset, customStart: string, customEnd: string) {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (preset === 'today') {
    const t = fmt(now)
    return { start: t, end: t }
  }
  if (preset === 'this_week') {
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return { start: fmt(monday), end: fmt(now) }
  }
  if (preset === 'this_month') {
    return { start: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, end: fmt(now) }
  }
  return { start: customStart, end: customEnd }
}

function formatDateLabel(preset: DatePreset, customStart: string, customEnd: string): string {
  const { start, end } = getDateRange(preset, customStart, customEnd)
  const fmt = (s: string) =>
    new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  if (start === end) return fmt(start)
  return `${fmt(start)} – ${fmt(end)}`
}

export default function VisitPaymentsPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalAmount, setTotalAmount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)

  const [datePreset, setDatePreset] = useState<DatePreset>('this_month')
  const [customStart, setCustomStart] = useState(getTodayStr())
  const [customEnd, setCustomEnd] = useState(getTodayStr())

  const loadData = useCallback(async (preset: DatePreset, cStart: string, cEnd: string, search: string) => {
    setLoading(true)
    try {
      const { start, end } = getDateRange(preset, cStart, cEnd)
      const params = new URLSearchParams({ startDate: start, endDate: end })
      if (search) params.set('search', search)
      const res = await fetch(`/api/finance/visit-payments?${params.toString()}`)
      const data = await res.json()
      if (data.success) {
        setTransactions(data.data)
        setTotalAmount(data.totalAmount)
      }
    } catch (e) {
      toast.error('Failed to load visit payments')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadData(datePreset, customStart, customEnd, searchTerm)
  }, [])

  const handlePreset = (preset: DatePreset) => {
    setDatePreset(preset)
    void loadData(preset, customStart, customEnd, searchTerm)
  }

  const handleCustomApply = () => {
    setDatePreset('custom')
    void loadData('custom', customStart, customEnd, searchTerm)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    void loadData(datePreset, customStart, customEnd, value)
  }

  const handleDownloadPdf = async () => {
    if (transactions.length === 0) {
      toast.error('No data to export.')
      return
    }
    setPdfLoading(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const periodLabel = formatDateLabel(datePreset, customStart, customEnd)
      const generatedAt = new Date().toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })

      // ── Header ──────────────────────────────────────────────
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Aesthetic Interior BD', pageW / 2, 16, { align: 'center' })

      doc.setFontSize(13)
      doc.setFont('helvetica', 'normal')
      doc.text('Visit Payments Report', pageW / 2, 23, { align: 'center' })

      doc.setFontSize(9)
      doc.setTextColor(100)
      doc.text(`Period: ${periodLabel}`, pageW / 2, 30, { align: 'center' })
      doc.text(`Generated: ${generatedAt}`, pageW / 2, 35, { align: 'center' })
      doc.setTextColor(0)

      // ── Summary line ─────────────────────────────────────────
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text(
        `Total Transactions: ${transactions.length}    |    Total Collected: ${totalAmount.toLocaleString()} BDT`,
        pageW / 2,
        41,
        { align: 'center' },
      )
      doc.setFont('helvetica', 'normal')

      // ── Table ────────────────────────────────────────────────
      autoTable(doc, {
        startY: 46,
        head: [
          ['#', 'Voucher', 'Date', 'Lead / Client', 'Location', 'Particulars', 'Account', 'Collected By', 'Recorded By', 'Amount (BDT)'],
        ],
        body: transactions.map((tx, idx) => [
          idx + 1,
          tx.voucherNo || '—',
          new Date(tx.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          tx.lead?.name || '—',
          tx.lead?.location || tx.visit?.location || '—',
          tx.particular || '—',
          tx.financeAccount?.name || 'Unknown',
          tx.collectedBy?.fullName || '—',
          tx.recordedBy?.fullName || '—',
          tx.amount.toLocaleString(),
        ]),
        foot: [
          ['', '', '', '', '', '', '', '', 'Total Collected', `${totalAmount.toLocaleString()} BDT`],
        ],
        headStyles: {
          fillColor: [30, 30, 30],
          textColor: 255,
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        bodyStyles: { fontSize: 8, cellPadding: 2.5 },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: 30,
          fontStyle: 'bold',
          fontSize: 8,
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          2: { cellWidth: 22 },
          9: { halign: 'right', cellWidth: 26 },
        },
        alternateRowStyles: { fillColor: [250, 250, 250] },
        showFoot: 'lastPage',
        margin: { left: 10, right: 10 },
      })

      // ── Page footer on every page ─────────────────────────────────
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(
          `Page ${i} of ${pageCount}  |  Aesthetic Interior BD – Visit Payments`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'center' },
        )
      }

      doc.save(`visit-payments-${periodLabel.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
      toast.success('PDF downloaded successfully!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to generate PDF. Please try again.')
    } finally {
      setPdfLoading(false)
    }
  }

  const presets: { label: string; value: DatePreset }[] = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Custom', value: 'custom' },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      <CrmPageHeader
        title="Visit Payments"
        subtitle="All site visit fee transactions collected from clients."
      />
      <div className="flex flex-col gap-4 p-4 md:gap-6 md:p-8 w-full">

        {/* Filters + Download PDF */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="flex items-center gap-1 rounded-md border p-1 w-fit">
            {presets.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={datePreset === p.value ? 'secondary' : 'ghost'}
                className="h-7 text-xs px-3"
                onClick={() => handlePreset(p.value)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-card text-foreground border border-border p-1.5 rounded-md text-sm"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-card text-foreground border border-border p-1.5 rounded-md text-sm"
              />
              <Button size="sm" onClick={handleCustomApply}>Apply</Button>
            </div>
          )}

          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by lead name, location..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          {/* Download PDF Button */}
          <Button
            size="sm"
            variant="outline"
            className="flex items-center gap-2 ml-auto"
            onClick={handleDownloadPdf}
            disabled={pdfLoading || loading || transactions.length === 0}
          >
            {pdfLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4" />
            )}
            {pdfLoading ? 'Generating...' : 'Download PDF'}
          </Button>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Total Visit Payments Collected</div>
              <div className="text-2xl font-bold text-emerald-500">{totalAmount.toLocaleString()} BDT</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground mb-1">Total Transactions</div>
              <div className="text-2xl font-bold">{transactions.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Loading...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Calendar className="w-10 h-10 opacity-30" />
            <p className="text-sm">No visit payment transactions found for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-3">#</th>
                  <th className="p-3">Voucher</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Lead / Client</th>
                  <th className="p-3">Location</th>
                  <th className="p-3 max-w-[180px]">Particulars</th>
                  <th className="p-3">Account</th>
                  <th className="p-3">Collected By</th>
                  <th className="p-3">Recorded By</th>
                  <th className="p-3 text-right">Amount (BDT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="p-3 text-xs font-mono">{tx.voucherNo || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-3">
                      {tx.lead ? (
                        <span className="font-semibold text-sm">{tx.lead.name}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground max-w-[140px] truncate" title={tx.lead?.location || tx.visit?.location || ''}>
                      {tx.lead?.location || tx.visit?.location || '—'}
                    </td>
                    <td className="p-3 text-sm max-w-[180px] truncate font-medium" title={tx.particular}>
                      {tx.particular}
                    </td>
                    <td className="p-3 text-xs">
                      <Badge variant="outline">{tx.financeAccount?.name || 'Unknown'}</Badge>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {tx.collectedBy ? (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {tx.collectedBy.fullName}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                      {tx.recordedBy?.fullName || '—'}
                    </td>
                    <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {tx.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/50">
                <tr>
                  <td colSpan={9} className="p-3 text-right font-bold text-sm">Total Collected</td>
                  <td className="p-3 text-right font-bold tabular-nums text-emerald-600 dark:text-emerald-400 text-sm">
                    {totalAmount.toLocaleString()} BDT
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

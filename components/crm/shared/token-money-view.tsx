'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Banknote,
  Calendar,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CrmPageHeader } from '@/components/crm/shared/page-header'

type TokenTransaction = {
  id: string
  date: string
  amount: number
  particular: string
  lead: {
    id: string
    name: string
    phone: string | null
    location: string | null
    stage: string
    subStatus: string | null
  } | null
  collectedBy: {
    id: string
    fullName: string
    email: string
  } | null
  recordedBy: {
    id: string
    fullName: string
  } | null
  financeAccount: {
    id: string
    name: string
  } | null
}

type SdcBreakdown = {
  sdcId: string
  sdcName: string
  count: number
  totalAmount: number
}

type FinanceAccountOption = {
  id: string
  name: string
}

type SdcUserOption = {
  id: string
  fullName: string
  email: string
}

type PartialLeadOption = {
  id: string
  name: string
  phone: string
  location: string
}

export function TokenMoneyView({
  leadBasePath = '/visit-team/partial-visits',
}: {
  leadBasePath?: string
}) {
  const [transactions, setTransactions] = useState<TokenTransaction[]>([])
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccountOption[]>([])
  const [sdcUsers, setSdcUsers] = useState<SdcUserOption[]>([])
  const [partialLeads, setPartialLeads] = useState<PartialLeadOption[]>([])
  const [stats, setStats] = useState<{
    totalAmount: number
    totalCount: number
    sdcBreakdown: SdcBreakdown[]
  }>({
    totalAmount: 0,
    totalCount: 0,
    sdcBreakdown: [],
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [sdcFilter, setSdcFilter] = useState('ALL')

  // Record Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedSdcId, setSelectedSdcId] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [particular, setParticular] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchTokenMoney = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (sdcFilter !== 'ALL') params.set('sdcId', sdcFilter)

      const response = await fetch(`/api/crm/token-money?${params.toString()}`, {
        cache: 'no-store',
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to fetch token money data')
      }

      setTransactions(payload.data ?? [])
      if (payload.stats) setStats(payload.stats)
      if (payload.financeAccounts) setFinanceAccounts(payload.financeAccounts)
      if (payload.sdcUsers) setSdcUsers(payload.sdcUsers)
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error loading token money')
    } finally {
      setLoading(false)
    }
  }, [sdcFilter, search])

  const fetchLeadsForSelect = useCallback(async () => {
    try {
      const response = await fetch('/api/crm/partial-leads?limit=100', { cache: 'no-store' })
      const payload = await response.json()
      if (payload.success && Array.isArray(payload.data)) {
        setPartialLeads(
          payload.data.map((l: any) => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            location: l.location,
          })),
        )
      }
    } catch {
      // Ignore
    }
  }, [])

  useEffect(() => {
    void fetchTokenMoney()
    void fetchLeadsForSelect()
  }, [fetchLeadsForSelect, fetchTokenMoney])

  const openRecordDialog = () => {
    setSelectedLeadId(partialLeads[0]?.id ?? '')
    setAmount('')
    setSelectedSdcId(sdcUsers[0]?.id ?? '')
    setSelectedAccountId(financeAccounts[0]?.id ?? '')
    setDate(new Date().toISOString().slice(0, 10))
    setParticular('')
    setDialogOpen(true)
  }

  const handleConfirmRecord = async () => {
    if (!selectedLeadId) {
      toast.error('Please select a client/lead')
      return
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Please enter a valid token amount')
      return
    }
    if (!selectedSdcId) {
      toast.error('Please select the Special Design Consultant who collected it')
      return
    }
    if (!selectedAccountId) {
      toast.error('Please select a finance/accounts destination')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/crm/token-money', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          amount: Number(amount),
          collectedById: selectedSdcId,
          financeAccountId: selectedAccountId,
          date,
          particular: particular.trim() || undefined,
        }),
      })

      const payload = await response.json()
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to record token money')
      }

      toast.success(payload.message || 'Token money recorded successfully')
      setDialogOpen(false)
      await fetchTokenMoney()
    } catch (err) {
      console.error(err)
      toast.error(err instanceof Error ? err.message : 'Error recording token money')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <CrmPageHeader
        title="Token Money (Verbal Confirmation)"
        subtitle="Upfront token payments collected by Special Design Consultants before formal agreement. Connected directly to Accounts."
      />

      <main className="w-full px-3 py-4 sm:px-6 lg:px-8 space-y-6">
        {/* Top Summary Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="border border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-card to-card dark:border-emerald-900/30">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                  Total Token Money Collected
                </p>
                <p className="text-3xl font-black text-emerald-800 dark:text-emerald-200 mt-1">
                  ৳{stats.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  From {stats.totalCount} client payment{stats.totalCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="size-12 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center">
                <Banknote className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-gradient-to-br from-card via-card to-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Total Clients Given Token
                </p>
                <p className="text-3xl font-black text-foreground mt-1">{stats.totalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Verbal confirmation stage</p>
              </div>
              <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/80 bg-gradient-to-br from-card via-card to-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active SDC Collectors
                </p>
                <p className="text-3xl font-black text-foreground mt-1">
                  {stats.sdcBreakdown.length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Special Design Consultants</p>
              </div>
              <div className="size-12 rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown by Special Design Consultant */}
        {stats.sdcBreakdown.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Token Money Collected by Consultant
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {stats.sdcBreakdown.map((item) => (
                <Card
                  key={item.sdcId}
                  className="border border-border/70 hover:border-primary/40 transition shadow-sm"
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-foreground truncate" title={item.sdcName}>
                        {item.sdcName}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {item.count} client{item.count === 1 ? '' : 's'}
                      </Badge>
                    </div>
                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-xs text-muted-foreground">Total Token:</span>
                      <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                        ৳{item.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : null}

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 max-w-full sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, phone, or consultant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm w-full"
              />
            </div>

            <div className="w-full sm:w-[220px]">
              <Select value={sdcFilter} onValueChange={setSdcFilter}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Filter by Consultant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Consultants</SelectItem>
                  {sdcUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTokenMoney}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={openRecordDialog} className="h-9 font-medium">
              <Plus className="mr-1.5 h-4 w-4" />
              Record Token Money
            </Button>
          </div>
        </div>

        {/* Table View */}
        {loading ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Loading token transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Banknote className="mx-auto h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 text-base font-semibold">No token money records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click &ldquo;Record Token Money&rdquo; to log an upfront payment from a client.
              </p>
              <Button onClick={openRecordDialog} className="mt-4" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Record Token Money
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto w-full">
            <Table className="min-w-[950px] sm:min-w-full">
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold w-[120px]">Date</TableHead>
                  <TableHead className="font-bold w-[180px]">Client / Lead</TableHead>
                  <TableHead className="font-bold w-[140px]">Phone Number</TableHead>
                  <TableHead className="font-bold w-[150px]">Token Amount</TableHead>
                  <TableHead className="font-bold w-[180px]">Special Design Consultant</TableHead>
                  <TableHead className="font-bold w-[140px]">Accounts Destination</TableHead>
                  <TableHead className="font-bold w-[200px]">Particulars / Note</TableHead>
                  <TableHead className="font-bold text-right w-[110px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-xs sm:text-sm">
                      {new Date(tx.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </TableCell>

                    <TableCell>
                      {tx.lead ? (
                        <Link
                          href={`${leadBasePath}/${tx.lead.id}`}
                          className="font-semibold text-sm hover:underline text-foreground block truncate"
                        >
                          {tx.lead.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown Client</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {tx.lead?.phone ? (
                        <a
                          href={`tel:${tx.lead.phone}`}
                          className="inline-flex items-center gap-1.5 text-xs text-foreground hover:text-primary"
                        >
                          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                          {tx.lead.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <span className="font-bold text-sm text-emerald-700 dark:text-emerald-300">
                        ৳{tx.amount.toLocaleString()}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{tx.collectedBy?.fullName ?? 'Unassigned'}</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {tx.financeAccount?.name ?? 'Default Account'}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]" title={tx.particular}>
                        {tx.particular}
                      </p>
                    </TableCell>

                    <TableCell className="text-right">
                      {tx.lead ? (
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" asChild>
                          <Link href={`${leadBasePath}/${tx.lead.id}`}>
                            View Lead
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>

      {/* RECORD TOKEN MONEY DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Token Money</DialogTitle>
            <DialogDescription>
              Log an upfront token money payment for verbal confirmation. Connected to Accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Client / Partial Lead *</Label>
              <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose client..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {partialLeads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} ({l.phone}) - {l.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Token Amount (৳) *</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 20000"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Special Design Consultant (Who received the money) *</Label>
              <Select value={selectedSdcId} onValueChange={setSelectedSdcId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select consultant..." />
                </SelectTrigger>
                <SelectContent>
                  {sdcUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.fullName} ({u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Accounts Destination (Cash / Bank) *</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {financeAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Payment Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Remarks / Particulars</Label>
              <Textarea
                rows={2}
                value={particular}
                onChange={(e) => setParticular(e.target.value)}
                placeholder="e.g. Verbal confirmation token for 3-room partial interior..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRecord} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording...
                </>
              ) : (
                'Save to Accounts'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

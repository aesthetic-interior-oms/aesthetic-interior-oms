'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileCheck2,
  FileEdit,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Plus,
  Receipt,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { DetailQuotationDocument } from '@/components/crm/quotation/pdf/DetailQuotationDocument'
import { AgreementDocumentPdf } from '@/components/crm/quotation/pdf/AgreementDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import { withDetailQuotationDefaults } from '@/lib/detail-quotation-format'
import { calculateQuotationTotals } from '@/lib/quotation-calculations'
import type { AgreementClauseGroup, AgreementContent } from '@/lib/agreement-template'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Staff = { id: string; fullName: string; email: string }

type AgreementLead = {
  id: string
  name: string
  phone: string | null
  email: string | null
  location: string | null
  stage: string
  subStatus: string | null
  agreementType: string | null
  accountStatus: string | null
  slotIndex?: number
  originalQuotationTotal: number
  discountApplied: number
  settledAgreementValue: number | null
  updatedAt: string
  detailQuotationAvailable: boolean
  srCrm: Staff | null
  boqAssignee: Staff | null
}

type AgreementLeadsResponse = {
  success: boolean
  data?: AgreementLead[]
  error?: string
}

type AgreementData = {
  agreement: AgreementContent
  quotation: QuotationDraftContent | null
  totals: QuotationTotals | null
  client: { id: string; name: string; phone: string | null; email: string | null; location: string | null }
  updatedAt: string | null
}

type FilterTab = 'all' | 'boq-pending' | 'boq-assigned' | 'with-boq'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(value: number | null | undefined) {
  if (value == null) return '—'
  return `৳ ${Math.round(value).toLocaleString('en-IN')}`
}

function formatAgreementType(value: string | null) {
  if (!value) return 'Confirmed'
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}

function boqEligible(lead: AgreementLead) {
  void lead
  return true
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaCls = `${inputCls} min-h-[6rem] resize-y leading-relaxed`
const labelCls = 'flex flex-col gap-1 text-xs font-medium text-foreground'

function ModalTextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className={labelCls}>
      {label}
      <input type={type} className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function ModalTextarea({ label, value, onChange, rows = 5 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className={labelCls}>
      {label}
      <textarea rows={rows} className={textareaCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 pb-2 mb-3 mt-5 first:mt-0">
      <span className="h-3.5 w-1 rounded-full bg-[#a57c00] shrink-0" />
      <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wider">{children}</h3>
    </div>
  )
}

function AgreementEditModal({
  leadId,
  clientName,
  onClose,
  onSaved,
}: {
  leadId: string
  clientName: string
  onClose: () => void
  onSaved: () => void
}) {
  const [data, setData] = useState<AgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    fetch(`/api/agreement-leads/${leadId}`, { cache: 'no-store' })
      .then(async (r) => {
        const payload = await r.json()
        if (!r.ok || !payload.success) throw new Error(payload.error || 'Could not load agreement')
        if (active) setData(payload.data as AgreementData)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Could not load agreement'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leadId])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const update = (fn: (cur: AgreementData) => AgreementData) => {
    setData((cur) => cur ? fn(cur) : cur)
    setDirty(true)
  }

  const setField = (field: keyof AgreementContent, value: string) =>
    update((cur) => ({ ...cur, agreement: { ...cur.agreement, [field]: value } }))

  const setClauseGroup = (index: number, group: AgreementClauseGroup) =>
    update((cur) => ({
      ...cur,
      agreement: {
        ...cur.agreement,
        clauseGroups: cur.agreement.clauseGroups.map((g, i) => i === index ? group : g),
      },
    }))

  const save = async () => {
    if (!data) return
    setSaving(true)
    try {
      const r = await fetch(`/api/agreement-leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreement: data.agreement }),
      })
      const payload = await r.json()
      if (!r.ok || !payload.success) throw new Error(payload.error || 'Could not save')
      setDirty(false)
      toast.success('Agreement saved successfully')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save agreement')
    } finally { setSaving(false) }
  }

  const download = async () => {
    if (!data) return
    setDownloading(true)
    try {
      const safeName = data.agreement.ownerName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Client'
      await downloadPdfFromDocument(
        <AgreementDocumentPdf
          agreement={data.agreement}
          quotation={data.quotation}
          totals={data.totals}
          clientName={data.agreement.ownerName}
          agreementValue={data.totals?.grandTotal ?? null}
        />,
        `Agreement_${safeName}_${data.agreement.agreementDate}.pdf`,
      )
      toast.success('Agreement PDF downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate PDF')
    } finally { setDownloading(false) }
  }

  const agr = data?.agreement

  return (
    <div className="fixed inset-0 z-50 flex items-stretch">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto flex h-full w-full max-w-3xl flex-col bg-card shadow-2xl border-l border-border">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5 bg-[#1f363d]">
          <div>
            <p className="text-xs font-bold text-white/90 uppercase tracking-widest">Edit Agreement</p>
            <p className="text-sm font-semibold text-white mt-0.5">{clientName}</p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <span className="text-[10px] text-amber-300 font-medium animate-pulse">Unsaved changes</span>
            )}
            <button
              onClick={() => void download()}
              disabled={downloading || loading}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/30 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              PDF
            </button>
            <button
              onClick={() => void save()}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#a57c00] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#8a6800] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save
            </button>
            <button
              onClick={onClose}
              className="ml-1 rounded-md p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Loading agreement…</p>
            </div>
          ) : !agr ? (
            <div className="py-16 text-center text-sm text-destructive">Could not load agreement data.</div>
          ) : (
            <div className="space-y-1">

              {/* ── 1. WORK ORDER / CLIENT INFO ── */}
              <SectionHeading>Work Order &amp; Client Info</SectionHeading>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ModalTextField label="Owner / Client Name" value={agr.ownerName} onChange={(v) => setField('ownerName', v)} />
                <ModalTextField label="Agreement Date" type="date" value={agr.agreementDate} onChange={(v) => setField('agreementDate', v)} />
                <ModalTextField label="Agreement Value (৳)" type="number" value={agr.agreementValue} onChange={(v) => setField('agreementValue', v)} />
                <ModalTextField label="Work Order ID" value={agr.workOrderId} onChange={(v) => setField('workOrderId', v)} />
                <ModalTextField label="Sub Contract ID" value={agr.subContractId} onChange={(v) => setField('subContractId', v)} />
                <ModalTextField label="Reference" value={agr.reference} onChange={(v) => setField('reference', v)} />
                <ModalTextField label="Project Name" value={agr.projectName} onChange={(v) => setField('projectName', v)} />
                <div className="sm:col-span-2">
                  <ModalTextField label="Owner Address" value={agr.ownerAddress} onChange={(v) => setField('ownerAddress', v)} />
                </div>
                <div className="sm:col-span-3">
                  <ModalTextField label="Project Address" value={agr.projectAddress} onChange={(v) => setField('projectAddress', v)} />
                </div>
              </div>

              {/* ── 2. PEOPLE ── */}
              <SectionHeading>People &amp; Representatives</SectionHeading>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <ModalTextField label="Senior CRM" value={agr.srCrmName} onChange={(v) => setField('srCrmName', v)} />
                <ModalTextField label="CEO Name" value={agr.ceoName} onChange={(v) => setField('ceoName', v)} />
                <ModalTextField label="Company Representative" value={agr.companyRepresentative} onChange={(v) => setField('companyRepresentative', v)} />
                <div className="sm:col-span-2">
                  <ModalTextField label="Representative Title" value={agr.companyRepresentativeTitle} onChange={(v) => setField('companyRepresentativeTitle', v)} />
                </div>
              </div>

              {/* ── 3. WORK ORDER LETTER ── */}
              <SectionHeading>Work Order Introduction Letter</SectionHeading>
              <ModalTextarea
                label="Letter body (each line break = new paragraph in PDF)"
                value={agr.letterBody}
                rows={8}
                onChange={(v) => setField('letterBody', v)}
              />

              {/* ── 4. PAYMENT SCHEDULE ── */}
              <SectionHeading>Payment Schedule</SectionHeading>
              <div className="space-y-2">
                {agr.paymentSchedule.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_120px_140px_auto] gap-2 items-end rounded-md border border-border/70 bg-muted/20 p-3">
                    <ModalTextField
                      label={`Stage ${idx + 1}`}
                      value={item.stage}
                      onChange={(v) => update((cur) => ({
                        ...cur,
                        agreement: {
                          ...cur.agreement,
                          paymentSchedule: cur.agreement.paymentSchedule.map((r, i) => i === idx ? { ...r, stage: v } : r),
                        },
                      }))}
                    />
                    <ModalTextField
                      label="Percentage"
                      value={item.percentage}
                      onChange={(v) => update((cur) => ({
                        ...cur,
                        agreement: {
                          ...cur.agreement,
                          paymentSchedule: cur.agreement.paymentSchedule.map((r, i) => i === idx ? { ...r, percentage: v } : r),
                        },
                      }))}
                    />
                    <ModalTextField
                      label="Amount (৳)"
                      value={item.amount}
                      onChange={(v) => update((cur) => ({
                        ...cur,
                        agreement: {
                          ...cur.agreement,
                          paymentSchedule: cur.agreement.paymentSchedule.map((r, i) => i === idx ? { ...r, amount: v } : r),
                        },
                      }))}
                    />
                    <button
                      title="Remove stage"
                      onClick={() => update((cur) => ({
                        ...cur,
                        agreement: {
                          ...cur.agreement,
                          paymentSchedule: cur.agreement.paymentSchedule.filter((_, i) => i !== idx),
                        },
                      }))}
                      className="mb-0.5 rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => update((cur) => ({
                    ...cur,
                    agreement: {
                      ...cur.agreement,
                      paymentSchedule: [...cur.agreement.paymentSchedule, { stage: '', percentage: '', amount: '' }],
                    },
                  }))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Payment Stage
                </button>
              </div>

              {/* ── 5. ANNEXURES ── */}
              <SectionHeading>Annexures</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {agr.annexures.map((item, idx) => (
                  <ModalTextarea
                    key={idx}
                    label={`Annexure A${idx + 1}`}
                    rows={4}
                    value={item}
                    onChange={(v) => update((cur) => ({
                      ...cur,
                      agreement: {
                        ...cur.agreement,
                        annexures: cur.agreement.annexures.map((a, i) => i === idx ? v : a),
                      },
                    }))}
                  />
                ))}
              </div>

              {/* ── 6. AGREEMENT CLAUSES ── */}
              <SectionHeading>Agreement Clauses</SectionHeading>
              <div className="space-y-4">
                {agr.clauseGroups.map((group, groupIdx) => (
                  <div key={groupIdx} className="rounded-lg border border-border/70 bg-muted/10 p-4 space-y-3">
                    {/* Group title row */}
                    <div className="flex items-center gap-2">
                      <input
                        className={`${inputCls} font-semibold flex-1`}
                        placeholder="Section title"
                        value={group.title}
                        onChange={(e) => setClauseGroup(groupIdx, { ...group, title: e.target.value })}
                      />
                      <button
                        onClick={() => update((cur) => ({
                          ...cur,
                          agreement: {
                            ...cur.agreement,
                            clauseGroups: cur.agreement.clauseGroups.filter((_, i) => i !== groupIdx),
                          },
                        }))}
                        className="rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Remove section"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Clauses */}
                    {group.clauses.map((clause, clauseIdx) => (
                      <div key={clauseIdx} className="flex gap-2 items-start">
                        <span className="mt-2.5 text-xs font-bold text-[#a57c00] shrink-0 w-8">
                          {groupIdx + 1}.{clauseIdx + 1}
                        </span>
                        <textarea
                          className={`${textareaCls} flex-1 min-h-[4rem]`}
                          value={clause}
                          onChange={(e) => setClauseGroup(groupIdx, {
                            ...group,
                            clauses: group.clauses.map((c, i) => i === clauseIdx ? e.target.value : c),
                          })}
                        />
                        <button
                          onClick={() => setClauseGroup(groupIdx, {
                            ...group,
                            clauses: group.clauses.filter((_, i) => i !== clauseIdx),
                          })}
                          className="mt-2.5 rounded p-1.5 text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          title="Remove clause"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={() => setClauseGroup(groupIdx, { ...group, clauses: [...group.clauses, ''] })}
                      className="inline-flex items-center gap-1.5 rounded border border-dashed border-border px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Plus className="h-3 w-3" /> Add Clause
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => update((cur) => ({
                    ...cur,
                    agreement: {
                      ...cur.agreement,
                      clauseGroups: [...cur.agreement.clauseGroups, { title: 'New Section', clauses: [''] }],
                    },
                  }))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Clause Section
                </button>
              </div>

              {/* ── 7. WITNESSES ── */}
              <SectionHeading>Witnesses &amp; Signatures</SectionHeading>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {agr.witnessNames.map((name, idx) => (
                  <ModalTextField
                    key={idx}
                    label={`Witness ${idx + 1}`}
                    value={name}
                    onChange={(v) => update((cur) => ({
                      ...cur,
                      agreement: {
                        ...cur.agreement,
                        witnessNames: cur.agreement.witnessNames.map((w, i) => i === idx ? v : w),
                      },
                    }))}
                  />
                ))}
              </div>
              <button
                onClick={() => update((cur) => ({
                  ...cur,
                  agreement: {
                    ...cur.agreement,
                    witnessNames: [...cur.agreement.witnessNames, ''],
                  },
                }))}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add Witness
              </button>

              {/* ── QUOTATION INFO (read-only display) ── */}
              {data?.quotation && (
                <>
                  <SectionHeading>Detail Quotation (linked)</SectionHeading>
                  <div className="rounded-md bg-muted/40 border border-border/60 px-4 py-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {data.quotation.lineItems.filter((li) => li.included).length} included lines
                    </span>
                    {' · '}৳ {Math.round(data.totals?.grandTotal ?? 0).toLocaleString('en-IN')} grand total
                    <p className="mt-1 text-[11px]">The detail quotation table is automatically included in the PDF from saved quotation data. No editing needed here.</p>
                  </div>
                </>
              )}

            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 bg-muted/20">
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void download()}
              disabled={downloading || loading || !agr}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download PDF
            </button>
            <button
              onClick={() => void save()}
              disabled={saving || !dirty || !agr}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#1f363d] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#16272c] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save Agreement
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function AgreementLeadsBoard({
  title = 'Agreement Leads',
  subtitle = 'Confirmed agreements with quotation totals, discounts, settled values, and detail quotation downloads.',
}: {
  title?: string
  subtitle?: string
  editorBasePath?: string
}) {
  const [leads, setLeads] = useState<AgreementLead[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [selectedBoq, setSelectedBoq] = useState<Record<string, string>>({})
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [savingBoqId, setSavingBoqId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingAgreementId, setDownloadingAgreementId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<Record<string, string>>({})
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)

  const editingLead = useMemo(() => leads.find((l) => l.id === editingLeadId) ?? null, [leads, editingLeadId])

  const loadLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const response = await fetch(`/api/agreement-leads?${params.toString()}`, { cache: 'no-store' })
      const payload = (await response.json()) as AgreementLeadsResponse
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load Agreement Leads')
      const nextLeads = payload.data ?? []
      setLeads(nextLeads)
      setSelectedBoq((current) => {
        const next = { ...current }
        nextLeads.forEach((lead) => { if (!(lead.id in next)) next[lead.id] = lead.boqAssignee?.id ?? '' })
        return next
      })
    } catch (error) {
      setLeads([])
      toast.error(error instanceof Error ? error.message : 'Failed to load Agreement Leads')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [searchInput])

  useEffect(() => { void loadLeads() }, [loadLeads])

  useEffect(() => {
    const loadStaff = async () => {
      setStaffLoading(true)
      try {
        const response = await fetch('/api/department/available/BOQ', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Failed to load BOQ staff')
        setStaff(payload.users ?? [])
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load BOQ staff')
      } finally { setStaffLoading(false) }
    }
    void loadStaff()
  }, [])

  const assignBoq = async (lead: AgreementLead) => {
    const userId = selectedBoq[lead.id]
    if (!userId || !boqEligible(lead)) return
    setSavingBoqId(lead.id)
    setAssignError((prev) => ({ ...prev, [lead.id]: '' }))
    try {
      const response = await fetch(`/api/lead/${lead.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, department: 'BOQ' }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) {
        const errMsg = payload.error ?? 'Failed to assign BOQ staff'
        setAssignError((prev) => ({ ...prev, [lead.id]: errMsg }))
        throw new Error(errMsg)
      }
      toast.success(lead.boqAssignee ? 'BOQ staff reassigned successfully.' : 'BOQ staff assigned successfully.')
      await loadLeads()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign BOQ staff')
    } finally { setSavingBoqId(null) }
  }

  const downloadDetailQuotation = async (lead: AgreementLead) => {
    setDownloadingId(lead.id)
    try {
      const slot = lead.slotIndex ?? 1
      const response = await fetch(`/api/lead/${lead.id}/quotation-draft?documentType=detail&slot=${slot}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) throw new Error(payload?.error ?? 'Failed to load detail quotation')
      const source = payload.data.draft ?? payload.data.defaultDetailDraft
      if (!source?.content) throw new Error('No detail quotation is available for this lead')
      const content = withDetailQuotationDefaults(source.content)
      const totals = calculateQuotationTotals(content)
      const downloadedAt = new Date().toISOString()
      const quotationCode = `DQ-AGR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${lead.id.slice(-6).toUpperCase()}`
      const contentForDownload = { ...content, quotationCode, downloadedAt }
      const safeClientName = (lead.name || 'Client').replace(/[^a-z0-9]/gi, '_').toLowerCase()
      await downloadPdfFromDocument(
        <DetailQuotationDocument
          clientName={contentForDownload.clientName || lead.name}
          clientAddress={contentForDownload.clientAddress || lead.location}
          content={contentForDownload}
          totals={totals}
          agreementSummary={{
            originalQuotationTotal: lead.originalQuotationTotal,
            honoredAmount: lead.discountApplied,
            totalAmount: lead.settledAgreementValue ?? totals.grandTotal,
          }}
        />,
        `Detail_Quotation_Agreement_${safeClientName}_${quotationCode}.pdf`,
      )
      toast.success('Agreement Detail Quotation PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download PDF')
    } finally { setDownloadingId(null) }
  }

  const downloadAgreement = async (lead: AgreementLead) => {
    setDownloadingAgreementId(lead.id)
    try {
      const response = await fetch(`/api/agreement-leads/${lead.id}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error ?? 'Failed to load agreement')
      const data = payload.data as {
        agreement: AgreementContent
        quotation: Parameters<typeof AgreementDocumentPdf>[0]['quotation']
        totals: Parameters<typeof AgreementDocumentPdf>[0]['totals']
      }
      const safeName = lead.name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Client'
      await downloadPdfFromDocument(
        <AgreementDocumentPdf
          agreement={data.agreement}
          quotation={data.quotation}
          totals={data.totals}
          clientName={lead.name}
          agreementValue={lead.settledAgreementValue}
        />,
        `Agreement_${safeName}_${data.agreement.agreementDate}.pdf`,
      )
      toast.success('Agreement PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download agreement')
    } finally { setDownloadingAgreementId(null) }
  }

  // Metrics
  const stats = useMemo(() => {
    const totalLeads = leads.length
    const totalSettled = leads.reduce((sum, lead) => sum + (lead.settledAgreementValue ?? 0), 0)
    const totalDiscount = leads.reduce((sum, lead) => sum + (lead.discountApplied ?? 0), 0)
    const boqAssignedCount = leads.filter((lead) => Boolean(lead.boqAssignee)).length
    const boqPendingCount = totalLeads - boqAssignedCount
    const withDetailCount = leads.filter((lead) => lead.detailQuotationAvailable).length
    return { totalLeads, totalSettled, totalDiscount, boqAssignedCount, boqPendingCount, withDetailCount }
  }, [leads])

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (activeTab === 'boq-pending') return !lead.boqAssignee
      if (activeTab === 'boq-assigned') return Boolean(lead.boqAssignee)
      if (activeTab === 'with-boq') return lead.detailQuotationAvailable
      return true
    })
  }, [leads, activeTab])

  return (
    <div className="min-h-screen bg-muted/20">
      <CrmPageHeader title={title} subtitle={subtitle} />

      <main className="mx-auto max-w-[1600px] px-4 py-6 space-y-5">
        {/* ─── METRIC CARDS ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Confirmed Agreements</p>
                <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">{stats.totalLeads}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ready for execution</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileCheck2 className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Settled Value</p>
                <p className="text-2xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 mt-0.5">
                  {formatMoney(stats.totalSettled)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Contract agreed value</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CircleDollarSign className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Discount / Honor</p>
                <p className="text-2xl font-bold tracking-tight text-amber-700 dark:text-amber-400 mt-0.5">
                  {formatMoney(stats.totalDiscount)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Special client honor</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Receipt className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-xs">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">BOQ Staff Assigned</p>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stats.boqAssignedCount}</p>
                  <span className="text-xs text-muted-foreground">/ {stats.totalLeads}</span>
                </div>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-0.5">
                  {stats.boqPendingCount > 0 ? `${stats.boqPendingCount} pending assignment` : 'All assigned'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── FILTERS & SEARCH ─────────────────────────────────────── */}
        <Card className="border-border/80 shadow-xs">
          <CardContent className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button variant={activeTab === 'all' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs font-medium" onClick={() => setActiveTab('all')}>
                All Agreements
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{stats.totalLeads}</Badge>
              </Button>
              <Button variant={activeTab === 'boq-pending' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800" onClick={() => setActiveTab('boq-pending')}>
                BOQ Pending
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300">{stats.boqPendingCount}</Badge>
              </Button>
              <Button variant={activeTab === 'boq-assigned' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs font-medium" onClick={() => setActiveTab('boq-assigned')}>
                BOQ Assigned
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{stats.boqAssignedCount}</Badge>
              </Button>
              <Button variant={activeTab === 'with-boq' ? 'default' : 'ghost'} size="sm" className="h-8 text-xs font-medium" onClick={() => setActiveTab('with-boq')}>
                Has Detail Quotation
                <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">{stats.withDetailCount}</Badge>
              </Button>
            </div>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search client, phone, location…"
                className="h-8 pl-8 pr-7 text-xs bg-background"
              />
              {searchInput ? (
                <button type="button" onClick={() => setSearchInput('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* ─── DATA TABLE ───────────────────────────────────────────── */}
        {loading ? (
          <Card className="border-border/80">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-xs">Loading agreement leads…</p>
            </CardContent>
          </Card>
        ) : filteredLeads.length === 0 ? (
          <Card className="border-border/80">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No agreement leads found</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {searchInput ? 'Try adjusting your search query or filters.' : 'Confirmed leads will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden border-border/80 shadow-xs">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                    <TableHead className="w-[230px] font-semibold text-foreground py-3">Client / Project</TableHead>
                    <TableHead className="w-[120px] font-semibold text-foreground py-3">Status</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold text-foreground py-3">Quotation</TableHead>
                    <TableHead className="w-[110px] text-right font-semibold text-foreground py-3">Discount</TableHead>
                    <TableHead className="w-[140px] text-right font-semibold text-foreground py-3">Settled Value</TableHead>
                    <TableHead className="w-[130px] font-semibold text-foreground py-3">SR CRM</TableHead>
                    <TableHead className="w-[220px] font-semibold text-foreground py-3">BOQ Staff Assignment</TableHead>
                    <TableHead className="w-[170px] text-right font-semibold text-foreground py-3">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredLeads.map((lead) => {
                    const eligible = boqEligible(lead)
                    const currentBoqId = lead.boqAssignee?.id ?? ''
                    const selectedUserId = selectedBoq[lead.id] ?? currentBoqId
                    const hasPendingChange = selectedUserId !== currentBoqId && Boolean(selectedUserId)
                    const saving = savingBoqId === lead.id

                    return (
                      <TableRow key={lead.id} className="hover:bg-muted/20 transition-colors">
                        {/* 1. Client & Contact */}
                        <TableCell className="align-top py-3.5">
                          <button
                            onClick={() => setEditingLeadId(lead.id)}
                            className="font-semibold text-foreground text-sm leading-tight hover:text-primary transition-colors text-left"
                          >
                            {lead.name}
                          </button>
                          {lead.location ? (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" title={lead.location}>
                              <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/60" />
                              <span className="truncate max-w-[200px]">{lead.location}</span>
                            </div>
                          ) : null}
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                            {lead.phone ? (
                              <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-foreground">
                                <Phone className="h-2.5 w-2.5 text-muted-foreground/60" />
                                <span>{lead.phone}</span>
                              </a>
                            ) : null}
                            {lead.phone && lead.email ? <span>•</span> : null}
                            {lead.email ? <span className="truncate max-w-[130px]" title={lead.email}>{lead.email}</span> : null}
                          </div>
                        </TableCell>

                        {/* 2. Status */}
                        <TableCell className="align-top py-3.5">
                          <Badge variant="outline" className="font-medium bg-background border-border text-xs">
                            {formatAgreementType(lead.agreementType)}
                          </Badge>
                          <div className="mt-1 text-[11px] text-muted-foreground capitalize">
                            {(lead.subStatus || lead.stage).replace(/_/g, ' ').toLowerCase()}
                          </div>
                        </TableCell>

                        {/* 3. Quotation */}
                        <TableCell className="text-right align-top py-3.5 font-medium tabular-nums text-foreground">
                          {formatMoney(lead.originalQuotationTotal)}
                        </TableCell>

                        {/* 4. Discount */}
                        <TableCell className="text-right align-top py-3.5 font-medium tabular-nums text-amber-700 dark:text-amber-400">
                          {lead.discountApplied > 0 ? `- ${formatMoney(lead.discountApplied)}` : '—'}
                        </TableCell>

                        {/* 5. Settled */}
                        <TableCell className="text-right align-top py-3.5 font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatMoney(lead.settledAgreementValue)}
                        </TableCell>

                        {/* 6. SR CRM */}
                        <TableCell className="align-top py-3.5">
                          {lead.srCrm?.fullName ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <UserRound className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="truncate max-w-[110px]" title={lead.srCrm.fullName}>{lead.srCrm.fullName}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">Unassigned</span>
                          )}
                        </TableCell>

                        {/* 7. BOQ Assignment */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Select
                                value={selectedUserId}
                                onValueChange={(v) => {
                                  setSelectedBoq((cur) => ({ ...cur, [lead.id]: v }))
                                  setAssignError((prev) => ({ ...prev, [lead.id]: '' }))
                                }}
                                disabled={!eligible || staffLoading || saving}
                              >
                                <SelectTrigger className="h-8 text-xs flex-1 bg-background">
                                  <SelectValue placeholder="Select BOQ staff" />
                                </SelectTrigger>
                                <SelectContent>
                                  {staff.map((user) => (
                                    <SelectItem key={user.id} value={user.id} className="text-xs">{user.fullName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {hasPendingChange ? (
                                <Button size="sm" className="h-8 px-2.5 text-xs shrink-0" disabled={saving} onClick={() => void assignBoq(lead)} title="Confirm BOQ Assignment">
                                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  <span className="ml-1 hidden sm:inline">Save</span>
                                </Button>
                              ) : null}
                            </div>
                            {lead.boqAssignee ? (
                              <div className="flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[190px]">Current: {lead.boqAssignee.fullName}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                                <AlertCircle className="h-3 w-3 shrink-0" />
                                <span>Pending BOQ Assignment</span>
                              </div>
                            )}
                            {assignError[lead.id] ? (
                              <div className="text-[11px] text-red-600 dark:text-red-400">{assignError[lead.id]}</div>
                            ) : null}
                          </div>
                        </TableCell>

                        {/* 8. Actions */}
                        <TableCell className="text-right align-top py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2.5 text-xs font-medium"
                              onClick={() => setEditingLeadId(lead.id)}
                            >
                              <FileEdit className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                              Edit
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8 px-2.5 text-xs font-medium bg-[#1f363d] text-white hover:bg-[#16272c]"
                                  disabled={downloadingAgreementId === lead.id || downloadingId === lead.id}
                                >
                                  {downloadingAgreementId === lead.id || downloadingId === lead.id ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  PDF
                                  <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem onClick={() => void downloadAgreement(lead)}>
                                  <FileText className="mr-2 h-4 w-4 text-[#a57c00]" />
                                  <span>Download Agreement PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void downloadDetailQuotation(lead)} disabled={!lead.detailQuotationAvailable}>
                                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                  <span>Download Detail Quotation</span>
                                  {!lead.detailQuotationAvailable && <span className="ml-auto text-[10px] text-muted-foreground">N/A</span>}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}
      </main>

      {/* ─── EDIT MODAL ───────────────────────────────────────────── */}
      {editingLeadId && editingLead && (
        <AgreementEditModal
          leadId={editingLeadId}
          clientName={editingLead.name}
          onClose={() => setEditingLeadId(null)}
          onSaved={() => { /* keep modal open, just mark saved */ }}
        />
      )}
    </div>
  )
}

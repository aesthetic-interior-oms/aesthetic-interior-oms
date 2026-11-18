'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Compass,
  Download,
  ExternalLink,
  FileCheck2,
  FileEdit,
  FileSpreadsheet,
  FileText,
  GitBranch,
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
import { MepCoverDocument } from '@/components/crm/quotation/pdf/MepCoverDocument'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Staff = { id: string; fullName: string; email: string }

type QuotationSubmissionFile = { id: string; fileName: string; url: string; fileType: string | null }
type QuotationSubmission = {
  id: string
  versionNumber: number
  versionName: string
  note: string | null
  createdAt: string
  submittedBy: { id: string; fullName: string } | null
  files: QuotationSubmissionFile[]
}

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
  pcAssignee?: Staff | null
  siteEngineerAssignee?: Staff | null
  quotationAssignee?: Staff | null
  quotationVersionsCount?: number
  quotationSubmissions?: QuotationSubmission[]
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
  if (!value) return 'Design Agreement'
  if (value === 'DESIGN_AGREEMENT') return 'Design Agreement'
  if (value === 'FITOUT_AGREEMENT') return 'Fitout Agreement'
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
  agreementType,
  onClose,
  onSaved,
  onAgreementTypeChange,
}: {
  leadId: string
  clientName: string
  agreementType?: string | null
  onClose: () => void
  onSaved: () => void
  onAgreementTypeChange?: (newType: string) => void
}) {
  const [data, setData] = useState<AgreementData | null>(null)
  const [currentAgreementType, setCurrentAgreementType] = useState<string>(agreementType || 'DESIGN_AGREEMENT')
  const [updatingType, setUpdatingType] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadingMep, setDownloadingMep] = useState(false)
  const [dirty, setDirty] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleModalTypeChange = async (newType: string) => {
    setCurrentAgreementType(newType)
    setUpdatingType(true)
    try {
      const res = await fetch(`/api/agreement-leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementType: newType }),
      })
      const payload = await res.json()
      if (!res.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to update agreement type')
      }
      toast.success(`Agreement type updated to ${formatAgreementType(newType)}`)
      if (onAgreementTypeChange) onAgreementTypeChange(newType)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update agreement type')
    } finally {
      setUpdatingType(false)
    }
  }

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

  const downloadMepCover = async () => {
    if (!data) return
    setDownloadingMep(true)
    try {
      const safeName = data.agreement.ownerName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Client'
      await downloadPdfFromDocument(
        <MepCoverDocument
          clientName={data.agreement.ownerName}
          clientPhone={data.client.phone}
          clientEmail={data.client.email}
          clientAddress={data.agreement.ownerAddress || data.agreement.projectAddress || data.client.location}
          projectName={data.agreement.projectName}
          projectAddress={data.agreement.projectAddress || data.client.location}
          workOrderId={data.agreement.workOrderId}
          subContractId={data.agreement.subContractId}
          reference={data.agreement.reference}
          agreementDate={data.agreement.agreementDate}
          quotationCode={data.quotation?.quotationCode}
          srCrmName={data.agreement.srCrmName}
          companyRepresentative={data.agreement.companyRepresentative}
          companyRepresentativeTitle={data.agreement.companyRepresentativeTitle}
        />,
        `MEP_Cover_${safeName}_A3.pdf`,
      )
      toast.success('MEP Cover (A3) PDF downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not generate MEP Cover')
    } finally { setDownloadingMep(false) }
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
            <div className="flex items-center gap-2.5">
              <p className="text-xs font-bold text-white/90 uppercase tracking-widest">Edit Agreement</p>
              <select
                value={currentAgreementType}
                onChange={(e) => void handleModalTypeChange(e.target.value)}
                disabled={updatingType}
                aria-label="Agreement Type"
                className="text-[11px] font-semibold rounded bg-[#16272c] text-white border border-white/20 px-2 py-0.5 outline-none cursor-pointer"
              >
                <option value="DESIGN_AGREEMENT">Design Agreement</option>
                <option value="FITOUT_AGREEMENT">Fitout Agreement</option>
              </select>
            </div>
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
                      {data.quotation.lineItems.filter((li) => li.included !== false).length} included lines
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
              onClick={() => void downloadMepCover()}
              disabled={downloadingMep || loading || !agr}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
              title="Download A3 Landscape MEP Drawing Signature Cover"
            >
              {downloadingMep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Compass className="h-3.5 w-3.5 text-blue-600" />}
              MEP Cover (A3)
            </button>
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
  const [quotationStaff, setQuotationStaff] = useState<Staff[]>([])
  const [selectedBoq, setSelectedBoq] = useState<Record<string, string>>({})
  const [selectedQuotation, setSelectedQuotation] = useState<Record<string, string>>({})
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [loading, setLoading] = useState(true)
  const [staffLoading, setStaffLoading] = useState(true)
  const [savingBoqId, setSavingBoqId] = useState<string | null>(null)
  const [savingQuotationId, setSavingQuotationId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadingAgreementId, setDownloadingAgreementId] = useState<string | null>(null)
  const [downloadingMepId, setDownloadingMepId] = useState<string | null>(null)
  const [assignError, setAssignError] = useState<Record<string, string>>({})
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null)
  const [canAssignBoq, setCanAssignBoq] = useState(false)
  const [updatingAgreementTypeLeadId, setUpdatingAgreementTypeLeadId] = useState<string | null>(null)
  const [viewingRevisionsLead, setViewingRevisionsLead] = useState<AgreementLead | null>(null)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [isHoveringTable, setIsHoveringTable] = useState(false)

  // Revision Request Dialog state
  const [revisionDialogLead, setRevisionDialogLead] = useState<AgreementLead | null>(null)
  const [revisionSelectedUserId, setRevisionSelectedUserId] = useState('')
  const [revisionNote, setRevisionNote] = useState('')
  const [savingRevision, setSavingRevision] = useState(false)

  const editingLead = useMemo(() => leads.find((l) => l.id === editingLeadId) ?? null, [leads, editingLeadId])

  const scrollTable = useCallback((direction: 'left' | 'right') => {
    if (!tableScrollRef.current) return
    const amount = direction === 'left' ? -350 : 350
    tableScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return
      }

      if (e.key === 'ArrowLeft') {
        if (isHoveringTable || document.activeElement === tableScrollRef.current) {
          e.preventDefault()
          scrollTable('left')
        }
      } else if (e.key === 'ArrowRight') {
        if (isHoveringTable || document.activeElement === tableScrollRef.current) {
          e.preventDefault()
          scrollTable('right')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isHoveringTable, scrollTable])

  // Determine whether the current user may assign BOQ staff
  // (Admin, SR CRM, and BOQ Team Leader can assign; BOQ Team Member cannot)
  useEffect(() => {
    let active = true
    fetch('/api/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok || !active) return
        const payload = (await res.json()) as {
          userRoles?: Array<{ role?: { name?: string | null } | null }>
          userDepartments?: Array<{ department?: { name?: string | null } | null }>
        }
        const roleNames = Array.isArray(payload?.userRoles)
          ? payload.userRoles.map((e) => e?.role?.name ?? '').filter(Boolean)
          : []
        const deptNames = Array.isArray(payload?.userDepartments)
          ? payload.userDepartments.map((e) => e?.department?.name ?? '').filter(Boolean)
          : []
        const isAdmin = deptNames.some((d) => d.toUpperCase() === 'ADMIN')
        const isSrCrm = deptNames.some((d) => d.toUpperCase() === 'SR_CRM')
        const isBoqLeader = roleNames.some((r) => r.trim().toUpperCase() === 'BOQ_TEAM_LEADER')
        const isPc =
          deptNames.some(
            (d) =>
              d.toUpperCase().includes('PROJECT_COORDINATOR') ||
              d.toUpperCase().includes('PROJECT_CORDINATOR'),
          ) || roleNames.some((r) => r.toUpperCase().includes('PROJECT_COORDINATOR'))
        if (active) setCanAssignBoq(isAdmin || isSrCrm || isBoqLeader || isPc)
      })
      .catch(() => { if (active) setCanAssignBoq(false) })
    return () => { active = false }
  }, [])

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
      setSelectedQuotation((current) => {
        const next = { ...current }
        nextLeads.forEach((lead) => { if (!(lead.id in next)) next[lead.id] = lead.quotationAssignee?.id ?? '' })
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
        const [boqRes, qRes] = await Promise.all([
          fetch('/api/department/available/BOQ', { cache: 'no-store' }),
          fetch('/api/department/available/QUOTATION_TEAM', { cache: 'no-store' }),
        ])
        const [boqPayload, qPayload] = await Promise.all([boqRes.json(), qRes.json()])
        if (boqPayload.success && Array.isArray(boqPayload.users)) setStaff(boqPayload.users)
        if (qPayload.success && Array.isArray(qPayload.users)) setQuotationStaff(qPayload.users)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load staff')
      } finally { setStaffLoading(false) }
    }
    void loadStaff()
  }, [])

  const openRevisionDialog = (lead: AgreementLead) => {
    setRevisionDialogLead(lead)
    setRevisionSelectedUserId(lead.quotationAssignee?.id ?? '')
    setRevisionNote('')
  }

  const submitRevisionRequest = async () => {
    if (!revisionDialogLead || !revisionSelectedUserId) return
    setSavingRevision(true)
    try {
      const response = await fetch(`/api/lead/${revisionDialogLead.id}/assignments/QUOTATION`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: revisionSelectedUserId, note: revisionNote.trim() || undefined }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to request revision')
      }
      toast.success(`Quotation revision requested — task sent to quotation team member`)
      setRevisionDialogLead(null)
      setRevisionSelectedUserId('')
      setRevisionNote('')
      await loadLeads()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to request revision')
    } finally {
      setSavingRevision(false)
    }
  }

  const handleAgreementTypeChange = async (leadId: string, newType: string) => {
    setUpdatingAgreementTypeLeadId(leadId)
    try {
      const response = await fetch(`/api/agreement-leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementType: newType }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to update agreement type')
      }
      setLeads((prev) =>
        prev.map((item) => (item.id === leadId ? { ...item, agreementType: newType } : item)),
      )
      toast.success(`Agreement type updated to ${formatAgreementType(newType)}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update agreement type')
    } finally {
      setUpdatingAgreementTypeLeadId(null)
    }
  }

  const assignQuotation = async (lead: AgreementLead) => {
    const userId = selectedQuotation[lead.id]
    if (!userId) return
    setSavingQuotationId(lead.id)
    try {
      const response = await fetch(`/api/lead/${lead.id}/assignments/QUOTATION`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const payload = await response.json()
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error ?? 'Failed to assign quotation member')
      }
      toast.success('Quotation member assigned for scope revision')
      await loadLeads()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign quotation member')
    } finally {
      setSavingQuotationId(null)
    }
  }

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

  const downloadMepCover = async (lead: AgreementLead) => {
    setDownloadingMepId(lead.id)
    try {
      const response = await fetch(`/api/agreement-leads/${lead.id}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? 'Failed to load agreement data')
      }
      const data = payload.data as {
        agreement: AgreementContent
        quotation: Parameters<typeof AgreementDocumentPdf>[0]['quotation']
        totals: Parameters<typeof AgreementDocumentPdf>[0]['totals']
        client: { id: string; name: string; phone: string | null; email: string | null; location: string | null }
      }
      const safeName = lead.name.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Client'
      await downloadPdfFromDocument(
        <MepCoverDocument
          clientName={data.agreement.ownerName || lead.name}
          clientPhone={data.client.phone || lead.phone}
          clientEmail={data.client.email || lead.email}
          clientAddress={data.agreement.ownerAddress || data.agreement.projectAddress || lead.location}
          projectName={data.agreement.projectName}
          projectAddress={data.agreement.projectAddress || lead.location}
          workOrderId={data.agreement.workOrderId}
          subContractId={data.agreement.subContractId}
          reference={data.agreement.reference}
          agreementDate={data.agreement.agreementDate}
          quotationCode={data.quotation?.quotationCode}
          srCrmName={data.agreement.srCrmName || lead.srCrm?.fullName}
          companyRepresentative={data.agreement.companyRepresentative}
          companyRepresentativeTitle={data.agreement.companyRepresentativeTitle}
        />,
        `MEP_Cover_${safeName}_A3.pdf`,
      )
      toast.success('MEP Cover (A3) PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download MEP Cover')
    } finally {
      setDownloadingMepId(null)
    }
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

      <main className="w-full px-3 sm:px-6 lg:px-8 py-6 space-y-5">
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
            {/* Table toolbar with keyboard scroll indicator & buttons */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-muted/30 border-b border-border/60 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-semibold text-foreground">Confirmed Agreements</span>
                <span>•</span>
                <span>{filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono text-[10px] shadow-2xs">←</kbd>
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-background font-mono text-[10px] shadow-2xs">→</kbd>
                  <span>scroll table</span>
                </span>
                <div className="flex items-center border border-border rounded-md bg-background overflow-hidden shadow-2xs">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-none hover:bg-muted"
                    onClick={() => scrollTable('left')}
                    title="Scroll left (Left Arrow key)"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <div className="w-[1px] h-4 bg-border" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-none hover:bg-muted"
                    onClick={() => scrollTable('right')}
                    title="Scroll right (Right Arrow key)"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div
              ref={tableScrollRef}
              tabIndex={0}
              onMouseEnter={() => setIsHoveringTable(true)}
              onMouseLeave={() => setIsHoveringTable(false)}
              className="overflow-x-auto focus:outline-none focus:ring-1 focus:ring-primary/20"
            >
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 border-b">
                    <TableHead className="w-[230px] font-semibold text-foreground py-3">Client / Project</TableHead>
                    <TableHead className="w-[180px] font-semibold text-foreground py-3">Status</TableHead>
                    <TableHead className="w-[140px] font-semibold text-foreground py-3">Payment Status</TableHead>
                    <TableHead className="w-[130px] text-right font-semibold text-foreground py-3">Quotation</TableHead>
                    <TableHead className="w-[110px] text-right font-semibold text-foreground py-3">Discount</TableHead>
                    <TableHead className="w-[140px] text-right font-semibold text-foreground py-3">Settled Value</TableHead>
                    <TableHead className="w-[130px] font-semibold text-foreground py-3">SR CRM</TableHead>
                    {canAssignBoq && (
                      <TableHead className="w-[220px] font-semibold text-foreground py-3">BOQ Staff Assignment</TableHead>
                    )}
                    <TableHead className="w-[200px] font-semibold text-foreground py-3">Quotation Revisions</TableHead>
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

                        {/* 2. Status / Agreement Type */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-1.5 min-w-[170px]">

                            {/* ── Agreement Type native select (reliable in table cells) ── */}
                            <div className="relative inline-flex items-center">
                              {updatingAgreementTypeLeadId === lead.id ? (
                                <span className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-semibold rounded-full border ${
                                  lead.agreementType === 'FITOUT_AGREEMENT'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700'
                                    : 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700'
                                }`}>
                                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                                  <span>{formatAgreementType(lead.agreementType)}</span>
                                </span>
                              ) : (
                                <select
                                  value={lead.agreementType || 'DESIGN_AGREEMENT'}
                                  onChange={(e) => void handleAgreementTypeChange(lead.id, e.target.value)}
                                  className={`h-7 pl-2 pr-6 text-xs font-semibold rounded-full border appearance-none cursor-pointer outline-none transition-colors ${
                                    lead.agreementType === 'FITOUT_AGREEMENT'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900'
                                      : 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900'
                                  }`}
                                >
                                  <option value="DESIGN_AGREEMENT">Design Agreement</option>
                                  <option value="FITOUT_AGREEMENT">Fitout Agreement</option>
                                </select>
                              )}
                            </div>

                            {/* ── Lead stage + PC badge ── */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[11px] text-muted-foreground capitalize">
                                {(lead.subStatus || lead.stage).replace(/_/g, ' ').toLowerCase()}
                              </span>
                              {lead.pcAssignee?.fullName ? (
                                <span className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-medium" title={`Project Coordinator: ${lead.pcAssignee.fullName}`}>
                                  PC: {lead.pcAssignee.fullName.split(' ')[0]}
                                </span>
                              ) : null}
                            </div>

                          </div>
                        </TableCell>

                        {/* 2b. Payment Status — dedicated column */}
                        <TableCell className="align-top py-3.5">
                          {lead.accountStatus === 'FULL_PAID' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                              Fully Paid
                            </div>
                          ) : lead.accountStatus === 'PARTIAL_PAID' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                              <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0 animate-pulse" />
                              Partially Paid
                            </div>
                          ) : lead.accountStatus === 'PROCESSING' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                              <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400 shrink-0 animate-pulse" />
                              Processing
                            </div>
                          ) : lead.accountStatus === 'PENDING' ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800">
                              <span className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 shrink-0 animate-pulse" />
                              Pending
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-300 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700">
                              <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500 shrink-0" />
                              Not Set
                            </div>
                          )}
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
                        {canAssignBoq && (
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
                        )}

                        {/* 7b. Quotation Revisions */}
                        <TableCell className="align-top py-3.5">
                          <div className="space-y-2 min-w-[170px]">
                            {/* Current assignee (if any) */}
                            {lead.quotationAssignee ? (
                              <div className="flex items-center gap-1 text-[11px] text-purple-700 dark:text-purple-400 font-medium">
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                                <span className="truncate max-w-[140px]">{lead.quotationAssignee.fullName}</span>
                              </div>
                            ) : null}

                            {/* View revisions modal button */}
                            {(lead.quotationSubmissions?.length ?? 0) > 0 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setViewingRevisionsLead(lead)}
                                className="h-7 px-2.5 text-xs font-semibold border-purple-300 text-purple-800 bg-purple-50/70 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:bg-purple-950/40 dark:hover:bg-purple-950/70"
                              >
                                <GitBranch className="h-3.5 w-3.5 mr-1.5 text-purple-600" />
                                <span>{lead.quotationSubmissions!.length} revision{lead.quotationSubmissions!.length !== 1 ? 's' : ''}</span>
                                <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
                              </Button>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">No revisions yet</p>
                            )}

                            {/* Request Revision button */}
                            <div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-[11px] font-medium text-purple-700 hover:text-purple-900 hover:bg-purple-100/60 dark:text-purple-400 dark:hover:bg-purple-950/40"
                                onClick={() => openRevisionDialog(lead)}
                                disabled={staffLoading}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Request Revision
                              </Button>
                            </div>
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
                                  disabled={downloadingAgreementId === lead.id || downloadingId === lead.id || downloadingMepId === lead.id}
                                >
                                  {downloadingAgreementId === lead.id || downloadingId === lead.id || downloadingMepId === lead.id ? (
                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Download className="mr-1.5 h-3.5 w-3.5" />
                                  )}
                                  PDF
                                  <ChevronDown className="ml-1 h-3 w-3 opacity-70" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-60">
                                <DropdownMenuItem asChild>
                                  <a href={`/quotation-team/leads/${lead.id}?tab=detail`} target="_blank" rel="noopener noreferrer" className="flex items-center cursor-pointer">
                                    <FileSpreadsheet className="mr-2 h-4 w-4 text-purple-600" />
                                    <span>Revise Quotation (Workspace)</span>
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void downloadMepCover(lead)}>
                                  <Compass className="mr-2 h-4 w-4 text-blue-600" />
                                  <span className="font-medium text-foreground">Download MEP Cover (A3)</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void downloadAgreement(lead)}>
                                  <FileText className="mr-2 h-4 w-4 text-[#a57c00]" />
                                  <span>Download Agreement PDF</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => void downloadDetailQuotation(lead)} disabled={!lead.detailQuotationAvailable}>
                                  <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
                                  <span>Download Detail Quotation</span>
                                  {!lead.detailQuotationAvailable && <span className="ml-auto text-[10px] text-muted-foreground">N/A</span>}
                                </DropdownMenuItem>
                                {lead.quotationSubmissions && lead.quotationSubmissions.length > 0 && (
                                  <>
                                    <div className="border-t my-1" />
                                    <DropdownMenuItem
                                      onClick={() => setViewingRevisionsLead(lead)}
                                      className="cursor-pointer text-purple-700 dark:text-purple-300 font-medium"
                                    >
                                      <GitBranch className="mr-2 h-4 w-4 text-purple-600" />
                                      <span>View Revisions Modal ({lead.quotationSubmissions.length})</span>
                                    </DropdownMenuItem>
                                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                      Revision Files
                                    </div>
                                    {lead.quotationSubmissions.flatMap((sub) =>
                                      sub.files.map((file) => (
                                        <DropdownMenuItem key={file.id} asChild>
                                          <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download
                                            className="flex items-center cursor-pointer text-xs text-purple-800 dark:text-purple-300"
                                          >
                                            <Download className="mr-2 h-3.5 w-3.5 text-purple-600 shrink-0" />
                                            <span className="truncate max-w-[190px]">{sub.versionName}: {file.fileName}</span>
                                          </a>
                                        </DropdownMenuItem>
                                      ))
                                    )}
                                  </>
                                )}
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
          agreementType={editingLead.agreementType}
          onClose={() => setEditingLeadId(null)}
          onSaved={() => { /* keep modal open, just mark saved */ }}
          onAgreementTypeChange={(newType) => {
            setLeads((prev) => prev.map((l) => (l.id === editingLeadId ? { ...l, agreementType: newType } : l)))
          }}
        />
      )}

      {/* ─── REVISION REQUEST DIALOG ─────────────────────────────── */}
      <Dialog open={Boolean(revisionDialogLead)} onOpenChange={(open) => { if (!open && !savingRevision) { setRevisionDialogLead(null); setRevisionSelectedUserId(''); setRevisionNote('') } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-600" />
              Request Quotation Revision
            </DialogTitle>
            <DialogDescription>
              Assign a quotation team member to revise the quotation for <strong>{revisionDialogLead?.name}</strong>. The project stage will not change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Assign to Quotation Member *</label>
              <Select value={revisionSelectedUserId} onValueChange={setRevisionSelectedUserId} disabled={staffLoading || savingRevision}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select quotation team member..." />
                </SelectTrigger>
                <SelectContent>
                  {quotationStaff.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {revisionDialogLead?.quotationAssignee && (
                <p className="text-[11px] text-purple-700 dark:text-purple-400">
                  Currently: {revisionDialogLead.quotationAssignee.fullName}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Revision Note (optional)</label>
              <Textarea
                rows={3}
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
                placeholder="e.g. Client wants to remove false ceiling, add extra bedroom..."
                disabled={savingRevision}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRevisionDialogLead(null); setRevisionSelectedUserId(''); setRevisionNote('') }} disabled={savingRevision}>
              Cancel
            </Button>
            <Button
              className="bg-purple-700 hover:bg-purple-800 text-white"
              onClick={() => void submitRevisionRequest()}
              disabled={!revisionSelectedUserId || savingRevision}
            >
              {savingRevision ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <GitBranch className="h-4 w-4 mr-1.5" />}
              Send Revision Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW REVISION FILES MODAL ─────────────────────────────── */}
      <Dialog
        open={Boolean(viewingRevisionsLead)}
        onOpenChange={(open) => {
          if (!open) setViewingRevisionsLead(null)
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-muted/20">
            <div className="flex items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-purple-600" />
                  Quotation Revision Files
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Revision history & documents for <strong>{viewingRevisionsLead?.name}</strong>
                </DialogDescription>
              </div>
              {viewingRevisionsLead && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-semibold text-purple-700 border-purple-300 hover:bg-purple-50 dark:text-purple-300 dark:border-purple-800 shrink-0"
                  onClick={() => {
                    const lead = viewingRevisionsLead
                    setViewingRevisionsLead(null)
                    openRevisionDialog(lead)
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Request Revision
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {(!viewingRevisionsLead?.quotationSubmissions || viewingRevisionsLead.quotationSubmissions.length === 0) ? (
              <div className="text-center py-12 space-y-3">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-foreground">No quotation revisions submitted yet</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  When a scope revision is requested and submitted by the quotation team, all version files and logs will appear here.
                </p>
                <Button
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => {
                    const lead = viewingRevisionsLead
                    setViewingRevisionsLead(null)
                    if (lead) openRevisionDialog(lead)
                  }}
                >
                  Request First Revision
                </Button>
              </div>
            ) : (
              viewingRevisionsLead.quotationSubmissions.map((sub, idx) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {sub.versionName}
                      </span>
                      {idx === 0 && (
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Latest Version
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(sub.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {sub.submittedBy && (
                    <p className="text-xs text-muted-foreground">
                      Submitted by <strong className="text-foreground">{sub.submittedBy.fullName}</strong>
                    </p>
                  )}

                  {sub.note && (
                    <div className="rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground border border-border/50">
                      <p className="font-semibold text-foreground text-[11px] mb-0.5">Revision Note:</p>
                      <p className="whitespace-pre-wrap">{sub.note}</p>
                    </div>
                  )}

                  {sub.files && sub.files.length > 0 ? (
                    <div className="space-y-1.5 pt-1 border-t border-border/50">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Revision Documents ({sub.files.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {sub.files.map((file) => (
                          <a
                            key={file.id}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-purple-200/70 bg-purple-50/40 hover:bg-purple-100/70 dark:border-purple-900/60 dark:bg-purple-950/20 dark:hover:bg-purple-950/50 transition group"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileSpreadsheet className="h-4 w-4 text-purple-600 shrink-0" />
                              <span
                                className="text-xs font-medium text-foreground truncate group-hover:text-purple-700 dark:group-hover:text-purple-300"
                                title={file.fileName}
                              >
                                {file.fileName}
                              </span>
                            </div>
                            <Download className="h-4 w-4 text-purple-600 shrink-0 group-hover:scale-110 transition" />
                          </a>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No files attached to this revision submission.</p>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="px-6 py-3 border-t border-border bg-muted/20">
            <Button variant="outline" onClick={() => setViewingRevisionsLead(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { CrmPageHeader } from '@/components/crm/shared/page-header'
import { AgreementDocumentPdf } from '@/components/crm/quotation/pdf/AgreementDocument'
import { downloadPdfFromDocument } from '@/components/crm/quotation/pdf/pdf-download'
import type { AgreementClauseGroup, AgreementContent } from '@/lib/agreement-template'
import type { QuotationDraftContent, QuotationTotals } from '@/lib/quotation-types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type AgreementData = {
  agreement: AgreementContent
  quotation: QuotationDraftContent | null
  totals: QuotationTotals | null
  client: { id: string; name: string; phone: string | null; email: string | null; location: string | null }
  updatedAt: string | null
}
type AgreementTextField = 'workOrderId' | 'subContractId' | 'reference' | 'agreementDate' | 'agreementValue' | 'projectName' | 'ownerName' | 'ownerAddress' | 'projectAddress' | 'srCrmName' | 'ceoName' | 'companyRepresentative' | 'companyRepresentativeTitle' | 'letterBody'

const fieldClass = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring'
const textareaClass = `${fieldClass} min-h-28 resize-y leading-6`

function TextField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="grid gap-1.5 text-sm font-medium text-foreground">{label}<input type={type} className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

function TextAreaField({ label, value, onChange, rows = 5 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return <label className="grid gap-1.5 text-sm font-medium text-foreground">{label}<textarea rows={rows} className={textareaClass} value={value} onChange={(event) => onChange(event.target.value)} /></label>
}

export function AgreementEditor({ leadId, basePath = '/crm/admin/agreement-leads' }: { leadId: string; basePath?: string }) {
  const [data, setData] = useState<AgreementData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/agreement-leads/${leadId}`, { cache: 'no-store' })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not load agreement')
        if (active) setData(payload.data as AgreementData)
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Could not load agreement'))
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [leadId])

  const update = (fn: (current: AgreementData) => AgreementData) => {
    setData((current) => current ? fn(current) : current)
    setDirty(true)
  }

  const save = async () => {
    if (!data) return
    setSaving(true)
    try {
      const response = await fetch(`/api/agreement-leads/${leadId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agreement: data.agreement }),
      })
      const payload = await response.json()
      if (!response.ok || !payload.success) throw new Error(payload.error || 'Could not save agreement')
      setDirty(false)
      toast.success('Agreement saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save agreement')
    } finally { setSaving(false) }
  }

  const download = async () => {
    if (!data) return
    setDownloading(true)
    try {
      const safeName = data.agreement.ownerName.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'Client'
      await downloadPdfFromDocument(
        <AgreementDocumentPdf agreement={data.agreement} quotation={data.quotation} totals={data.totals} clientName={data.agreement.ownerName} agreementValue={data.totals?.grandTotal ?? null} />,
        `Agreement_${safeName}_${data.agreement.agreementDate}.pdf`,
      )
      toast.success('Agreement PDF downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not generate agreement PDF')
    } finally { setDownloading(false) }
  }

  if (loading) return <main className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">Loading agreement editor…</main>
  if (!data) return <main className="mx-auto max-w-6xl p-8 text-sm text-muted-foreground">Agreement could not be loaded. Check your access and try again.</main>

  const agreement = data.agreement
  const setField = (field: AgreementTextField, value: string) => update((current) => ({ ...current, agreement: { ...current.agreement, [field]: value } }))
  const setClauseGroup = (index: number, group: AgreementClauseGroup) => update((current) => ({ ...current, agreement: { ...current.agreement, clauseGroups: current.agreement.clauseGroups.map((item, i) => i === index ? group : item) } }))

  return <div className="min-h-screen bg-background">
    <CrmPageHeader title="Agreement Paper" subtitle={`Edit, save, and download the agreement for ${data.client.name}.`} />
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild><Link href={basePath}><ArrowLeft className="mr-2 h-4 w-4" />Back to Agreement Leads</Link></Button>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <Button variant="outline" onClick={() => void download()} disabled={downloading}>{downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}Download PDF</Button>
          <Button onClick={() => void save()} disabled={saving || !dirty}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save agreement</Button>
        </div>
      </div>

      <Card><CardHeader><CardTitle>Client and work order</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">
        <TextField label="Client name" value={agreement.ownerName} onChange={(value) => setField('ownerName', value)} />
        <TextField label="Agreement date" type="date" value={agreement.agreementDate} onChange={(value) => setField('agreementDate', value)} />
        <TextField label="Agreement value (৳)" type="number" value={agreement.agreementValue} onChange={(value) => setField('agreementValue', value)} />
        <TextField label="Project name" value={agreement.projectName} onChange={(value) => setField('projectName', value)} />
        <TextField label="Work Order ID" value={agreement.workOrderId} onChange={(value) => setField('workOrderId', value)} />
        <TextField label="Subcontract ID" value={agreement.subContractId} onChange={(value) => setField('subContractId', value)} />
        <TextField label="Reference" value={agreement.reference} onChange={(value) => setField('reference', value)} />
        <TextField label="Owner address" value={agreement.ownerAddress} onChange={(value) => setField('ownerAddress', value)} />
        <TextField label="Project address" value={agreement.projectAddress} onChange={(value) => setField('projectAddress', value)} />
        <div className="grid content-start gap-1.5 text-sm"><span className="font-medium">Client contact</span><span className="rounded-md bg-muted/50 px-3 py-2 text-muted-foreground">{data.client.phone || 'No phone'}{data.client.email ? ` · ${data.client.email}` : ''}</span></div>
        <TextField label="Senior CRM" value={agreement.srCrmName} onChange={(value) => setField('srCrmName', value)} />
        <TextField label="CEO" value={agreement.ceoName} onChange={(value) => setField('ceoName', value)} />
        <TextField label="Company representative" value={agreement.companyRepresentative} onChange={(value) => setField('companyRepresentative', value)} />
        <TextField label="Representative title" value={agreement.companyRepresentativeTitle} onChange={(value) => setField('companyRepresentativeTitle', value)} />
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Agreement letter</CardTitle></CardHeader><CardContent className="space-y-4"><TextAreaField label="Formal work order introduction" rows={9} value={agreement.letterBody} onChange={(value) => setField('letterBody', value)} /><p className="text-xs text-muted-foreground">The exported document opens with the work order letter and party details.</p></CardContent></Card>

      <Card><CardHeader><CardTitle>Quotation and payment schedule</CardTitle></CardHeader><CardContent className="space-y-4">
        <div className="rounded-md bg-muted/50 p-3 text-sm">Detail quotation: {data.quotation ? `${data.quotation.lineItems.filter((item) => item.included !== false).length} included lines · ৳ ${Math.round(data.totals?.grandTotal || 0).toLocaleString('en-IN')}` : 'No saved detail quotation found'}</div>
        <div className="space-y-3">{agreement.paymentSchedule.map((item, index) => <div key={index} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_130px_170px]">
          <TextField label={`Stage ${index + 1}`} value={item.stage} onChange={(value) => update((current) => ({ ...current, agreement: { ...current.agreement, paymentSchedule: current.agreement.paymentSchedule.map((row, i) => i === index ? { ...row, stage: value } : row) } }))} />
          <TextField label="Percentage" value={item.percentage} onChange={(value) => update((current) => ({ ...current, agreement: { ...current.agreement, paymentSchedule: current.agreement.paymentSchedule.map((row, i) => i === index ? { ...row, percentage: value } : row) } }))} />
          <TextField label="Amount (৳)" value={item.amount} onChange={(value) => update((current) => ({ ...current, agreement: { ...current.agreement, paymentSchedule: current.agreement.paymentSchedule.map((row, i) => i === index ? { ...row, amount: value } : row) } }))} />
          <button className="text-left text-xs text-destructive md:col-span-3" onClick={() => update((current) => ({ ...current, agreement: { ...current.agreement, paymentSchedule: current.agreement.paymentSchedule.filter((_, i) => i !== index) } }))}>Remove stage</button>
        </div>)}
          <Button variant="outline" onClick={() => update((current) => ({ ...current, agreement: { ...current.agreement, paymentSchedule: [...current.agreement.paymentSchedule, { stage: '', percentage: '', amount: '' }] } }))}><Plus className="mr-2 h-4 w-4" />Add payment stage</Button>
        </div>
        <div className="grid gap-4 md:grid-cols-3">{agreement.annexures.map((item, index) => <TextAreaField key={index} label={`Annexure A${index + 1}`} rows={5} value={item} onChange={(value) => update((current) => ({ ...current, agreement: { ...current.agreement, annexures: current.agreement.annexures.map((entry, i) => i === index ? value : entry) } }))} />)}</div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Agreement clauses</CardTitle></CardHeader><CardContent className="space-y-5">
        {agreement.clauseGroups.map((group, groupIndex) => <section key={groupIndex} className="space-y-3 rounded-md border p-4">
          <div className="flex items-center gap-3"><input className={`${fieldClass} font-semibold`} aria-label="Clause section title" value={group.title} onChange={(event) => setClauseGroup(groupIndex, { ...group, title: event.target.value })} /><Button variant="ghost" size="icon" aria-label="Remove section" onClick={() => update((current) => ({ ...current, agreement: { ...current.agreement, clauseGroups: current.agreement.clauseGroups.filter((_, i) => i !== groupIndex) } }))}><Trash2 className="h-4 w-4" /></Button></div>
          {group.clauses.map((clause, clauseIndex) => <div key={clauseIndex} className="flex gap-2"><textarea className={`${textareaClass} min-h-20`} value={clause} onChange={(event) => setClauseGroup(groupIndex, { ...group, clauses: group.clauses.map((item, i) => i === clauseIndex ? event.target.value : item) })} /><Button variant="ghost" size="icon" className="shrink-0" aria-label="Remove clause" onClick={() => setClauseGroup(groupIndex, { ...group, clauses: group.clauses.filter((_, i) => i !== clauseIndex) })}><Trash2 className="h-4 w-4" /></Button></div>)}
          <Button variant="outline" size="sm" onClick={() => setClauseGroup(groupIndex, { ...group, clauses: [...group.clauses, ''] })}><Plus className="mr-2 h-4 w-4" />Add clause</Button>
        </section>)}
        <Button variant="outline" onClick={() => update((current) => ({ ...current, agreement: { ...current.agreement, clauseGroups: [...current.agreement.clauseGroups, { title: 'New section', clauses: [''] }] } }))}><Plus className="mr-2 h-4 w-4" />Add clause section</Button>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Signatures and witnesses</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-3">{agreement.witnessNames.map((name, index) => <TextField key={index} label={`Witness ${index + 1}`} value={name} onChange={(value) => update((current) => ({ ...current, agreement: { ...current.agreement, witnessNames: current.agreement.witnessNames.map((item, i) => i === index ? value : item) } }))} />)}
        <div className="md:col-span-3"><Button variant="outline" onClick={() => update((current) => ({ ...current, agreement: { ...current.agreement, witnessNames: [...current.agreement.witnessNames, ''] } }))}><Plus className="mr-2 h-4 w-4" />Add witness</Button></div>
      </CardContent></Card>
      <div className="flex justify-end gap-2 pb-8"><Button variant="outline" onClick={() => void download()} disabled={downloading}><Download className="mr-2 h-4 w-4" />Download PDF</Button><Button onClick={() => void save()} disabled={saving || !dirty}><Save className="mr-2 h-4 w-4" />Save agreement</Button></div>
    </main>
  </div>
}

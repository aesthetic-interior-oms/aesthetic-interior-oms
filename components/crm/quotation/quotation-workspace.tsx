'use client'

import { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuotationMaker } from '@/components/crm/quotation/quotation-maker'
import { ShortQuotationBuilder } from '@/components/crm/quotation/short-quotation-builder'

type QuotationWorkspaceProps = {
  leadId: string
  leadName: string
  leadLocation: string | null
  leadSubStatus: string | null
}

export function QuotationWorkspace({
  leadId,
  leadName,
  leadLocation,
  leadSubStatus,
}: QuotationWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'short' | 'detail'>('short')
  const [sqftSummary, setSqftSummary] = useState<{
    avgDetailSqft: number
    avgShortSqft: number
    detailVersionsCount: number
    shortPackagesCount: number
  } | null>(null)

  const loadDraftMeta = useCallback(async (options?: { updateActiveTab?: boolean }) => {
    try {
      const response = await fetch(`/api/lead/${leadId}/quotation-draft`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !payload?.success || !payload?.data) return
      if (payload.data.sqftSummary) {
        setSqftSummary(payload.data.sqftSummary)
      }
      if (options?.updateActiveTab === false) return
      const documentType = payload.data.documentType as 'short' | 'detail' | undefined
      if (payload.data.draft && documentType === 'detail') {
        setActiveTab('detail')
      } else {
        setActiveTab('short')
      }
    } catch {
      if (options?.updateActiveTab !== false) {
        setActiveTab('short')
      }
    }
  }, [leadId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDraftMeta()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadDraftMeta])

  return (
    <div className="space-y-4">
      {/* SQFT Overview Cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-100/60 p-4 shadow-sm dark:border-cyan-800/60 dark:from-cyan-950/40 dark:via-slate-950 dark:to-sky-950/20">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-900 dark:text-cyan-300">
                Short Quotation SQFT
              </p>
              <p className="mt-1 text-2xl font-black text-cyan-950 dark:text-cyan-100">
                {sqftSummary ? sqftSummary.avgShortSqft.toLocaleString() : 0}{' '}
                <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">sqft</span>
              </p>
              <p className="mt-0.5 text-[11px] text-cyan-700/80 dark:text-cyan-400/80">
                Average taken across {sqftSummary?.shortPackagesCount ?? 0} package tier(s)
              </p>
            </div>
            <div className="rounded-xl bg-cyan-100/80 p-2.5 text-cyan-700 ring-1 ring-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:ring-cyan-800">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-100/60 p-4 shadow-sm dark:border-purple-800/60 dark:from-purple-950/40 dark:via-slate-950 dark:to-indigo-950/20">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300">
                Detail Quotation SQFT
              </p>
              <p className="mt-1 text-2xl font-black text-purple-950 dark:text-purple-100">
                {sqftSummary ? sqftSummary.avgDetailSqft.toLocaleString() : 0}{' '}
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-400">sqft</span>
              </p>
              <p className="mt-0.5 text-[11px] text-purple-700/80 dark:text-purple-400/80">
                Average written across {sqftSummary?.detailVersionsCount ?? 0} version(s)
              </p>
            </div>
            <div className="rounded-xl bg-purple-100/80 p-2.5 text-purple-700 ring-1 ring-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:ring-purple-800">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as 'short' | 'detail')
        }}
      >
        <TabsList className="print:hidden">
          <TabsTrigger value="short">Short Quotation</TabsTrigger>
          <TabsTrigger value="detail">Detail Quotation</TabsTrigger>
        </TabsList>
        <TabsContent value="short" className="mt-4">
          {activeTab === 'short' ? (
            <ShortQuotationBuilder
              leadId={leadId}
              leadName={leadName}
              leadLocation={leadLocation}
              leadSubStatus={leadSubStatus}
              onDraftSaved={() => void loadDraftMeta({ updateActiveTab: false })}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          {activeTab === 'detail' ? (
            <QuotationMaker
              leadId={leadId}
              leadName={leadName}
              leadLocation={leadLocation}
              leadSubStatus={leadSubStatus}
              onDraftSaved={() => void loadDraftMeta({ updateActiveTab: false })}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}

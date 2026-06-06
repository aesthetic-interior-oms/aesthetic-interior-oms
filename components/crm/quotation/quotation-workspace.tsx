'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    const loadDocumentType = async () => {
      try {
        const response = await fetch(`/api/lead/${leadId}/quotation-draft`, { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload?.success || !payload?.data) return
        const documentType = payload.data.documentType as 'short' | 'detail' | undefined
        if (payload.data.draft && documentType === 'detail') {
          setActiveTab('detail')
        } else {
          setActiveTab('short')
        }
      } catch {
        setActiveTab('short')
      }
    }
    void loadDocumentType()
  }, [leadId])

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => {
        if (
          !window.confirm(
            'Switching quotation type uses the same saved draft slot for this lead. Save your current work first. Continue?',
          )
        ) {
          return
        }
        setActiveTab(value as 'short' | 'detail')
      }}
    >
      <TabsList className="print:hidden">
        <TabsTrigger value="short">Short Quotation</TabsTrigger>
        <TabsTrigger value="detail">Detail Quotation</TabsTrigger>
      </TabsList>
      <TabsContent value="short" className="mt-4">
        <ShortQuotationBuilder
          leadId={leadId}
          leadName={leadName}
          leadLocation={leadLocation}
          leadSubStatus={leadSubStatus}
        />
      </TabsContent>
      <TabsContent value="detail" className="mt-4">
        <QuotationMaker
          leadId={leadId}
          leadName={leadName}
          leadLocation={leadLocation}
          leadSubStatus={leadSubStatus}
        />
      </TabsContent>
    </Tabs>
  )
}

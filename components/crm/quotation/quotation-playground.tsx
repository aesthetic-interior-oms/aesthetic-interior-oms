'use client'

import { useState } from 'react'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QuotationMaker } from '@/components/crm/quotation/quotation-maker'
import { ShortQuotationBuilder } from '@/components/crm/quotation/short-quotation-builder'
import { clearPlaygroundDrafts } from '@/lib/quotation-playground-storage'

const PLAYGROUND_CLIENT_NAME = 'Sample Client'
const PLAYGROUND_CLIENT_ADDRESS = 'Sample address for testing'

export function QuotationPlayground() {
  const [activeTab, setActiveTab] = useState<'short' | 'detail'>('short')
  const [resetKey, setResetKey] = useState(0)

  const resetPlayground = () => {
    if (
      !window.confirm(
        'Clear all playground drafts saved in this browser? This does not affect real leads.',
      )
    ) {
      return
    }
    clearPlaygroundDrafts()
    setResetKey((value) => value + 1)
    toast.success('Playground reset')
  }

  return (
    <div className="space-y-4">
      <Card className="border-dashed border-primary/40 bg-primary/5">
        <CardContent className="flex flex-wrap items-start justify-between gap-4 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FlaskConical className="h-4 w-4 text-primary" />
              Quotation playground
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Test short and detail quotations here. Saves stay in your browser only — no lead
              records or database drafts are changed.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={resetPlayground}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset playground
          </Button>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'short' | 'detail')}>
        <TabsList>
          <TabsTrigger value="short">Short Quotation</TabsTrigger>
          <TabsTrigger value="detail">Detail Quotation</TabsTrigger>
        </TabsList>
        <TabsContent value="short" className="mt-4">
          <ShortQuotationBuilder
            key={`short-${resetKey}`}
            mode="playground"
            leadId="playground"
            leadName={PLAYGROUND_CLIENT_NAME}
            leadLocation={PLAYGROUND_CLIENT_ADDRESS}
            leadSubStatus={null}
          />
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          <QuotationMaker
            key={`detail-${resetKey}`}
            mode="playground"
            leadId="playground"
            leadName={PLAYGROUND_CLIENT_NAME}
            leadLocation={PLAYGROUND_CLIENT_ADDRESS}
            leadSubStatus={null}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
